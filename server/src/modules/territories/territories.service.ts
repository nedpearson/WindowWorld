import { prisma } from '../../shared/services/prisma';
import { NotFoundError } from '../../shared/middleware/errorHandler';
import { auditService } from '../admin/audit.service';

export class TerritoriesService {
  async list(organizationId: string) {
    return prisma.territory.findMany({
      where: { organizationId, isActive: true },
      include: {
        users: {
          include: { user: { select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true } } },
        },
        _count: { select: { leads: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getById(id: string) {
    const territory = await prisma.territory.findUnique({
      where: { id },
      include: {
        users: {
          include: { user: { select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true } } },
        },
        _count: { select: { leads: true } },
      },
    });
    if (!territory) throw new NotFoundError('Territory');
    return territory;
  }

  async create(data: any, userId: string) {
    const territory = await prisma.territory.create({ data });
    await auditService.log({ userId, entityType: 'territory', entityId: territory.id, action: 'create', newValues: territory as any });
    return territory;
  }

  async update(id: string, data: any, userId: string) {
    const updated = await prisma.territory.update({ where: { id }, data });
    await auditService.log({ userId, entityType: 'territory', entityId: id, action: 'update', newValues: updated as any });
    return updated;
  }

  async assignRep(territoryId: string, userId: string, isPrimary: boolean) {
    return prisma.territoryUser.upsert({
      where: { territoryId_userId: { territoryId, userId } },
      update: { isPrimary },
      create: { territoryId, userId, isPrimary },
    });
  }

  async removeRep(territoryId: string, userId: string) {
    return prisma.territoryUser.delete({
      where: { territoryId_userId: { territoryId, userId } },
    });
  }

  async getLeadHeatmap(id: string) {
    const territory = await this.getById(id);
    const leads = await prisma.lead.findMany({
      where: {
        territoryId: id,
        lat: { not: null },
        lng: { not: null },
        deletedAt: null,
      },
      select: {
        id: true, lat: true, lng: true, status: true,
        leadScore: true, urgencyScore: true, isStormLead: true,
        parish: true, zip: true,
      },
    });

    // Aggregate by parish
    const byParish: Record<string, { count: number; avgScore: number; leads: any[] }> = {};
    leads.forEach((lead) => {
      const p = lead.parish || 'Unknown';
      if (!byParish[p]) byParish[p] = { count: 0, avgScore: 0, leads: [] };
      byParish[p].count++;
      byParish[p].avgScore += (lead.leadScore || 0);
      byParish[p].leads.push(lead);
    });
    Object.values(byParish).forEach((p) => {
      p.avgScore = p.count > 0 ? Math.round(p.avgScore / p.count) : 0;
    });

    return { territory, leads, byParish };
  }
}

export const territoriesService = new TerritoriesService();
