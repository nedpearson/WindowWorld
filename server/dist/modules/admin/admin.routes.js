"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../shared/middleware/auth");
const users_service_1 = require("../users/users.service");
const prisma_1 = require("../../shared/services/prisma");
const router = (0, express_1.Router)();
exports.adminRouter = router;
// ─── Users ────────────────────────────────────────────────────
/** GET /api/v1/admin/users — list all users in the org */
router.get('/users', auth_1.auth.adminOnly, async (req, res) => {
    const user = req.user;
    const { role, search, isActive } = req.query;
    const data = await users_service_1.usersService.list(user.organizationId, {
        role: role,
        search: search,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
    res.json({ success: true, data });
});
/** POST /api/v1/admin/users — create a new user */
router.post('/users', auth_1.auth.adminOnly, async (req, res) => {
    const actor = req.user;
    const data = await users_service_1.usersService.create({ ...req.body, organizationId: actor.organizationId }, actor.id);
    res.status(201).json({ success: true, data });
});
/** PATCH /api/v1/admin/users/:id — update user details / role */
router.patch('/users/:id', auth_1.auth.adminOnly, async (req, res) => {
    const actor = req.user;
    const data = await users_service_1.usersService.update(req.params.id, req.body, actor.id);
    res.json({ success: true, data });
});
/** POST /api/v1/admin/users/:id/deactivate */
router.post('/users/:id/deactivate', auth_1.auth.adminOnly, async (req, res) => {
    const actor = req.user;
    await users_service_1.usersService.deactivate(req.params.id, actor.id);
    res.json({ success: true, message: 'User deactivated' });
});
/** POST /api/v1/admin/users/:id/reactivate */
router.post('/users/:id/reactivate', auth_1.auth.adminOnly, async (req, res) => {
    const actor = req.user;
    const data = await users_service_1.usersService.update(req.params.id, { isActive: true }, actor.id);
    res.json({ success: true, data });
});
// ─── Audit Log ────────────────────────────────────────────────
/** GET /api/v1/admin/audit-log — paginated audit log */
router.get('/audit-log', auth_1.auth.adminOnly, async (req, res) => {
    const { entityType, entityId, userId, limit = '50', offset = '0' } = req.query;
    const where = {};
    if (entityType)
        where.entityType = entityType;
    if (entityId)
        where.entityId = entityId;
    if (userId)
        where.userId = userId;
    const [items, total] = await Promise.all([
        prisma_1.prisma.auditLog.findMany({
            where,
            orderBy: { occurredAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset),
            include: {
                user: { select: { id: true, firstName: true, lastName: true, role: true } },
            },
        }),
        prisma_1.prisma.auditLog.count({ where }),
    ]);
    res.json({ success: true, data: items, total, limit: parseInt(limit), offset: parseInt(offset) });
});
// ─── Leaderboard ──────────────────────────────────────────────
/** GET /api/v1/admin/leaderboard */
router.get('/leaderboard', auth_1.auth.repOrAbove, async (req, res) => {
    const actor = req.user;
    const { period } = req.query;
    const data = await users_service_1.usersService.getLeaderboard(actor.organizationId, period);
    res.json({ success: true, data });
});
// ─── Org Stats ────────────────────────────────────────────────
/** GET /api/v1/admin/stats — org-wide summary stats */
router.get('/stats', auth_1.auth.adminOnly, async (req, res) => {
    const actor = req.user;
    const orgId = actor.organizationId;
    const [totalLeads, activeLeads, totalProposals, sentProposals, totalInvoices, paidInvoices, activeUsers, totalRevenue] = await Promise.all([
        prisma_1.prisma.lead.count({ where: { organizationId: orgId } }),
        prisma_1.prisma.lead.count({ where: { organizationId: orgId, status: { notIn: ['LOST', 'INSTALLED', 'PAID'] } } }),
        prisma_1.prisma.proposal.count({ where: { lead: { organizationId: orgId } } }),
        prisma_1.prisma.proposal.count({ where: { lead: { organizationId: orgId }, status: { in: ['SENT', 'VIEWED', 'ACCEPTED'] } } }),
        prisma_1.prisma.invoice.count({ where: { lead: { organizationId: orgId } } }),
        prisma_1.prisma.invoice.count({ where: { lead: { organizationId: orgId }, status: 'PAID' } }),
        prisma_1.prisma.user.count({ where: { organizationId: orgId, isActive: true } }),
        prisma_1.prisma.invoice.aggregate({
            where: { lead: { organizationId: orgId }, status: 'PAID' },
            _sum: { total: true },
        }),
    ]);
    res.json({
        success: true,
        data: {
            totalLeads, activeLeads,
            totalProposals, sentProposals,
            totalInvoices, paidInvoices,
            activeUsers,
            totalRevenue: (totalRevenue._sum?.total) || 0,
        },
    });
});
//# sourceMappingURL=admin.routes.js.map