import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../../shared/services/prisma';
import { NotFoundError, AppError } from '../../shared/middleware/errorHandler';
import { auditService } from '../admin/audit.service';

export class UsersService {
  async list(organizationId: string, options: { role?: UserRole; search?: string; isActive?: boolean }) {
    const { role, search, isActive } = options;
    return prisma.user.findMany({
      where: {
        organizationId,
        ...(role === 'SALES_REP' ? { role: { in: ['SALES_REP', 'SUPER_ADMIN'] as UserRole[] } } : (role ? { role } : {})),
        ...(isActive !== undefined && { isActive }),
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, phone: true, avatarUrl: true, isActive: true,
        lastLoginAt: true, createdAt: true,
        territories: {
          include: { territory: { select: { id: true, name: true } } },
        },
        _count: {
          select: { assignedLeads: true },
        },
      },
      orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
    });
  }

  async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, phone: true, avatarUrl: true, isActive: true,
        lastLoginAt: true, createdAt: true, organizationId: true,
        territories: { include: { territory: true } },
        _count: { select: { assignedLeads: true } },
      },
    });
    if (!user) throw new NotFoundError('User');
    return user;
  }

  async create(data: {
    organizationId: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    phone?: string;
  }, createdById: string) {
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw new AppError('Email already in use', 409, 'EMAIL_EXISTS');

    const passwordHash = await bcrypt.hash(data.password, 12);
    const { password, ...rest } = data;

    const user = await prisma.user.create({
      data: { ...rest, passwordHash },
      select: {
        id: true, email: true, firstName: true, lastName: true, role: true, phone: true, isActive: true,
      },
    });
    await auditService.log({ userId: createdById, entityType: 'user', entityId: user.id, action: 'create', newValues: user as any });
    return user;
  }

  async update(id: string, organizationId: string, data: any, updatedById: string) {
    const { password, ...updateData } = data;
    
    const existing = await prisma.user.findFirst({ where: { id, organizationId } });
    if (!existing) throw new Error('User not found');

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }
    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, phone: true, isActive: true },
    });
    await auditService.log({ userId: updatedById, entityType: 'user', entityId: id, action: 'update', newValues: updated as any });
    return updated;
  }

  async deactivate(id: string, organizationId: string, adminId: string) {
    const existing = await prisma.user.findFirst({ where: { id, organizationId } });
    if (!existing) throw new Error('User not found');

    const updated = await prisma.user.update({ where: { id }, data: { isActive: false } });
    await auditService.log({ userId: adminId, entityType: 'user', entityId: id, action: 'deactivate' });
    return updated;
  }

  async getLeaderboard(organizationId: string, period: 'week' | 'month' | 'quarter' = 'month') {
    const now = new Date();
    let startDate = new Date();
    if (period === 'week') startDate.setDate(now.getDate() - 7);
    else if (period === 'month') startDate.setMonth(now.getMonth() - 1);
    else startDate.setMonth(now.getMonth() - 3);

    const reps = await prisma.user.findMany({
      where: { organizationId, role: { in: ['SALES_REP', 'SALES_MANAGER', 'SUPER_ADMIN'] }, isActive: true },
      select: {
        id: true, firstName: true, lastName: true, avatarUrl: true, role: true,
        assignedLeads: {
          where: { status: { in: ['SOLD', 'PAID'] }, updatedAt: { gte: startDate } },
          select: { id: true, estimatedRevenue: true },
        },
        _count: {
          select: {
            assignedLeads: true,
          },
        },
      },
    });

    return reps.map((rep) => ({
      id: rep.id,
      name: `${rep.firstName} ${rep.lastName}`,
      avatarUrl: rep.avatarUrl,
      role: rep.role,
      closedDeals: rep.assignedLeads.length,
      revenue: rep.assignedLeads.reduce((sum, l) => sum + (l.estimatedRevenue || 0), 0),
      totalLeads: rep._count.assignedLeads,
    })).sort((a, b) => b.revenue - a.revenue);
  }
}

export const usersService = new UsersService();
