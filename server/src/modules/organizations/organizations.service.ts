import { prisma } from '../../shared/services/prisma';
import { NotFoundError } from '../../shared/middleware/errorHandler';

export class OrganizationService {
  async getById(id: string) {
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        users: {
          where: { isActive: true },
          select: { id: true, firstName: true, lastName: true, role: true, email: true, avatarUrl: true, lastLoginAt: true },
          orderBy: { lastName: 'asc' },
        },
        territories: { select: { id: true, name: true, parishes: true } },
      },
    });
    if (!org) throw new NotFoundError('Organization');
    return org;
  }

  async update(id: string, userId: string, data: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    website?: string;
    brandColor?: string;
    settings?: Record<string, any>;
  }) {
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundError('Organization');

    // Merge settings instead of replacing
    const mergedSettings = data.settings
      ? { ...(org.settings as any || {}), ...data.settings }
      : undefined;

    return prisma.organization.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.state !== undefined && { state: data.state }),
        ...(data.zip !== undefined && { zip: data.zip }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.brandColor !== undefined && { brandColor: data.brandColor }),
        ...(mergedSettings !== undefined && { settings: mergedSettings }),
      },
    });
  }

  async getStats(id: string) {
    const [leadCount, activeUsers, proposalCount] = await Promise.all([
      prisma.lead.count({ where: { organizationId: id } }),
      prisma.user.count({ where: { organizationId: id, isActive: true } }),
      prisma.proposal.count({ where: { lead: { organizationId: id } } }),
    ]);
    return { leadCount, activeUsers, proposalCount };
  }
}

export const organizationService = new OrganizationService();
