"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.measurementsService = exports.MeasurementsService = void 0;
const prisma_1 = require("../../shared/services/prisma");
const errorHandler_1 = require("../../shared/middleware/errorHandler");
const audit_service_1 = require("../admin/audit.service");
class MeasurementsService {
    async getByOpening(openingId) {
        return prisma_1.prisma.measurement.findUnique({
            where: { openingId },
            include: { history: { orderBy: { changedAt: 'desc' } } },
        });
    }
    async upsert(data) {
        const { openingId, measuredById, ...measureData } = data;
        // Verify opening exists
        const opening = await prisma_1.prisma.opening.findUnique({ where: { id: openingId } });
        if (!opening)
            throw new errorHandler_1.NotFoundError('Opening');
        // Get current measurement for history
        const existing = await prisma_1.prisma.measurement.findUnique({ where: { openingId } });
        // Validate: never allow AI-estimated to be saved as APPROVED_FOR_ORDER
        if (measureData.status === 'APPROVED_FOR_ORDER' && measureData.isAiEstimated) {
            throw new Error('Cannot approve AI-estimated measurements for order. Onsite verification required.');
        }
        const measurement = await prisma_1.prisma.measurement.upsert({
            where: { openingId },
            create: {
                openingId,
                measuredById,
                ...measureData,
                status: measureData.status || 'ESTIMATED',
            },
            update: {
                measuredById,
                ...measureData,
                updatedAt: new Date(),
            },
        });
        // Write history record if updating
        if (existing) {
            await prisma_1.prisma.measurementHistory.create({
                data: {
                    measurementId: measurement.id,
                    changedById: measuredById,
                    oldWidth: existing.finalWidth,
                    oldHeight: existing.finalHeight,
                    newWidth: measureData.finalWidth ?? existing.finalWidth,
                    newHeight: measureData.finalHeight ?? existing.finalHeight,
                    oldStatus: existing.status,
                    newStatus: measureData.status ?? existing.status,
                    changeReason: measureData.notes ?? 'Updated',
                },
            });
        }
        await audit_service_1.auditService.log({
            userId: measuredById,
            entityType: 'measurement',
            entityId: measurement.id,
            action: existing ? 'update' : 'create',
            oldValues: existing,
            newValues: measurement,
        });
        // Update opening status
        await prisma_1.prisma.opening.update({
            where: { id: openingId },
            data: { status: measureData.status === 'APPROVED_FOR_ORDER' ? 'ORDER_READY' : 'MEASURED' },
        });
        return measurement;
    }
    async verify(openingId, userId, finalWidth, finalHeight) {
        return this.upsert({
            openingId,
            finalWidth,
            finalHeight,
            status: 'VERIFIED_ONSITE',
            isAiEstimated: false,
            measuredById: userId,
            notes: 'Verified onsite by field technician',
        });
    }
    async approveForOrder(openingId, userId) {
        const existing = await prisma_1.prisma.measurement.findUnique({ where: { openingId } });
        if (!existing)
            throw new errorHandler_1.NotFoundError('Measurement');
        if (existing.status !== 'VERIFIED_ONSITE') {
            throw new Error(`Cannot approve for order: measurement status is "${existing.status}". Must be VERIFIED_ONSITE first.`);
        }
        if (existing.isAiEstimated) {
            throw new Error('Cannot approve AI-estimated measurements for order. Onsite verification required.');
        }
        return this.upsert({
            openingId,
            status: 'APPROVED_FOR_ORDER',
            measuredById: userId,
            notes: 'Approved for order',
        });
    }
    async getPropertySummary(propertyId) {
        const openings = await prisma_1.prisma.opening.findMany({
            where: { propertyId },
            include: { measurement: true },
        });
        const total = openings.length;
        const withMeasurements = openings.filter((o) => o.measurement).length;
        const aiEstimated = openings.filter((o) => o.measurement?.isAiEstimated).length;
        const verified = openings.filter((o) => o.measurement?.status === 'VERIFIED_ONSITE').length;
        const approvedForOrder = openings.filter((o) => o.measurement?.status === 'APPROVED_FOR_ORDER').length;
        return {
            total,
            withMeasurements,
            aiEstimated,
            verified,
            approvedForOrder,
            unmeasured: total - withMeasurements,
            isOrderReady: total > 0 && approvedForOrder === total,
            readinessPct: total > 0 ? Math.round((approvedForOrder / total) * 100) : 0,
            aiDisclaimerRequired: aiEstimated > 0,
        };
    }
}
exports.MeasurementsService = MeasurementsService;
exports.measurementsService = new MeasurementsService();
//# sourceMappingURL=measurements.service.js.map