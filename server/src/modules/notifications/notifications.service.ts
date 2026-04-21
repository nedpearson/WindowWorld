import { prisma } from '../../shared/services/prisma';

export class NotificationService {
  async list(userId: string, limit = 50) {
    const [data, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);
    return { data, unreadCount };
  }

  async markRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async create(data: {
    userId: string;
    type: string;
    title: string;
    body?: string;
    link?: string;
    channel?: string;
  }) {
    return prisma.notification.create({
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

  async deleteOld(userId: string, keepDays = 30) {
    return prisma.notification.deleteMany({
      where: {
        userId,
        isRead: true,
        createdAt: { lt: new Date(Date.now() - keepDays * 86400000) },
      },
    });
  }
}

export const notificationService = new NotificationService();
