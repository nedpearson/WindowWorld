"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.automationService = exports.AutomationService = void 0;
const prisma_1 = require("../../shared/services/prisma");
const errorHandler_1 = require("../../shared/middleware/errorHandler");
class AutomationService {
    async list(organizationId) {
        return prisma_1.prisma.automation.findMany({
            where: { organizationId },
            include: {
                runs: {
                    orderBy: { triggeredAt: 'desc' },
                    take: 1,
                    select: { status: true, triggeredAt: true, completedAt: true, errorMessage: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getById(id, organizationId) {
        const automation = await prisma_1.prisma.automation.findFirst({
            where: { id, organizationId },
            include: {
                runs: {
                    orderBy: { triggeredAt: 'desc' },
                    take: 10,
                },
            },
        });
        if (!automation)
            throw new errorHandler_1.NotFoundError('Automation');
        return automation;
    }
    async create(organizationId, data) {
        return prisma_1.prisma.automation.create({
            data: {
                organizationId,
                name: data.name,
                description: data.description,
                trigger: data.trigger,
                conditions: data.conditions,
                actions: data.actions,
                delayMinutes: data.delayMinutes,
                isActive: true,
            },
        });
    }
    async update(id, organizationId, data) {
        const existing = await prisma_1.prisma.automation.findFirst({ where: { id, organizationId } });
        if (!existing)
            throw new errorHandler_1.NotFoundError('Automation');
        return prisma_1.prisma.automation.update({ where: { id }, data });
    }
    async toggle(id, organizationId) {
        const existing = await prisma_1.prisma.automation.findFirst({ where: { id, organizationId } });
        if (!existing)
            throw new errorHandler_1.NotFoundError('Automation');
        return prisma_1.prisma.automation.update({
            where: { id },
            data: { isActive: !existing.isActive },
        });
    }
    async getRuns(automationId, organizationId, limit = 20) {
        const automation = await prisma_1.prisma.automation.findFirst({ where: { id: automationId, organizationId } });
        if (!automation)
            throw new errorHandler_1.NotFoundError('Automation');
        return prisma_1.prisma.automationRun.findMany({
            where: { automationId },
            orderBy: { triggeredAt: 'desc' },
            take: limit,
        });
    }
}
exports.AutomationService = AutomationService;
exports.automationService = new AutomationService();
//# sourceMappingURL=automations.service.js.map