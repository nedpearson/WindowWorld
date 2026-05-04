import { prisma } from '../../shared/services/prisma';
import { NotFoundError } from '../../shared/middleware/errorHandler';
import { pdfQueue } from '../../jobs/index';
import { auditService } from '../admin/audit.service';
import { logger, sanitizeForLog } from '../../shared/utils/logger';

export class ProposalsService {
  async list(options: {
    organizationId: string;
    leadId?: string;
    status?: string;
    repId?: string;
    page: number;
    limit: number;
  }) {
    const { organizationId, leadId, status, repId, page, limit } = options;
    const where: any = {
      lead: { organizationId },
      ...(leadId && { leadId }),
      ...(status && { status }),
      ...(repId && { createdById: repId }),
    };

    const [total, data] = await Promise.all([
      prisma.proposal.count({ where }),
      prisma.proposal.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, address: true, city: true } },
          quote: { select: { id: true, total: true } } as any,
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string, organizationId?: string) {
    const proposal = await prisma.proposal.findFirst({
      where: { id, ...(organizationId && { lead: { organizationId } }) },
      include: {
        lead: {
          include: {
            contacts: { where: { isPrimary: true }, take: 1 },
            assignedRep: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
          },
        },
        quote: true,
        createdBy: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
      },
    });
    if (!proposal) throw new NotFoundError('Proposal');
    return proposal;
  }

