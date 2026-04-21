import { prisma } from '../../shared/services/prisma';
import { NotFoundError } from '../../shared/middleware/errorHandler';

export class OpeningService {
  async listByInspection(inspectionId: string) {
    return prisma.opening.findMany({
      where: { inspectionId },
      include: { measurement: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async listByProperty(propertyId: string) {
    return prisma.opening.findMany({
      where: { propertyId },
      include: { measurement: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getById(id: string) {
    const opening = await prisma.opening.findUnique({
      where: { id },
      include: {
        measurement: true,
        documents: { orderBy: { createdAt: 'desc' }, take: 10 },
        aiAnalyses: { orderBy: { createdAt: 'desc' }, take: 1 },
        recommendedProduct: true,
      },
    });
    if (!opening) throw new NotFoundError('Opening');
    return opening;
  }

  async create(data: {
    inspectionId?: string;
    propertyId?: string;
    roomLabel: string;
    windowType?: string;
    condition?: string;
    floor?: string;
    hasScreen?: boolean;
    isEgress?: boolean;
    notes?: string;
    sortOrder?: number;
  }) {
    // Auto-assign sortOrder if not provided
    let sortOrder = data.sortOrder;
    if (sortOrder === undefined && data.inspectionId) {
      const count = await prisma.opening.count({ where: { inspectionId: data.inspectionId } });
      sortOrder = count + 1;
    }

    return prisma.opening.create({
      data: {
        inspectionId: data.inspectionId,
        propertyId: data.propertyId,
        roomLabel: data.roomLabel,
        windowType: data.windowType as any,
        condition: data.condition as any,
        floorLevel: data.floor ? parseInt(data.floor, 10) || 1 : 1,
        egressRequired: data.isEgress ?? false,
        notes: data.notes,
        sortOrder: sortOrder ?? 1,
      },
      include: { measurement: true },
    });
  }

  async update(id: string, data: Partial<{
    roomLabel: string;
    windowType: string;
    condition: string;
    floorLevel: number;
    egressRequired: boolean;
    notes: string;
    sortOrder: number;
  }>) {
    const existing = await prisma.opening.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Opening');
    return prisma.opening.update({
      where: { id },
      data: data as any,
      include: { measurement: true },
    });
  }

  async delete(id: string) {
    const existing = await prisma.opening.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Opening');
    // Cascade: delete measurement too
    await prisma.measurement.deleteMany({ where: { openingId: id } });
    return prisma.opening.delete({ where: { id } });
  }

  async reorder(inspectionId: string, orderedIds: string[]) {
    await Promise.all(
      orderedIds.map((id, idx) =>
        prisma.opening.update({ where: { id }, data: { sortOrder: idx + 1 } })
      )
    );
    return this.listByInspection(inspectionId);
  }
}

export const openingService = new OpeningService();
