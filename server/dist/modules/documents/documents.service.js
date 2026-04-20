"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentsService = exports.DocumentsService = void 0;
const prisma_1 = require("../../shared/services/prisma");
const errorHandler_1 = require("../../shared/middleware/errorHandler");
const index_1 = require("../../jobs/index");
const logger_1 = require("../../shared/utils/logger");
const storage_service_1 = require("../../shared/services/storage.service");
class DocumentsService {
    async list(options) {
        const where = {
            ...(options.leadId && { leadId: options.leadId }),
            ...(options.propertyId && { propertyId: options.propertyId }),
            ...(options.openingId && { openingId: options.openingId }),
            ...(options.inspectionId && { inspectionId: options.inspectionId }),
            ...(options.type && { type: options.type }),
        };
        return prisma_1.prisma.document.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                createdBy: { select: { id: true, firstName: true, lastName: true } },
                aiAnalyses: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
        });
    }
    async getById(id) {
        const doc = await prisma_1.prisma.document.findUnique({
            where: { id },
            include: {
                createdBy: { select: { id: true, firstName: true, lastName: true } },
                aiAnalyses: { orderBy: { createdAt: 'desc' } },
            },
        });
        if (!doc)
            throw new errorHandler_1.NotFoundError('Document');
        return doc;
    }
    async createFromUpload(data) {
        const doc = await prisma_1.prisma.document.create({
            data: {
                filename: data.filename,
                originalName: data.originalName,
                mimeType: data.mimeType,
                size: data.size,
                url: data.url,
                type: data.type,
                leadId: data.leadId,
                propertyId: data.propertyId,
                openingId: data.openingId,
                inspectionId: data.inspectionId,
                uploadedById: data.uploadedById,
                aiAnalysisStatus: data.triggerAiAnalysis ? 'PENDING' : 'NOT_APPLICABLE',
                notes: data.notes,
            },
        });
        // Trigger AI analysis if this is a window photo
        if (data.triggerAiAnalysis && ['PHOTO_EXTERIOR', 'PHOTO_INTERIOR', 'PHOTO_DAMAGE'].includes(data.type)) {
            try {
                await index_1.leadScoringQueue.add('analyze-window-photo', {
                    documentId: doc.id,
                    openingId: data.openingId,
                    propertyId: data.propertyId,
                    leadId: data.leadId,
                    imageUrl: data.url,
                }, { delay: 500 });
                logger_1.logger.info(`AI analysis queued for document ${doc.id}`);
            }
            catch (err) {
                logger_1.logger.warn(`Failed to queue AI analysis for doc ${doc.id}: ${err}`);
                // Non-fatal — doc is saved, analysis can be triggered manually
            }
        }
        return doc;
    }
    async delete(id, userId) {
        const doc = await this.getById(id);
        await storage_service_1.storageService.delete(doc.url ?? '', doc.localPath);
        await prisma_1.prisma.document.delete({ where: { id } });
    }
    async retriggerAiAnalysis(id) {
        const doc = await this.getById(id);
        await prisma_1.prisma.document.update({
            where: { id },
            data: { aiAnalysisStatus: 'PENDING' },
        });
        await index_1.leadScoringQueue.add('analyze-window-photo', {
            documentId: doc.id,
            openingId: doc.openingId,
            propertyId: doc.propertyId,
            leadId: doc.leadId,
            imageUrl: doc.url,
        });
        return { queued: true, documentId: id };
    }
}
exports.DocumentsService = DocumentsService;
exports.documentsService = new DocumentsService();
//# sourceMappingURL=documents.service.js.map