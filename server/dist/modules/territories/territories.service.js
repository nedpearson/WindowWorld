"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.territoriesService = exports.TerritoriesService = void 0;
const prisma_1 = require("../../shared/services/prisma");
const errorHandler_1 = require("../../shared/middleware/errorHandler");
const audit_service_1 = require("../admin/audit.service");
class TerritoriesService {
    async list(organizationId) {
        return prisma_1.prisma.territory.findMany({
            where: { organizationId, isActive: true },
            include: {
                users: {
                    include: { user: { select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true } } },
                },
                _count: { select: { leads: true } },
            },
            orderBy: { name: 'asc' },
        });
    }
    async getById(id) {
        const territory = await prisma_1.prisma.territory.findUnique({
            where: { id },
            include: {
                users: {
                    include: { user: { select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true } } },
                },
                _count: { select: { leads: true } },
            },
        });
        if (!territory)
            throw new errorHandler_1.NotFoundError('Territory');
        return territory;
    }
    async create(data, userId) {
        const territory = await prisma_1.prisma.territory.create({ data });
        await audit_service_1.auditService.log({ userId, entityType: 'territory', entityId: territory.id, action: 'create', newValues: territory });
        return territory;
    }
    async update(id, data, userId) {
        const updated = await prisma_1.prisma.territory.update({ where: { id }, data });
        await audit_service_1.auditService.log({ userId, entityType: 'territory', entityId: id, action: 'update', newValues: updated });
        return updated;
    }
    async assignRep(territoryId, userId, isPrimary) {
        return prisma_1.prisma.territoryUser.upsert({
            where: { territoryId_userId: { territoryId, userId } },
            update: { isPrimary },
            create: { territoryId, userId, isPrimary },
        });
    }
    async removeRep(territoryId, userId) {
        return prisma_1.prisma.territoryUser.delete({
            where: { territoryId_userId: { territoryId, userId } },
        });
    }
    async getLeadHeatmap(id) {
        const territory = await this.getById(id);
        const leads = await prisma_1.prisma.lead.findMany({
            where: {
                territoryId: id,
                lat: { not: null },
                lng: { not: null },
                deletedAt: null,
            },
            select: {
                id: true, lat: true, lng: true, status: true,
                leadScore: true, urgencyScore: true, isStormLead: true,
                parish: true, zip: true,
            },
        });
        // Aggregate by parish
        const byParish = {};
        leads.forEach((lead) => {
            const p = lead.parish || 'Unknown';
            if (!byParish[p])
                byParish[p] = { count: 0, avgScore: 0, leads: [] };
            byParish[p].count++;
            byParish[p].avgScore += (lead.leadScore || 0);
            byParish[p].leads.push(lead);
        });
        Object.values(byParish).forEach((p) => {
            p.avgScore = p.count > 0 ? Math.round(p.avgScore / p.count) : 0;
        });
        return { territory, leads, byParish };
    }
}
exports.TerritoriesService = TerritoriesService;
exports.territoriesService = new TerritoriesService();
//# sourceMappingURL=territories.service.js.map