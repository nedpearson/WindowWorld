import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';

export class WebSocketService {
  private io!: Server;
  
  // Mapping of userId to connection id(s) for real-time targeting
  private userSockets: Map<string, Set<string>> = new Map();

  initialize(httpServer: HttpServer, corsOrigins: string[]) {
    this.io = new Server(httpServer, {
      cors: {
        origin: corsOrigins,
        methods: ['GET', 'POST'],
      },
    });

    // Authenticate socket connections
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication error'));
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
        (socket as any).userId = decoded.id;
        (socket as any).organizationId = decoded.organizationId;
        next();
      } catch (err) {
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const userId = (socket as any).userId;
      const orgId = (socket as any).organizationId;
      
      logger.info(`[WebSocket] Client connected: ${userId} (${socket.id})`);
      
      // Join organization-wide room
      socket.join(`org_${orgId}`);
      
      // Track user specific connections
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)?.add(socket.id);

      socket.on('disconnect', () => {
        logger.info(`[WebSocket] Client disconnected: ${userId} (${socket.id})`);
        this.userSockets.get(userId)?.delete(socket.id);
        if (this.userSockets.get(userId)?.size === 0) {
          this.userSockets.delete(userId);
        }
      });
    });
    
    logger.info('[WebSocket] Server initialized');
  }

  // â”€â”€ Broadcast Methods â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  
  /**
   * Push a notification directly to a specific user
   */
  notifyUser(userId: string, eventName: string, data: any) {
    if (!this.io) return;
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      socketIds.forEach(id => {
        this.io.to(id).emit(eventName, data);
      });
    }
  }

  /**
   * Push an event to everyone in a specific organization.
   * Alias: broadcastToOrg()
   */
  notifyOrganization(organizationId: string, eventName: string, data: any) {
    if (!this.io) return;
    this.io.to(`org_${organizationId}`).emit(eventName, data);
  }

  /** Convenience alias — same as notifyOrganization */
  broadcastToOrg(organizationId: string, eventName: string, data: any) {
    this.notifyOrganization(organizationId, eventName, data);
  }
}

export const wsService = new WebSocketService();
