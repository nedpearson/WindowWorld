import fs from 'fs';
import path from 'path';
import { prisma } from '../../shared/services/prisma';
import { NotFoundError } from '../../shared/middleware/errorHandler';
import { leadScoringQueue } from '../../jobs/index';
import { logger } from '../../shared/utils/logger';

export class DocumentsService {
  async list(options: {
    leadId?: string;
    propertyId?: string;
    openingId?: string;
    inspectionId?: string;
    type?: string;
  }) {
    const where: any = {
      ...(options.leadId && { leadId: options.leadId }),
      ...(options.propertyId && { propertyId: options.propertyId }),
      ...(options.openingId && { openingId: options.openingId }),
      ...(options.inspectionId && { inspectionId: options.inspectionId }),
      ...(options.type && { type: options.type }),
    };

    return prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } }, as any aiAnalyses: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  async getById(id: string) {
    const doc = await prisma.document.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } }, as any aiAnalyses: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!doc) throw new NotFoundError('Document');
    return doc;
  }

  async createFromUpload(data: {
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    localPath?: string;
    type: string; // PHOTO_EXTERIOR | PHOTO_INTERIOR | PHOTO_DAMAGE | MEASUREMENT_SKETCH | PROPOSAL_PDF | OTHER
    leadId?: string;
    propertyId?: string;
    openingId?: string;
    inspectionId?: string;
    uploadedById: string;
    triggerAiAnalysis?: boolean;
    notes?: string;
  }) {
    const doc = await prisma.document.create({
      data: {
        filename: data.filename,
        originalName: data.originalName,
        mimeType: data.mimeType,
        size: data.size,
        url: data.url,
        type: data.type as any,
        leadId: data.leadId,
        propertyId: data.propertyId,
        openingId: data.openingId,
        inspectionId: data.inspectionId,
        uploadedById: data.uploadedById,
        aiAnalysisStatus: data.triggerAiAnalysis ? 'PENDING' : 'NOT_APPLICABLE',
        notes: data.notes,
      } as any,
    });

    // Trigger AI analysis if this is a window photo
    if (data.triggerAiAnalysis && ['PHOTO_EXTERIOR', 'PHOTO_INTERIOR', 'PHOTO_DAMAGE'].includes(data.type)) {
      try {
        await leadScoringQueue.add('analyze-window-photo', {
          documentId: doc.id,
          openingId: data.openingId,
          propertyId: data.propertyId,
          leadId: data.leadId,
          imageUrl: data.url,
        }, { delay: 500 });

        logger.info(`AI analysis queued for document ${doc.id}`);
      } catch (err) {
        logger.warn(`Failed to queue AI analysis for doc ${doc.id}: ${err}`);
        // Non-fatal — doc is saved, analysis can be triggered manually
      }
    }

    return doc;
  }

  async delete(id: string, userId: string) {
    const doc = await this.getById(id);
    // Optionally remove local file if stored on disk
    if ((doc as any).localPath) {
      try {
        fs.unlinkSync((doc as any).localPath);
      } catch {
        // non-fatal
      }
    }
    await prisma.document.delete({ where: { id } });
  }

  async retriggerAiAnalysis(id: string) {
    const doc = await this.getById(id);
    await prisma.document.update({
      where: { id },
      data: { aiAnalysisStatus: 'PENDING' } as any,
    });
    await scoringQueue.add('analyze-window-photo', {
      documentId: doc.id,
      openingId: (doc as any).openingId,
      propertyId: (doc as any).propertyId,
      leadId: (doc as any).leadId,
      imageUrl: doc.url,
    });
    return { queued: true, documentId: id };
  }
}

export const documentsService = new DocumentsService();
