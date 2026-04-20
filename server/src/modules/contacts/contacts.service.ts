import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/services/prisma';
import { NotFoundError } from '../../shared/middleware/errorHandler';
import { auditService } from '../admin/audit.service';

export class ContactsService {
  async listForOrg(organizationId: string, search?: string) {
    const searchWhere = search ? {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {};

    return prisma.contact.findMany({
      where: { lead: { organizationId }, ...searchWhere },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, status: true, estimatedValue: true } },
      },
      orderBy: [{ isPrimary: 'desc' }, { lastName: 'asc' }],
      take: 500,
    });
  }

  async listByLead(leadId: string, organizationId: string) {
    // Verify lead belongs to org
    const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId } });
    if (!lead) throw new NotFoundError('Lead');

    return prisma.contact.findMany({
      where: { leadId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async getById(id: string) {
    const contact = await prisma.contact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundError('Contact');
    return contact;
  }

  async create(data: {
    leadId?: string;
    propertyId?: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    phone2?: string;
    isOwner?: boolean;
    isSpouse?: boolean;
    isPrimary?: boolean;
    preferredContactMethod?: string;
    bestTimeToContact?: string;
    doNotCall?: boolean;
    doNotEmail?: boolean;
    doNotText?: boolean;
    notes?: string;
    userId: string;
  }) {
    const { userId, ...contactData } = data;
    const contact = await prisma.contact.create({ data: contactData as any });
    await auditService.log({ userId, entityType: 'contact', entityId: contact.id, action: 'create', newValues: contact as any });
    return contact;
  }

  async update(id: string, data: any, userId: string) {
    const existing = await this.getById(id);
    const updated = await prisma.contact.update({ where: { id }, data });
    await auditService.log({ userId, entityType: 'contact', entityId: id, action: 'update', oldValues: existing as any, newValues: updated as any });
    return updated;
  }

  async delete(id: string, userId: string) {
    await this.getById(id);
    await prisma.contact.delete({ where: { id } });
    await auditService.log({ userId, entityType: 'contact', entityId: id, action: 'delete' });
  }
}

export const contactsService = new ContactsService();
