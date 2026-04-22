"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openingService = exports.OpeningService = void 0;
const prisma_1 = require("../../shared/services/prisma");
const errorHandler_1 = require("../../shared/middleware/errorHandler");
class OpeningService {
    async listByInspection(inspectionId) {
        return prisma_1.prisma.opening.findMany({
            where: { inspectionId },
            include: { measurement: true },
            orderBy: { sortOrder: 'asc' },
        });
    }
    async listByProperty(propertyId) {
        return prisma_1.prisma.opening.findMany({
            where: { propertyId },
            include: { measurement: true },
            orderBy: { sortOrder: 'asc' },
        });
    }
    async getById(id) {
        const opening = await prisma_1.prisma.opening.findUnique({
            where: { id },
            include: {
                measurement: true,
                documents: { orderBy: { createdAt: 'desc' }, take: 10 },
                aiAnalyses: { orderBy: { createdAt: 'desc' }, take: 1 },
                recommendedProduct: true,
            },
        });
        if (!opening)
            throw new errorHandler_1.NotFoundError('Opening');
        return opening;
    }
    async create(data) {
        // Auto-assign sortOrder if not provided
        let sortOrder = data.sortOrder;
        if (sortOrder === undefined && data.inspectionId) {
            const count = await prisma_1.prisma.opening.count({ where: { inspectionId: data.inspectionId } });
            sortOrder = count + 1;
        }
        return prisma_1.prisma.opening.create({
            data: {
                inspectionId: data.inspectionId,
                propertyId: data.propertyId,
                roomLabel: data.roomLabel,
                windowType: data.windowType,
                condition: data.condition,
                floorLevel: data.floor ? parseInt(data.floor, 10) || 1 : 1,
                egressRequired: data.isEgress ?? false,
                notes: data.notes,
                sortOrder: sortOrder ?? 1,
            },
            include: { measurement: true },
        });
    }
    async update(id, data) {
        const existing = await prisma_1.prisma.opening.findUnique({ where: { id } });
        if (!existing)
            throw new errorHandler_1.NotFoundError('Opening');
        return prisma_1.prisma.opening.update({
            where: { id },
            data: data,
            include: { measurement: true },
        });
    }
    async delete(id) {
        const existing = await prisma_1.prisma.opening.findUnique({ where: { id } });
        if (!existing)
            throw new errorHandler_1.NotFoundError('Opening');
        // Cascade: delete measurement too
        await prisma_1.prisma.measurement.deleteMany({ where: { openingId: id } });
        return prisma_1.prisma.opening.delete({ where: { id } });
    }
    async reorder(inspectionId, orderedIds) {
        await Promise.all(orderedIds.map((id, idx) => prisma_1.prisma.opening.update({ where: { id }, data: { sortOrder: idx + 1 } })));
        return this.listByInspection(inspectionId);
    }
}
exports.OpeningService = OpeningService;
exports.openingService = new OpeningService();
//# sourceMappingURL=openings.service.js.map