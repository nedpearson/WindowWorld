import { prisma } from '../../shared/services/prisma';
import { NotFoundError, AppError } from '../../shared/middleware/errorHandler';
import { auditService } from '../admin/audit.service';

export class InspectionsService {
  async list(options: {
    organizationId: string;
    leadId?: string;
    propertyId?: string;
    repId?: string;
    page: number;
    limit: number;
  }) {
    const { organizationId, leadId, propertyId, repId, page, limit } = options;
    const where: any = {
      lead: { organizationId },
      ...(leadId && { leadId }),
      ...(propertyId && { propertyId }),
      ...(repId && { inspectedById: repId }),
    };

    const [total, data] = await Promise.all([
      prisma.inspection.count({ where }),
      prisma.inspection.findMany({
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

  async getById(id: string) {
    const inspection = await prisma.inspection.findUnique({
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
    if (!inspection) throw new NotFoundError('Inspection');
    return inspection;
  }

  async create(data: {
    leadId: string;
    propertyId: string;
    appointmentId?: string;
    inspectedById: string;
    scheduledFor?: string;
    notes?: string;
    accessInstructions?: string;
    organizationId: string;
  }) {
    const inspection = await prisma.inspection.create({
      data: {
        leadId: data.leadId,
        propertyId: data.propertyId,
        appointmentId: data.appointmentId,
        inspectedById: data.inspectedById,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
        notes: data.notes,
        accessInstructions: data.accessInstructions,
        status: 'SCHEDULED',
      } as any,
    });

    await auditService.log({
      userId: data.inspectedById,
      entityType: 'inspection',
      entityId: inspection.id,
      action: 'create',
      newValues: inspection as any,
    });

    return inspection;
  }

  async startInspection(id: string, userId: string) {
    const updated = await prisma.inspection.update({
      where: { id },
      data: { status: 'IN_PROGRESS', startedAt: new Date() } as any,
    });

    // Advance lead status
    const inspection = await this.getById(id);
    await prisma.lead.update({
      where: { id: inspection.leadId },
      data: { status: 'INSPECTION_COMPLETE' },
    });

    await prisma.activity.create({
      data: {
        leadId: inspection.leadId,
        userId,
        type: 'MEETING',
        title: 'Inspection started',
        inspectionId: id,
      } as any,
    });

    return updated;
  }

  async completeInspection(id: string, userId: string, data: {
    notes?: string;
    overallCondition?: string;
    totalOpenings?: number;
    repNotes?: string;
  }) {
    const updated = await prisma.inspection.update({
      where: { id },
      data: {
        status: 'COMPLETE',
        completedAt: new Date(),
        notes: data.notes,
        overallCondition: data.overallCondition,
      } as any,
    });

    const inspection = await this.getById(id);
    await prisma.activity.create({
      data: {
        leadId: inspection.leadId,
        userId,
        type: 'MEETING',
        title: 'Inspection completed',
        description: data.notes,
        inspectionId: id,
      } as any,
    });

    return updated;
  }

  async addOpening(inspectionId: string, data: {
    roomLabel: string;
    windowType?: string;
    condition?: string;
    floorLevel?: string;
    sortOrder?: number;
    notes?: string;
    hasScreen?: boolean;
    hasGrilles?: boolean;
    isEgress?: boolean;
    obstructions?: string;
  }) {
    const inspection = await prisma.inspection.findUnique({
      where: { id: inspectionId },
      select: { propertyId: true },
    });
    if (!inspection) throw new NotFoundError('Inspection');

    return prisma.opening.create({
      data: {
        ...data,
        inspectionId,
        propertyId: inspection.propertyId,
        status: 'IDENTIFIED',
      } as any,
      include: { measurement: true },
    });
  }
}

export const inspectionsService = new InspectionsService();
