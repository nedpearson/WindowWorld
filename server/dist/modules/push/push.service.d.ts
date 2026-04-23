export declare class PushService {
    getPublicKey(): string;
    subscribe(userId: string, subscription: {
        endpoint: string;
        keys: {
            p256dh: string;
            auth: string;
        };
        userAgent?: string;
    }): Promise<any>;
    unsubscribe(endpoint: string, userId: string): Promise<any>;
    sendToUser(userId: string, notification: {
        title: string;
        body?: string;
        icon?: string;
        badge?: string;
        url?: string;
        tag?: string;
        data?: Record<string, unknown>;
    }): Promise<{
        sent: number;
        total: number;
    } | undefined>;
    sendToUsers(userIds: string[], notification: Parameters<PushService['sendToUser']>[1]): Promise<({
        sent: number;
        total: number;
    } | undefined)[]>;
}
export declare const pushService: PushService;
//# sourceMappingURL=push.service.d.ts.map