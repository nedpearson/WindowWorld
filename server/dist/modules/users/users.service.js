"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersService = exports.UsersService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../../shared/services/prisma");
const errorHandler_1 = require("../../shared/middleware/errorHandler");
const audit_service_1 = require("../admin/audit.service");
class UsersService {
    async list(organizationId, options) {
        const { role, search, isActive } = options;
        return prisma_1.prisma.user.findMany({
            where: {
                organizationId,
                ...(role === 'SALES_REP' ? { role: { in: ['SALES_REP', 'SUPER_ADMIN'] } } : (role ? { role } : {})),
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
    async getById(id) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id },
            select: {
                id: true, email: true, firstName: true, lastName: true,
                role: true, phone: true, avatarUrl: true, isActive: true,
                lastLoginAt: true, createdAt: true, organizationId: true,
                territories: { include: { territory: true } },
                _count: { select: { assignedLeads: true } },
            },
        });
        if (!user)
            throw new errorHandler_1.NotFoundError('User');
        return user;
    }
    async create(data, createdById) {
        const exists = await prisma_1.prisma.user.findUnique({ where: { email: data.email } });
        if (exists)
            throw new errorHandler_1.AppError('Email already in use', 409, 'EMAIL_EXISTS');
        const passwordHash = await bcryptjs_1.default.hash(data.password, 12);
        const { password, ...rest } = data;
        const user = await prisma_1.prisma.user.create({
            data: { ...rest, passwordHash },
            select: {
                id: true, email: true, firstName: true, lastName: true, role: true, phone: true, isActive: true,
            },
        });
        await audit_service_1.auditService.log({ userId: createdById, entityType: 'user', entityId: user.id, action: 'create', newValues: user });
        return user;
    }
    async update(id, data, updatedById) {
        const { password, ...updateData } = data;
        if (password) {
            updateData.passwordHash = await bcryptjs_1.default.hash(password, 12);
        }
        const updated = await prisma_1.prisma.user.update({
            where: { id },
            data: updateData,
            select: { id: true, email: true, firstName: true, lastName: true, role: true, phone: true, isActive: true },
        });
        await audit_service_1.auditService.log({ userId: updatedById, entityType: 'user', entityId: id, action: 'update', newValues: updated });
        return updated;
    }
    async deactivate(id, adminId) {
        const updated = await prisma_1.prisma.user.update({ where: { id }, data: { isActive: false } });
        await audit_service_1.auditService.log({ userId: adminId, entityType: 'user', entityId: id, action: 'deactivate' });
        return updated;
    }
    async getLeaderboard(organizationId, period = 'month') {
        const now = new Date();
        let startDate = new Date();
        if (period === 'week')
            startDate.setDate(now.getDate() - 7);
        else if (period === 'month')
            startDate.setMonth(now.getMonth() - 1);
        else
            startDate.setMonth(now.getMonth() - 3);
        const reps = await prisma_1.prisma.user.findMany({
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
exports.UsersService = UsersService;
exports.usersService = new UsersService();
//# sourceMappingURL=users.service.js.map