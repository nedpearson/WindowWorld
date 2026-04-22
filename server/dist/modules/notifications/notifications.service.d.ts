export declare class NotificationService {
    list(userId: string, limit?: number): Promise<{
        data: {
            link: string | null;
            id: string;
            createdAt: Date;
            userId: string;
            type: string;
            title: string;
            sentAt: Date | null;
            channel: string;
            body: string | null;
            isRead: boolean;
            readAt: Date | null;
            deliveredAt: Date | null;
        }[];
        unreadCount: number;
    }>;
    markRead(id: string, userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    markAllRead(userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    create(data: {
        userId: string;
        type: string;
        title: string;
        body?: string;
        link?: string;
        channel?: string;
    }): Promise<{
        link: string | null;
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        title: string;
        sentAt: Date | null;
        channel: string;
        body: string | null;
        isRead: boolean;
        readAt: Date | null;
        deliveredAt: Date | null;
    }>;
    deleteOld(userId: string, keepDays?: number): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
export declare const notificationService: NotificationService;
//# sourceMappingURL=notifications.service.d.ts.map