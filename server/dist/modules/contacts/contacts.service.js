"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactsService = exports.ContactsService = void 0;
const prisma_1 = require("../../shared/services/prisma");
const errorHandler_1 = require("../../shared/middleware/errorHandler");
const audit_service_1 = require("../admin/audit.service");
class ContactsService {
    async listByLead(leadId, organizationId) {
        // Verify lead belongs to org
        const lead = await prisma_1.prisma.lead.findFirst({ where: { id: leadId, organizationId } });
        if (!lead)
            throw new errorHandler_1.NotFoundError('Lead');
        return prisma_1.prisma.contact.findMany({
            where: { leadId },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        });
    }
    async getById(id) {
        const contact = await prisma_1.prisma.contact.findUnique({ where: { id } });
        if (!contact)
            throw new errorHandler_1.NotFoundError('Contact');
        return contact;
    }
    async create(data) {
        const { userId, ...contactData } = data;
        const contact = await prisma_1.prisma.contact.create({ data: contactData });
        await audit_service_1.auditService.log({ userId, entityType: 'contact', entityId: contact.id, action: 'create', newValues: contact });
        return contact;
    }
    async update(id, data, userId) {
        const existing = await this.getById(id);
        const updated = await prisma_1.prisma.contact.update({ where: { id }, data });
        await audit_service_1.auditService.log({ userId, entityType: 'contact', entityId: id, action: 'update', oldValues: existing, newValues: updated });
        return updated;
    }
    async delete(id, userId) {
        await this.getById(id);
        await prisma_1.prisma.contact.delete({ where: { id } });
        await audit_service_1.auditService.log({ userId, entityType: 'contact', entityId: id, action: 'delete' });
    }
}
exports.ContactsService = ContactsService;
exports.contactsService = new ContactsService();
//# sourceMappingURL=contacts.service.js.map