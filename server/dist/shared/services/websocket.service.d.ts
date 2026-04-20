import { Server as HttpServer } from 'http';
export declare class WebSocketService {
    private io;
    private userSockets;
    initialize(httpServer: HttpServer, corsOrigins: string[]): void;
    /**
     * Push a notification directly to a specific user
     */
    notifyUser(userId: string, eventName: string, data: any): void;
    /**
     * Push an event to everyone in a specific organization
     */
    notifyOrganization(organizationId: string, eventName: string, data: any): void;
}
export declare const wsService: WebSocketService;
//# sourceMappingURL=websocket.service.d.ts.map