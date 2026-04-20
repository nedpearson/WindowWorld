"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = exports.AuditService = void 0;
const prisma_1 = require("../../shared/services/prisma");
const logger_1 = require("../../shared/utils/logger");
class AuditService {
    async log(params) {
        try {
            await prisma_1.prisma.auditLog.create({
                data: {
                    userId: params.userId,
                    entityType: params.entityType,
                    entityId: params.entityId,
                    action: params.action,
                    oldValues: params.oldValues || undefined,
                    newValues: params.newValues || undefined,
                    ipAddress: params.ipAddress,
                    userAgent: params.userAgent,
                },
            });
        }
        catch (error) {
            // Audit log should never crash the request
            logger_1.logger.error('Failed to write audit log:', error);
        }
    }
    async getHistory(entityType, entityId) {
        return prisma_1.prisma.auditLog.findMany({
            where: { entityType, entityId },
            orderBy: { occurredAt: 'desc' },
            include: {
                user: { select: { id: true, firstName: true, lastName: true } },
            },
        });
    }
}
exports.AuditService = AuditService;
exports.auditService = new AuditService();
//# sourceMappingURL=audit.service.js.map