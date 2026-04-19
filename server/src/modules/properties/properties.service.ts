import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/services/prisma';
import { NotFoundError } from '../../shared/middleware/errorHandler';
import { auditService } from '../admin/audit.service';

export class PropertiesService {
  async list(options: {
    organizationId?: string;
    leadId?: string;
    parish?: string;
    zip?: string;
    search?: string;
    page: number;
    limit: number;
  }) {
    const { organizationId, leadId, parish, zip, search, page, limit } = options;

    const where: Prisma.PropertyWhereInput = {
      ...(parish && { parish: { contains: parish, mode: 'insensitive' } }),
      ...(zip && { zip }),
      ...(leadId && { leads: { some: { id: leadId } } }),
      ...(search && {
        OR: [
          { address: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
          { zip: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, data] = await Promise.all([
      prisma.property.count({ where }),
      prisma.property.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { openings: true, inspections: true, contacts: true } },
          leads: { select: { id: true, firstName: true, lastName: true, status: true }, take: 1 },
        },
      }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string) {
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        contacts: { orderBy: { isPrimary: 'desc' } },
        openings: {
          orderBy: [{ floorLevel: 'asc' }, { sortOrder: 'asc' }],
          include: {
            measurement: true,
            aiAnalyses: { orderBy: { createdAt: 'desc' }, take: 1 },
            documents: { where: { type: 'PHOTO_EXTERIOR' }, take: 3 },
          },
        },
        inspections: {
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { openings: true } } },
        },
        leads: {
          select: { id: true, firstName: true, lastName: true, status: true, assignedRepId: true },
        },
        _count: { select: { openings: true, inspections: true, documents: true } },
      },
    });
    if (!property) throw new NotFoundError('Property');
    return property;
  }

  async create(data: any, userId: string) {
    const property = await prisma.property.create({
      data: {
        ...data,
        state: data.state || 'Louisiana',
      },
    });
    await auditService.log({ userId, entityType: 'property', entityId: property.id, action: 'create', newValues: property as any });
    return property;
  }

  async update(id: string, data: any, userId: string) {
    const existing = await this.getById(id);
    const updated = await prisma.property.update({ where: { id }, data });
    await auditService.log({ userId, entityType: 'property', entityId: id, action: 'update', oldValues: existing as any, newValues: updated as any });
    return updated;
  }

  async linkToLead(propertyId: string, leadId: string) {
    return prisma.property.update({
      where: { id: propertyId },
      data: { leads: { connect: { id: leadId } } },
    });
  }

  async getOrderReadiness(id: string) {
    const property = await this.getById(id);
    const openings = property.openings as any[];
    
    const total = openings.length;
    const withMeasurements = openings.filter((o) => o.measurement).length;
    const verified = openings.filter((o) => o.measurement?.status === 'VERIFIED_ONSITE' || o.measurement?.status === 'APPROVED_FOR_ORDER').length;
    const approvedForOrder = openings.filter((o) => o.measurement?.status === 'APPROVED_FOR_ORDER').length;
    const aiEstimatedOnly = openings.filter((o) => o.measurement?.isAiEstimated && o.measurement?.status === 'ESTIMATED').length;
    const unverified = openings.filter((o) => !o.measurement || o.measurement.status === 'ESTIMATED').length;

    return {
      propertyId: id,
      totalOpenings: total,
      withMeasurements,
      verified,
      approvedForOrder,
      aiEstimatedOnly,
      unverified,
      isOrderReady: approvedForOrder === total && total > 0,
      readinessPct: total > 0 ? Math.round((approvedForOrder / total) * 100) : 0,
      blockers: aiEstimatedOnly > 0
        ? [`${aiEstimatedOnly} opening(s) have AI-estimated measurements only â€” must be verified onsite before ordering`]
        : unverified > 0
        ? [`${unverified} opening(s) have no verified measurements`]
        : [],
    };
  }
}

export const propertiesService = new PropertiesService();
