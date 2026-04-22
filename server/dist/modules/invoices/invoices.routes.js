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
exports.invoicesRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../shared/middleware/auth");
const invoices_service_1 = require("./invoices.service");
const router = (0, express_1.Router)();
exports.invoicesRouter = router;
router.get('/', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const { page = '1', limit = '25', leadId, status, overdueOnly } = req.query;
    const result = await invoices_service_1.invoicesService.list({
        organizationId: user.organizationId,
        leadId, status,
        overdueOnly: overdueOnly === 'true',
        page: parseInt(page), limit: parseInt(limit),
    });
    res.json({ success: true, ...result });
});
router.get('/aging', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    const data = await invoices_service_1.invoicesService.getAgingSummary(user.organizationId);
    res.json({ success: true, data });
});
router.get('/:id', auth_1.auth.repOrAbove, async (req, res) => {
    const data = await invoices_service_1.invoicesService.getById(req.params.id);
    res.json({ success: true, data });
});
router.post('/from-proposal', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const data = await invoices_service_1.invoicesService.createFromProposal({ ...req.body, createdById: user.id });
    res.status(201).json({ success: true, data });
});
router.post('/:id/payments', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const data = await invoices_service_1.invoicesService.recordPayment(req.params.id, { ...req.body, recordedById: user.id });
    res.status(201).json({ success: true, data });
});
router.post('/:id/send', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const data = await invoices_service_1.invoicesService.send(req.params.id, user.id);
    res.json({ success: true, data });
});
// POST /api/v1/invoices/:id/generate-pdf — queue PDF generation for an invoice
router.post('/:id/generate-pdf', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const id = req.params.id;
    const invoice = await invoices_service_1.invoicesService.getById(id);
    const { pdfQueue } = await Promise.resolve().then(() => __importStar(require('../../jobs')));
    const { prisma: db } = await Promise.resolve().then(() => __importStar(require('../../shared/services/prisma')));
    // Mark as generating
    await db.invoice.update({ where: { id }, data: { pdfStatus: 'GENERATING' } });
    try {
        const job = await pdfQueue.add('generate-invoice-pdf', {
            invoiceId: id,
            invoiceNumber: invoice.invoiceNumber,
            leadId: invoice.leadId,
            generatedById: user.id,
        });
        res.json({ success: true, data: { queued: true, invoiceId: id, jobId: job.id } });
    }
    catch (err) {
        await db.invoice.update({ where: { id }, data: { pdfStatus: 'FAILED' } });
        throw err;
    }
});
// GET /invoices/install-schedule — invoices that are contracted and ready for install scheduling
router.get('/install-schedule', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    const { prisma } = await Promise.resolve().then(() => __importStar(require('../../shared/services/prisma')));
    const jobs = await prisma.invoice.findMany({
        where: {
            organizationId: user.organizationId,
            status: { in: ['SENT', 'PARTIAL', 'PAID'] },
            proposalId: { not: null }, // only invoices tied to a proposal
        },
        include: {
            lead: {
                select: {
                    id: true, firstName: true, lastName: true,
                    address: true, city: true, zip: true, phone: true,
                },
            },
            proposal: {
                include: {
                    quote: { select: { grandTotal: true, totalWindows: true, lineItems: true } },
                },
            },
            payments: { select: { amount: true, paidAt: true } },
        },
        orderBy: { createdAt: 'asc' },
    });
    // Shape into install job format
    const formatted = jobs.map((inv) => {
        const lead = inv.lead || {};
        const quote = inv.proposal?.quote;
        const totalPaid = (inv.payments || []).reduce((s, p) => s + p.amount, 0);
        return {
            id: inv.id,
            leadId: lead.id || inv.leadId,
            customerName: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
            address: lead.address || '',
            city: lead.city || '',
            phone: lead.phone || '',
            windowCount: quote?.totalWindows || 0,
            series: quote?.lineItems?.[0]?.productName || 'Unknown Series',
            contractValue: inv.grandTotal,
            contractDate: inv.createdAt.toISOString().split('T')[0],
            installDate: inv.installDate || null,
            crew: inv.installCrew || null,
            status: inv.installStatus || (inv.status === 'PAID' ? 'COMPLETE' : 'NEEDS_SCHEDULING'),
            notes: inv.installNotes || inv.notes || null,
            depositPaid: totalPaid >= (inv.depositAmount || 0),
            depositAmount: inv.depositAmount || 0,
            estimatedDays: Math.max(1, Math.ceil((quote?.totalWindows || 0) / 8)),
        };
    });
    res.json({ success: true, data: formatted });
});
// PATCH /invoices/:id/install — set install date, crew, and status
router.patch('/:id/install', auth_1.auth.manager, async (req, res) => {
    const { prisma } = await Promise.resolve().then(() => __importStar(require('../../shared/services/prisma')));
    const { installDate, crew, installStatus, notes } = req.body;
    const updated = await prisma.invoice.update({
        where: { id: req.params.id },
        data: {
            ...(installDate && { installDate: new Date(installDate) }),
            ...(crew !== undefined && { installCrew: crew }),
            ...(installStatus && { installStatus }),
            ...(notes !== undefined && { installNotes: notes }),
        },
    });
    res.json({ success: true, data: updated });
});
//# sourceMappingURL=invoices.routes.js.map