  async create(data: {
    leadId: string;
    quoteId?: string;
    propertyId?: string;
    title?: string;
    introMessage?: string;
    warrantyHighlights?: string[];
    validDays?: number;
    createdById: string;
    organizationId: string;
  }) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (data.validDays || 30));

    // Verify lead belongs to org
    const lead = await prisma.lead.findFirst({ where: { id: data.leadId, organizationId: data.organizationId } });
    if (!lead) throw new NotFoundError('Lead');

    const proposal = await prisma.proposal.create({
      data: {
        leadId: data.leadId,
        quoteId: data.quoteId,
        propertyId: data.propertyId,
        title: data.title || 'WindowWorld Window Replacement Proposal',
        introMessage: data.introMessage || DEFAULT_INTRO,
        warrantyHighlights: data.warrantyHighlights || DEFAULT_WARRANTY_HIGHLIGHTS,
        status: 'DRAFT',
        expiresAt,
        validDays: data.validDays || 30,
        createdById: data.createdById,
      } as any,
      include: {
        lead: { select: { id: true, firstName: true, lastName: true } },
        quote: { select: { id: true, total: true } } as any,
      },
    });

    await auditService.log({
      userId: data.createdById,
      entityType: 'proposal',
      entityId: proposal.id,
      action: 'create',
      newValues: proposal as any,
    });

    return proposal;
  }

  async generatePdf(id: string, organizationId: string, userId: string) {
    const proposal = await this.getById(id, organizationId);

    // Update status to generating
    await prisma.proposal.update({
      where: { id },
      data: { pdfStatus: 'GENERATING' } as any,
    });

    try {
      // Queue PDF generation job
      const job = await pdfQueue.add('generate-proposal-pdf', {
        proposalId: id,
        leadName: `${(proposal as any).lead?.firstName} ${(proposal as any).lead?.lastName}`,
        address: (proposal as any).lead?.address,
      });

      logger.info(`PDF generation queued for proposal ${sanitizeForLog(id)}, job ${job.id}`);

      return { queued: true, proposalId: id, jobId: job.id };
    } catch (err) {
      await prisma.proposal.update({
        where: { id },
        data: { pdfStatus: 'FAILED' } as any,
      });
      throw err;
    }
  }

  async updateStatus(id: string, organizationId: string, status: string, userId: string) {
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['READY', 'ARCHIVED'],
      READY: ['SENT', 'DRAFT', 'ARCHIVED'],
      SENT: ['VIEWED', 'ACCEPTED', 'DECLINED', 'REVISED'],
      VIEWED: ['ACCEPTED', 'DECLINED', 'REVISED'],
      REVISED: ['SENT'],
      ACCEPTED: ['CONTRACTED'],
    };

    const proposal = await this.getById(id, organizationId);
    const allowed = validTransitions[proposal.status as string] || [];
    if (!allowed.includes(status)) {
      throw new Error(`Cannot transition proposal from ${proposal.status} to ${status}`);
    }

    // If accepted, advance lead status
    if (status === 'ACCEPTED') {
      await prisma.lead.update({
        where: { id: proposal.leadId },
        data: { status: 'VERBAL_COMMIT' },
      });
    }

    const updated = await prisma.proposal.update({
      where: { id },
      data: {
        status,
        ...(status === 'SENT' && { sentAt: new Date() } as any),
        ...(status === 'VIEWED' && { firstViewedAt: new Date() } as any),
        ...(status === 'ACCEPTED' && { acceptedAt: new Date() } as any),
      } as any,
    });

    await auditService.log({
      userId,
      entityType: 'proposal',
      entityId: id,
      action: 'status_change',
      newValues: { status } as any,
    });

    return updated;
  }

  async send(id: string, organizationId: string, userId: string, channel: 'email' | 'sms' | 'both') {
    const proposal = await this.getById(id, organizationId);
    await this.updateStatus(id, organizationId, 'SENT', userId);

    const lead = (proposal as any).lead;
    const rep = (proposal as any).createdBy;
    const quote = (proposal as any).quote;

    // Send email if customer has an email address
    if ((channel === 'email' || channel === 'both') && lead?.email) {
      const { sendProposalEmail } = await import('../../shared/services/email.service');
      const result = await sendProposalEmail({
        to: lead.email,
        customerName: `${lead.firstName} ${lead.lastName}`,
        repName: rep ? `${rep.firstName} ${rep.lastName}` : 'Your WindowWorld Representative',
        repPhone: rep?.phone,
        repEmail: rep?.email,
        proposalTitle: (proposal as any).title,
        proposalId: id,
        windowCount: quote?.totalWindows || 0,
        totalAmount: quote?.grandTotal || 0,
        expiresAt: (proposal as any).expiresAt,
        pdfUrl: (proposal as any).pdfUrl,
      });
      logger.info(`Proposal ${sanitizeForLog(id)} email ${result.success ? 'delivered' : 'failed'}: provider=${sanitizeForLog(result.provider)}`);
    } else if (channel === 'email' || channel === 'both') {
      logger.warn(`Proposal ${sanitizeForLog(id)}: no customer email on file for lead ${sanitizeForLog(proposal.leadId)}`);
    }

    // SMS: send portal link via Twilio
    if (channel === 'sms' || channel === 'both') {
      const phone = lead?.contacts?.[0]?.phone || (lead as any)?.phone;
      if (phone) {
        try {
          const { smsService } = await import('../../shared/services/sms.service');
          const appUrl = process.env.APP_URL || 'https://app.windowworldla.com';
          const repFirst = rep ? rep.firstName : 'Your rep';
          await smsService.sendSms(
            phone,
            `Hi ${lead.firstName}! ${repFirst} from WindowWorld has sent your window replacement proposal. View & accept it here: ${appUrl}/portal/${id}`,
          );
          logger.info(`Proposal ${sanitizeForLog(id)} SMS delivered to ${sanitizeForLog(phone)}`);
        } catch (err: any) {
          logger.warn(`Proposal ${sanitizeForLog(id)} SMS failed: ${sanitizeForLog(err.message)}`);
        }
      } else {
        logger.warn(`Proposal ${sanitizeForLog(id)}: no phone on file for lead ${sanitizeForLog(proposal.leadId)} — SMS skipped`);
      }
    }

    return { sent: true, channel, proposalId: id };
  }

  async recordView(id: string, ipAddress?: string) {
    const proposal = await prisma.proposal.findUnique({ where: { id } });
    if (!proposal) return;

    const updates: any = { viewCount: { increment: 1 } };
    if (proposal.status === 'SENT') updates.status = 'VIEWED';
    if (!(proposal as any).firstViewedAt) updates.firstViewedAt = new Date();
    updates.lastViewedAt = new Date();

    await prisma.proposal.update({ where: { id }, data: updates });
  }

  async delete(id: string, organizationId: string, userId: string) {
    const proposal = await this.getById(id, organizationId);
    if (!['DRAFT', 'ARCHIVED'].includes(proposal.status as string)) {
      throw new Error('Only draft or archived proposals can be deleted');
    }
    await prisma.proposal.delete({ where: { id } });
  }
}

// â”€â”€â”€ Default content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DEFAULT_INTRO = `Thank you for the opportunity to provide this window replacement proposal for your home. WindowWorld of Louisiana has been serving Baton Rouge and the surrounding parishes for years, providing premium replacement windows backed by the industry's best warranty.

This proposal includes pricing for all identified window openings, your choice of product series, and all installation costs. Our installation teams are fully licensed and insured in Louisiana.

We are committed to completing your project with zero surprises â€” no hidden fees, no subcontractors, and no pressure.`;

const DEFAULT_WARRANTY_HIGHLIGHTS = [
  'Limited Lifetime Warranty on all window frames and glass',
  'Lifetime guarantee against seal failure and moisture intrusion',
  'Lifetime labor warranty on all window installation work',
  'Transferable warranty â€” adds value to your home',
  'Hurricane impact rating available (Series 6000) â€” meets LA building codes',
  'Energy StarÂ® certified products qualify for federal tax credits',
];

export const proposalsService = new ProposalsService();

