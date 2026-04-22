"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoicesService = exports.InvoicesService = void 0;
const prisma_1 = require("../../shared/services/prisma");
const errorHandler_1 = require("../../shared/middleware/errorHandler");
const audit_service_1 = require("../admin/audit.service");
class InvoicesService {
    async list(options) {
        const { organizationId, leadId, status, overdueOnly, page, limit } = options;
        const where = {
            organizationId,
            ...(leadId && { leadId }),
            ...(status && { status }),
            ...(overdueOnly && {
                dueDate: { lt: new Date() },
                status: { in: ['SENT', 'PARTIAL'] },
            }),
        };
        const [total, data] = await Promise.all([
            prisma_1.prisma.invoice.count({ where }),
            prisma_1.prisma.invoice.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    createdBy: { select: { id: true, firstName: true, lastName: true } },
                    payments: { orderBy: { paidAt: 'desc' } },
                },
            }),
        ]);
        // Enrich with computed fields
        const enriched = data.map((inv) => this.enrich(inv));
        return { data: enriched, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }
    async getById(id) {
        const invoice = await prisma_1.prisma.invoice.findUnique({
            where: { id },
            include: {
                createdBy: { select: { id: true, firstName: true, lastName: true, phone: true } },
                payments: { orderBy: { paidAt: 'asc' } },
            },
        });
        if (!invoice)
            throw new errorHandler_1.NotFoundError('Invoice');
        return this.enrich(invoice);
    }
    enrich(invoice) {
        const totalPaid = (invoice.payments || []).reduce((s, p) => s + p.amount, 0);
        const balance = invoice.grandTotal - totalPaid;
        const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && balance > 0;
        const daysOverdue = isOverdue
            ? Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / 86400000)
            : 0;
        return {
            ...invoice,
            totalPaid: Math.round(totalPaid * 100) / 100,
            balance: Math.round(balance * 100) / 100,
            isOverdue,
            daysOverdue,
            completionPct: invoice.grandTotal > 0 ? Math.round((totalPaid / invoice.grandTotal) * 100) : 0,
        };
    }
    async createFromProposal(params) {
        const { proposalId, leadId, depositPct = 0, createdById } = params;
        const proposal = await prisma_1.prisma.proposal.findUnique({
            where: { id: proposalId },
            include: { quote: true },
        });
        if (!proposal)
            throw new errorHandler_1.NotFoundError('Proposal');
        const grandTotal = proposal.quote?.grandTotal || 0;
        const depositAmount = params.depositAmount || Math.round(grandTotal * (depositPct / 100) * 100) / 100;
        const dueDate = params.dueDate ? new Date(params.dueDate) : (() => {
            const d = new Date();
            d.setDate(d.getDate() + 30);
            return d;
        })();
        // Generate invoice number
        const count = await prisma_1.prisma.invoice.count({ where: { leadId } });
        const invoiceNumber = `WW-${new Date().getFullYear()}-${String(count + 1001).padStart(4, '0')}`;
        const invoice = await prisma_1.prisma.invoice.create({
            data: {
                leadId,
                proposalId,
                invoiceNumber,
                grandTotal,
                depositAmount,
                depositPct,
                dueDate,
                installNotes: params.installNotes,
                status: 'DRAFT',
                createdById,
            },
            include: {
                lead: { select: { id: true, firstName: true, lastName: true } },
            },
        });
        await audit_service_1.auditService.log({
            userId: createdById,
            entityType: 'invoice',
            entityId: invoice.id,
            action: 'create',
            newValues: { invoiceNumber, grandTotal },
        });
        return invoice;
    }
    async recordPayment(invoiceId, data) {
        const invoice = await this.getById(invoiceId);
        if (data.amount > invoice.balance) {
            throw new Error(`Payment amount $${data.amount} exceeds outstanding balance $${invoice.balance}`);
        }
        const payment = await prisma_1.prisma.invoicePayment.create({
            data: {
                invoiceId,
                amount: data.amount,
                method: data.method,
                reference: data.reference,
                notes: data.notes,
                paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
                recordedById: data.recordedById,
            },
        });
        // Update invoice status
        const newBalance = invoice.balance - data.amount;
        const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL';
        await prisma_1.prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                status: newStatus,
                ...(newBalance <= 0 && { paidAt: new Date() }),
            },
        });
        // If fully paid, advance lead to INSTALLED/PAID status
        if (newBalance <= 0) {
            await prisma_1.prisma.lead.update({
                where: { id: invoice.leadId },
                data: { status: 'PAID' },
            });
        }
        await audit_service_1.auditService.log({
            userId: data.recordedById,
            entityType: 'invoice',
            entityId: invoiceId,
            action: 'payment',
            newValues: { amount: data.amount, method: data.method, newBalance },
        });
        return payment;
    }
    async send(id, userId) {
        const invoice = await this.getById(id);
        const updated = await prisma_1.prisma.invoice.update({
            where: { id },
            data: { status: 'SENT', sentAt: new Date() },
        });
        // Send email if we can resolve the customer email via proposal → lead
        try {
            const full = await prisma_1.prisma.invoice.findUnique({
                where: { id },
                include: {
                    proposal: {
                        include: {
                            lead: { select: { email: true, firstName: true, lastName: true } },
                            createdBy: { select: { firstName: true, lastName: true } },
                        },
                    },
                },
            });
            const lead = full?.proposal?.lead;
            const rep = full?.proposal?.createdBy;
            if (lead?.email) {
                const { sendInvoiceEmail } = await Promise.resolve().then(() => __importStar(require('../../shared/services/email.service')));
                await sendInvoiceEmail({
                    to: lead.email,
                    customerName: `${lead.firstName} ${lead.lastName}`,
                    invoiceNumber: invoice.invoiceNumber,
                    grandTotal: invoice.grandTotal,
                    depositAmount: invoice.depositAmount ?? undefined,
                    dueDate: invoice.dueDate ?? undefined,
                    pdfUrl: invoice.pdfUrl ?? undefined,
                    repName: rep ? `${rep.firstName} ${rep.lastName}` : undefined,
                });
            }
        }
        catch (err) {
            // Non-fatal — invoice status is already updated
            const { logger, sanitizeForLog } = await Promise.resolve().then(() => __importStar(require('../../shared/utils/logger')));
            logger.warn(`[invoice] Email send failed for ${id}: ${sanitizeForLog(err.message)}`);
        }
        return updated;
    }
    async getAgingSummary(organizationId) {
        const invoices = await prisma_1.prisma.invoice.findMany({
            where: { organizationId, status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] } },
            include: { payments: true },
        });
        const enriched = invoices.map((inv) => this.enrich(inv));
        const buckets = {
            current: enriched.filter((i) => !i.isOverdue),
            days_1_30: enriched.filter((i) => i.daysOverdue > 0 && i.daysOverdue <= 30),
            days_31_60: enriched.filter((i) => i.daysOverdue > 30 && i.daysOverdue <= 60),
            days_61_90: enriched.filter((i) => i.daysOverdue > 60 && i.daysOverdue <= 90),
            over_90: enriched.filter((i) => i.daysOverdue > 90),
        };
        return Object.fromEntries(Object.entries(buckets).map(([key, invs]) => [key, {
                count: invs.length,
                total: invs.reduce((s, i) => s + i.balance, 0),
            }]));
    }
}
exports.InvoicesService = InvoicesService;
exports.invoicesService = new InvoicesService();
//# sourceMappingURL=invoices.service.js.map