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
        lead: { select: { id: true, firstName: true, lastName: true, status: true, estimatedRevenue: true } },
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

  async getById(id: string, organizationId: string) {
    const contact = await prisma.contact.findFirst({
      where: { 
        id,
        OR: [
          { lead: { organizationId } },
          { property: { leads: { some: { organizationId } } } }
        ]
      }
    });
    if (!contact) throw new NotFoundError('Contact');
    return contact;
  }

  async create(data: {
    leadId?: string;
    propertyId?: string;
    organizationId: string;
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
    const { userId, organizationId, ...contactData } = data;
    
    // Verify lead/property belongs to org
    if (contactData.leadId) {
      const lead = await prisma.lead.findFirst({ where: { id: contactData.leadId, organizationId } });
      if (!lead) throw new NotFoundError('Lead');
    }
    if (contactData.propertyId) {
      const prop = await prisma.property.findFirst({ where: { id: contactData.propertyId, leads: { some: { organizationId } } } });
      if (!prop) throw new NotFoundError('Property');
    }

    const contact = await prisma.contact.create({ data: contactData as any });
    await auditService.log({ userId, entityType: 'contact', entityId: contact.id, action: 'create', newValues: contact as any });
    return contact;
  }

  async update(id: string, organizationId: string, data: any, userId: string) {
    const existing = await this.getById(id, organizationId);
    const updated = await prisma.contact.update({ where: { id }, data });
    await auditService.log({ userId, entityType: 'contact', entityId: id, action: 'update', oldValues: existing as any, newValues: updated as any });
    return updated;
  }

  async delete(id: string, organizationId: string, userId: string) {
    await this.getById(id, organizationId);
    await prisma.contact.delete({ where: { id } });
    await auditService.log({ userId, entityType: 'contact', entityId: id, action: 'delete' });
  }
}

export const contactsService = new ContactsService();
