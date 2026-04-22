import { prisma } from '../../shared/services/prisma';
import { NotFoundError } from '../../shared/middleware/errorHandler';
import { auditService } from '../admin/audit.service';

export class InvoicesService {
  async list(options: {
    organizationId: string;
    leadId?: string;
    status?: string;
    overdueOnly?: boolean;
    page: number;
    limit: number;
  }) {
    const { organizationId, leadId, status, overdueOnly, page, limit } = options;
    const where: any = {
      organizationId,
      ...(leadId && { leadId }),
      ...(status && { status }),
      ...(overdueOnly && {
        dueDate: { lt: new Date() },
        status: { in: ['SENT', 'PARTIAL'] },
      }),
    };

    const [total, data] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          payments: { orderBy: { paidAt: 'desc' } } as any,
        } as any,
      }),
    ]);

    // Enrich with computed fields
    const enriched = data.map((inv) => this.enrich(inv));
    return { data: enriched, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, phone: true } },
        payments: { orderBy: { paidAt: 'asc' } } as any,
      } as any,
    });
    if (!invoice) throw new NotFoundError('Invoice');
    return this.enrich(invoice);
  }

  private enrich(invoice: any) {
    const totalPaid = (invoice.payments || []).reduce((s: number, p: any) => s + p.amount, 0);
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

  async createFromProposal(params: {
    proposalId: string;
    leadId: string;
    dueDate?: string;
    depositPct?: number;
    depositAmount?: number;
    installNotes?: string;
    createdById: string;
  }) {
    const { proposalId, leadId, depositPct = 0, createdById } = params;

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { quote: true },
    });
    if (!proposal) throw new NotFoundError('Proposal');

    const grandTotal = (proposal.quote as any)?.grandTotal || 0;
    const depositAmount = params.depositAmount || Math.round(grandTotal * (depositPct / 100) * 100) / 100;
    const dueDate = params.dueDate ? new Date(params.dueDate) : (() => {
      const d = new Date(); d.setDate(d.getDate() + 30); return d;
    })();

    // Generate invoice number
    const count = await prisma.invoice.count({ where: { leadId } });
    const invoiceNumber = `WW-${new Date().getFullYear()}-${String(count + 1001).padStart(4, '0')}`;

    const invoice = await prisma.invoice.create({
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
      } as any,
      include: {
        lead: { select: { id: true, firstName: true, lastName: true } },
      } as any,
    });

    await auditService.log({
      userId: createdById,
      entityType: 'invoice',
      entityId: invoice.id,
      action: 'create',
      newValues: { invoiceNumber, grandTotal } as any,
    });

    return invoice;
  }

  async recordPayment(invoiceId: string, data: {
    amount: number;
    method: 'CASH' | 'CHECK' | 'CREDIT_CARD' | 'ACH' | 'FINANCING';
    reference?: string;
    notes?: string;
    paidAt?: string;
    recordedById: string;
  }) {
    const invoice = await this.getById(invoiceId);

    if (data.amount > (invoice as any).balance) {
      throw new Error(`Payment amount $${data.amount} exceeds outstanding balance $${(invoice as any).balance}`);
    }

    const payment = await (prisma as any).invoicePayment.create({
      data: {
        invoiceId,
        amount: data.amount,
        method: data.method as any,
        reference: data.reference,
        notes: data.notes,
        paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
        recordedById: data.recordedById,
      } as any,
    });

    // Update invoice status
    const newBalance = (invoice as any).balance - data.amount;
    const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL';

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: newStatus as any,
        ...(newBalance <= 0 && { paidAt: new Date() } as any),
      },
    });

    // If fully paid, advance lead to INSTALLED/PAID status
    if (newBalance <= 0) {
      await prisma.lead.update({
        where: { id: invoice.leadId },
        data: { status: 'PAID' },
      });
    }

    await auditService.log({
      userId: data.recordedById,
      entityType: 'invoice',
      entityId: invoiceId,
      action: 'payment',
      newValues: { amount: data.amount, method: data.method, newBalance } as any,
    });

    return payment;
  }

  async send(id: string, userId: string) {
    const invoice = await this.getById(id);
    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() } as any,
    });

    // Send email if we can resolve the customer email via proposal → lead
    try {
      const full = await prisma.invoice.findUnique({
        where: { id },
        include: {
          proposal: {
            include: {
              lead: { select: { email: true, firstName: true, lastName: true } },
              createdBy: { select: { firstName: true, lastName: true } },
            },
          },
        } as any,
      }) as any;

      const lead = full?.proposal?.lead;
      const rep = full?.proposal?.createdBy;

      if (lead?.email) {
        const { sendInvoiceEmail } = await import('../../shared/services/email.service');
        await sendInvoiceEmail({
          to: lead.email,
          customerName: `${lead.firstName} ${lead.lastName}`,
          invoiceNumber: invoice.invoiceNumber as string,
          grandTotal: (invoice as any).grandTotal,
          depositAmount: (invoice as any).depositAmount ?? undefined,
          dueDate: (invoice as any).dueDate ?? undefined,
          pdfUrl: (invoice as any).pdfUrl ?? undefined,
          repName: rep ? `${rep.firstName} ${rep.lastName}` : undefined,
        });
      }
    } catch (err: any) {
      // Non-fatal — invoice status is already updated
      const { logger } = await import('../../shared/utils/logger');
      logger.warn(`[invoice] Email send failed for ${id}: ${err.message}`);
    }

    return updated;
  }

  async getAgingSummary(organizationId: string) {
    const invoices = await prisma.invoice.findMany({
      where: { organizationId, status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] } } as any,
      include: { payments: true } as any,
    });

    const enriched = invoices.map((inv) => this.enrich(inv));
    const buckets = {
      current: enriched.filter((i) => !i.isOverdue),
      days_1_30: enriched.filter((i) => i.daysOverdue > 0 && i.daysOverdue <= 30),
      days_31_60: enriched.filter((i) => i.daysOverdue > 30 && i.daysOverdue <= 60),
      days_61_90: enriched.filter((i) => i.daysOverdue > 60 && i.daysOverdue <= 90),
      over_90: enriched.filter((i) => i.daysOverdue > 90),
    };

    return Object.fromEntries(
      Object.entries(buckets).map(([key, invs]) => [key, {
        count: invs.length,
        total: invs.reduce((s, i) => s + i.balance, 0),
      }])
    );
  }
}

export const invoicesService = new InvoicesService();

