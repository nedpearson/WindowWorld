import fs from 'fs';
import path from 'path';
import { prisma } from '../../shared/services/prisma';
import { NotFoundError } from '../../shared/middleware/errorHandler';
import { leadScoringQueue } from '../../jobs/index';
import { logger } from '../../shared/utils/logger';
import { storageService } from '../../shared/services/storage.service';

export class DocumentsService {
  async list(options: {
    organizationId: string;
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
      OR: [
        { lead: { organizationId: options.organizationId } },
        { uploadedBy: { organizationId: options.organizationId } }
      ]
    };

    return prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
        aiAnalyses: { orderBy: { createdAt: 'desc' }, take: 1 },
      } as any,
    });
  }

  async getById(id: string, organizationId: string) {
    const doc = await prisma.document.findFirst({
      where: { 
        id,
        OR: [
          { lead: { organizationId } },
          { uploadedBy: { organizationId } }
        ]
      },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
        aiAnalyses: { orderBy: { createdAt: 'desc' } },
      } as any,
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
    type: string;
    leadId?: string;
    propertyId?: string;
    openingId?: string;
    inspectionId?: string;
    uploadedById: string;
    organizationId: string;
    triggerAiAnalysis?: boolean;
    notes?: string;
  }) {
    // Enforce tenant isolation for linked entities
    if (data.leadId) {
      const lead = await prisma.lead.findFirst({ where: { id: data.leadId, organizationId: data.organizationId } });
      if (!lead) throw new NotFoundError('Lead');
    }
    if (data.propertyId) {
      const prop = await prisma.property.findFirst({ where: { id: data.propertyId, leads: { some: { organizationId: data.organizationId } } } });
      if (!prop) throw new NotFoundError('Property');
    }
    if (data.openingId) {
      const opening = await prisma.opening.findFirst({ where: { id: data.openingId, property: { leads: { some: { organizationId: data.organizationId } } } } });
      if (!opening) throw new NotFoundError('Opening');
    }
    if (data.inspectionId) {
      const inspection = await prisma.inspection.findFirst({ where: { id: data.inspectionId, property: { leads: { some: { organizationId: data.organizationId } } } } });
      if (!inspection) throw new NotFoundError('Inspection');
    }

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

  async delete(id: string, organizationId: string) {
    const doc = await this.getById(id, organizationId);
    await storageService.delete(doc.url ?? '', (doc as any).localPath);
    await prisma.document.delete({ where: { id } });
  }

  async retriggerAiAnalysis(id: string, organizationId: string) {
    const doc = await this.getById(id, organizationId);
    await prisma.document.update({
      where: { id },
      data: { aiAnalysisStatus: 'PENDING' } as any,
    });
    await leadScoringQueue.add('analyze-window-photo', {
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
