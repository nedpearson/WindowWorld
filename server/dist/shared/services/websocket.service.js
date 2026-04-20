"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsService = exports.WebSocketService = void 0;
const socket_io_1 = require("socket.io");
const logger_1 = require("../utils/logger");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class WebSocketService {
    io;
    // Mapping of userId to connection id(s) for real-time targeting
    userSockets = new Map();
    initialize(httpServer, corsOrigins) {
        this.io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: corsOrigins,
                methods: ['GET', 'POST'],
            },
        });
        // Authenticate socket connections
        this.io.use((socket, next) => {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
            if (!token)
                return next(new Error('Authentication error'));
            try {
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
                socket.userId = decoded.id;
                socket.organizationId = decoded.organizationId;
                next();
            }
            catch (err) {
                next(new Error('Authentication error'));
            }
        });
        this.io.on('connection', (socket) => {
            const userId = socket.userId;
            const orgId = socket.organizationId;
            logger_1.logger.info(`[WebSocket] Client connected: ${userId} (${socket.id})`);
            // Join organization-wide room
            socket.join(`org_${orgId}`);
            // Track user specific connections
            if (!this.userSockets.has(userId)) {
                this.userSockets.set(userId, new Set());
            }
            this.userSockets.get(userId)?.add(socket.id);
            socket.on('disconnect', () => {
                logger_1.logger.info(`[WebSocket] Client disconnected: ${userId} (${socket.id})`);
                this.userSockets.get(userId)?.delete(socket.id);
                if (this.userSockets.get(userId)?.size === 0) {
                    this.userSockets.delete(userId);
                }
            });
        });
        logger_1.logger.info('[WebSocket] Server initialized');
    }
    // â”€â”€ Broadcast Methods â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    /**
     * Push a notification directly to a specific user
     */
    notifyUser(userId, eventName, data) {
        if (!this.io)
            return;
        const socketIds = this.userSockets.get(userId);
        if (socketIds) {
            socketIds.forEach(id => {
                this.io.to(id).emit(eventName, data);
            });
        }
    }
    /**
     * Push an event to everyone in a specific organization
     */
    notifyOrganization(organizationId, eventName, data) {
        if (!this.io)
            return;
        this.io.to(`org_${organizationId}`).emit(eventName, data);
    }
}
exports.WebSocketService = WebSocketService;
exports.wsService = new WebSocketService();
//# sourceMappingURL=websocket.service.js.map