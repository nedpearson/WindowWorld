"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inspectionsService = exports.InspectionsService = void 0;
const prisma_1 = require("../../shared/services/prisma");
const errorHandler_1 = require("../../shared/middleware/errorHandler");
const audit_service_1 = require("../admin/audit.service");
class InspectionsService {
    async list(options) {
        const { organizationId, leadId, propertyId, repId, page, limit } = options;
        const where = {
            lead: { organizationId },
            ...(leadId && { leadId }),
            ...(propertyId && { propertyId }),
            ...(repId && { inspectedById: repId }),
        };
        const [total, data] = await Promise.all([
            prisma_1.prisma.inspection.count({ where }),
            prisma_1.prisma.inspection.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    createdBy: { select: { id: true, firstName: true, lastName: true } },
                    lead: { select: { id: true, firstName: true, lastName: true, address: true } },
                    property: { select: { id: true, address: true, city: true } },
                    _count: { select: { openings: true } },
                },
            }),
        ]);
        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }
    async getById(id) {
        const inspection = await prisma_1.prisma.inspection.findUnique({
            where: { id },
            include: {
                createdBy: { select: { id: true, firstName: true, lastName: true, phone: true } },
                lead: {
                    include: {
                        contacts: { orderBy: { isPrimary: 'desc' } },
                    },
                },
                property: true,
                openings: {
                    orderBy: [{ floorLevel: 'asc' }, { sortOrder: 'asc' }],
                    include: {
                        measurement: true,
                        aiAnalyses: { orderBy: { createdAt: 'desc' }, take: 1 },
                        documents: { where: { type: 'PHOTO_EXTERIOR' }, select: { id: true, url: true, filename: true, createdAt: true } },
                    },
                },
            },
        });
        if (!inspection)
            throw new errorHandler_1.NotFoundError('Inspection');
        return inspection;
    }
    async create(data) {
        const inspection = await prisma_1.prisma.inspection.create({
            data: {
                leadId: data.leadId,
                propertyId: data.propertyId,
                appointmentId: data.appointmentId,
                inspectedById: data.inspectedById,
                scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
                notes: data.notes,
                accessInstructions: data.accessInstructions,
                status: 'SCHEDULED',
            },
        });
        await audit_service_1.auditService.log({
            userId: data.inspectedById,
            entityType: 'inspection',
            entityId: inspection.id,
            action: 'create',
            newValues: inspection,
        });
        return inspection;
    }
    async startInspection(id, userId) {
        const updated = await prisma_1.prisma.inspection.update({
            where: { id },
            data: { status: 'IN_PROGRESS', startedAt: new Date() },
        });
        // Advance lead status
        const inspection = await this.getById(id);
        await prisma_1.prisma.lead.update({
            where: { id: inspection.leadId },
            data: { status: 'INSPECTION_COMPLETE' },
        });
        await prisma_1.prisma.activity.create({
            data: {
                leadId: inspection.leadId,
                userId,
                type: 'MEETING',
                title: 'Inspection started',
                inspectionId: id,
            },
        });
        return updated;
    }
    async completeInspection(id, userId, data) {
        const updated = await prisma_1.prisma.inspection.update({
            where: { id },
            data: {
                status: 'COMPLETE',
                completedAt: new Date(),
                notes: data.notes,
                overallCondition: data.overallCondition,
            },
        });
        const inspection = await this.getById(id);
        await prisma_1.prisma.activity.create({
            data: {
                leadId: inspection.leadId,
                userId,
                type: 'MEETING',
                title: 'Inspection completed',
                description: data.notes,
                inspectionId: id,
            },
        });
        return updated;
    }
    async addOpening(inspectionId, data) {
        const inspection = await prisma_1.prisma.inspection.findUnique({
            where: { id: inspectionId },
            select: { propertyId: true },
        });
        if (!inspection)
            throw new errorHandler_1.NotFoundError('Inspection');
        return prisma_1.prisma.opening.create({
            data: {
                ...data,
                inspectionId,
                propertyId: inspection.propertyId,
                status: 'IDENTIFIED',
            },
            include: { measurement: true },
        });
    }
}
exports.InspectionsService = InspectionsService;
exports.inspectionsService = new InspectionsService();
//# sourceMappingURL=inspections.service.js.map