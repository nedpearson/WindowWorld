"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = exports.NotificationService = void 0;
const prisma_1 = require("../../shared/services/prisma");
class NotificationService {
    async list(userId, limit = 50) {
        const [data, unreadCount] = await Promise.all([
            prisma_1.prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
            }),
            prisma_1.prisma.notification.count({
                where: { userId, isRead: false },
            }),
        ]);
        return { data, unreadCount };
    }
    async markRead(id, userId) {
        return prisma_1.prisma.notification.updateMany({
            where: { id, userId },
            data: { isRead: true, readAt: new Date() },
        });
    }
    async markAllRead(userId) {
        return prisma_1.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });
    }
    async create(data) {
        return prisma_1.prisma.notification.create({
            data: {
                userId: data.userId,
                type: data.type,
                title: data.title,
                body: data.body,
                link: data.link,
                channel: data.channel || 'in-app',
                sentAt: new Date(),
            },
        });
    }
    async deleteOld(userId, keepDays = 30) {
        return prisma_1.prisma.notification.deleteMany({
            where: {
                userId,
                isRead: true,
                createdAt: { lt: new Date(Date.now() - keepDays * 86400000) },
            },
        });
    }
}
exports.NotificationService = NotificationService;
exports.notificationService = new NotificationService();
//# sourceMappingURL=notifications.service.js.map