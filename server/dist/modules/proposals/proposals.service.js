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
exports.proposalsService = exports.ProposalsService = void 0;
const prisma_1 = require("../../shared/services/prisma");
const errorHandler_1 = require("../../shared/middleware/errorHandler");
const index_1 = require("../../jobs/index");
const audit_service_1 = require("../admin/audit.service");
const logger_1 = require("../../shared/utils/logger");
class ProposalsService {
    async list(options) {
        const { organizationId, leadId, status, repId, page, limit } = options;
        const where = {
            lead: { organizationId },
            ...(leadId && { leadId }),
            ...(status && { status }),
            ...(repId && { createdById: repId }),
        };
        const [total, data] = await Promise.all([
            prisma_1.prisma.proposal.count({ where }),
            prisma_1.prisma.proposal.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    lead: { select: { id: true, firstName: true, lastName: true, address: true, city: true } },
                    quote: { select: { id: true, total: true } },
                    createdBy: { select: { id: true, firstName: true, lastName: true } },
                },
            }),
        ]);
        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }
    async getById(id) {
        const proposal = await prisma_1.prisma.proposal.findUnique({
            where: { id },
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
        if (!proposal)
            throw new errorHandler_1.NotFoundError('Proposal');
        return proposal;
    }
    async create(data) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (data.validDays || 30));
        const proposal = await prisma_1.prisma.proposal.create({
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
            },
            include: {
                lead: { select: { id: true, firstName: true, lastName: true } },
                quote: { select: { id: true, total: true } },
            },
        });
        await audit_service_1.auditService.log({
            userId: data.createdById,
            entityType: 'proposal',
            entityId: proposal.id,
            action: 'create',
            newValues: proposal,
        });
        return proposal;
    }
    async generatePdf(id, userId) {
        const proposal = await this.getById(id);
        // Update status to generating
        await prisma_1.prisma.proposal.update({
            where: { id },
            data: { pdfStatus: 'GENERATING' },
        });
        try {
            // Queue PDF generation job
            const job = await index_1.pdfQueue.add('generate-proposal-pdf', {
                proposalId: id,
                leadName: `${proposal.lead?.firstName} ${proposal.lead?.lastName}`,
                address: proposal.lead?.address,
            });
            logger_1.logger.info(`PDF generation queued for proposal ${(0, logger_1.sanitizeForLog)(id)}, job ${job.id}`);
            return { queued: true, proposalId: id, jobId: job.id };
        }
        catch (err) {
            await prisma_1.prisma.proposal.update({
                where: { id },
                data: { pdfStatus: 'FAILED' },
            });
            throw err;
        }
    }
    async updateStatus(id, status, userId) {
        const validTransitions = {
            DRAFT: ['READY', 'ARCHIVED'],
            READY: ['SENT', 'DRAFT', 'ARCHIVED'],
            SENT: ['VIEWED', 'ACCEPTED', 'DECLINED', 'REVISED'],
            VIEWED: ['ACCEPTED', 'DECLINED', 'REVISED'],
            REVISED: ['SENT'],
            ACCEPTED: ['CONTRACTED'],
        };
        const proposal = await this.getById(id);
        const allowed = validTransitions[proposal.status] || [];
        if (!allowed.includes(status)) {
            throw new Error(`Cannot transition proposal from ${proposal.status} to ${status}`);
        }
        // If accepted, advance lead status
        if (status === 'ACCEPTED') {
            await prisma_1.prisma.lead.update({
                where: { id: proposal.leadId },
                data: { status: 'VERBAL_COMMIT' },
            });
        }
        const updated = await prisma_1.prisma.proposal.update({
            where: { id },
            data: {
                status,
                ...(status === 'SENT' && { sentAt: new Date() }),
                ...(status === 'VIEWED' && { firstViewedAt: new Date() }),
                ...(status === 'ACCEPTED' && { acceptedAt: new Date() }),
            },
        });
        await audit_service_1.auditService.log({
            userId,
            entityType: 'proposal',
            entityId: id,
            action: 'status_change',
            newValues: { status },
        });
        return updated;
    }
    async send(id, userId, channel) {
        const proposal = await this.getById(id);
        await this.updateStatus(id, 'SENT', userId);
        const lead = proposal.lead;
        const rep = proposal.createdBy;
        const quote = proposal.quote;
        // Send email if customer has an email address
        if ((channel === 'email' || channel === 'both') && lead?.email) {
            const { sendProposalEmail } = await Promise.resolve().then(() => __importStar(require('../../shared/services/email.service')));
            const result = await sendProposalEmail({
                to: lead.email,
                customerName: `${lead.firstName} ${lead.lastName}`,
                repName: rep ? `${rep.firstName} ${rep.lastName}` : 'Your WindowWorld Representative',
                repPhone: rep?.phone,
                repEmail: rep?.email,
                proposalTitle: proposal.title,
                proposalId: id,
                windowCount: quote?.totalWindows || 0,
                totalAmount: quote?.grandTotal || 0,
                expiresAt: proposal.expiresAt,
                pdfUrl: proposal.pdfUrl,
            });
            logger_1.logger.info(`Proposal ${(0, logger_1.sanitizeForLog)(id)} email ${result.success ? 'delivered' : 'failed'}: provider=${result.provider}`);
        }
        else if (channel === 'email' || channel === 'both') {
            logger_1.logger.warn(`Proposal ${(0, logger_1.sanitizeForLog)(id)}: no customer email on file for lead ${proposal.leadId}`);
        }
        // SMS: send portal link via Twilio
        if (channel === 'sms' || channel === 'both') {
            const phone = lead?.contacts?.[0]?.phone || lead?.phone;
            if (phone) {
                try {
                    const { smsService } = await Promise.resolve().then(() => __importStar(require('../../shared/services/sms.service')));
                    const appUrl = process.env.APP_URL || 'https://app.windowworldla.com';
                    const repFirst = rep ? rep.firstName : 'Your rep';
                    await smsService.sendSms(phone, `Hi ${lead.firstName}! ${repFirst} from WindowWorld has sent your window replacement proposal. View & accept it here: ${appUrl}/portal/${id}`);
                    logger_1.logger.info(`Proposal ${(0, logger_1.sanitizeForLog)(id)} SMS delivered to ${(0, logger_1.sanitizeForLog)(phone)}`);
                }
                catch (err) {
                    logger_1.logger.warn(`Proposal ${(0, logger_1.sanitizeForLog)(id)} SMS failed: ${(0, logger_1.sanitizeForLog)(err.message)}`);
                }
            }
            else {
                logger_1.logger.warn(`Proposal ${(0, logger_1.sanitizeForLog)(id)}: no phone on file for lead ${proposal.leadId} — SMS skipped`);
            }
        }
        return { sent: true, channel, proposalId: id };
    }
    async recordView(id, ipAddress) {
        const proposal = await prisma_1.prisma.proposal.findUnique({ where: { id } });
        if (!proposal)
            return;
        const updates = { viewCount: { increment: 1 } };
        if (proposal.status === 'SENT')
            updates.status = 'VIEWED';
        if (!proposal.firstViewedAt)
            updates.firstViewedAt = new Date();
        updates.lastViewedAt = new Date();
        await prisma_1.prisma.proposal.update({ where: { id }, data: updates });
    }
    async delete(id, userId) {
        const proposal = await this.getById(id);
        if (!['DRAFT', 'ARCHIVED'].includes(proposal.status)) {
            throw new Error('Only draft or archived proposals can be deleted');
        }
        await prisma_1.prisma.proposal.delete({ where: { id } });
    }
}
exports.ProposalsService = ProposalsService;
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
exports.proposalsService = new ProposalsService();
//# sourceMappingURL=proposals.service.js.map