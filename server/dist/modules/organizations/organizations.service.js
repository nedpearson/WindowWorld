"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.organizationService = exports.OrganizationService = void 0;
const prisma_1 = require("../../shared/services/prisma");
const errorHandler_1 = require("../../shared/middleware/errorHandler");
class OrganizationService {
    async getById(id) {
        const org = await prisma_1.prisma.organization.findUnique({
            where: { id },
            include: {
                users: {
                    where: { isActive: true },
                    select: { id: true, firstName: true, lastName: true, role: true, email: true, avatarUrl: true, lastLoginAt: true },
                    orderBy: { lastName: 'asc' },
                },
                territories: { select: { id: true, name: true, parishes: true } },
            },
        });
        if (!org)
            throw new errorHandler_1.NotFoundError('Organization');
        return org;
    }
    async update(id, userId, data) {
        const org = await prisma_1.prisma.organization.findUnique({ where: { id } });
        if (!org)
            throw new errorHandler_1.NotFoundError('Organization');
        // Merge settings instead of replacing
        const mergedSettings = data.settings
            ? { ...(org.settings || {}), ...data.settings }
            : undefined;
        return prisma_1.prisma.organization.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.phone !== undefined && { phone: data.phone }),
                ...(data.email !== undefined && { email: data.email }),
                ...(data.address !== undefined && { address: data.address }),
                ...(data.city !== undefined && { city: data.city }),
                ...(data.state !== undefined && { state: data.state }),
                ...(data.zip !== undefined && { zip: data.zip }),
                ...(data.website !== undefined && { website: data.website }),
                ...(data.brandColor !== undefined && { brandColor: data.brandColor }),
                ...(mergedSettings !== undefined && { settings: mergedSettings }),
            },
        });
    }
    async getStats(id) {
        const [leadCount, activeUsers, proposalCount] = await Promise.all([
            prisma_1.prisma.lead.count({ where: { organizationId: id } }),
            prisma_1.prisma.user.count({ where: { organizationId: id, isActive: true } }),
            prisma_1.prisma.proposal.count({ where: { lead: { organizationId: id } } }),
        ]);
        return { leadCount, activeUsers, proposalCount };
    }
}
exports.OrganizationService = OrganizationService;
exports.organizationService = new OrganizationService();
//# sourceMappingURL=organizations.service.js.map