"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proposalsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../shared/middleware/auth");
const proposals_service_1 = require("./proposals.service");
const prisma_1 = require("../../shared/services/prisma");
const router = (0, express_1.Router)();
exports.proposalsRouter = router;
// ── Public: homeowner portal (no auth required) ────────────────
// GET /api/v1/proposals/portal/:id
router.get('/portal/:id', async (req, res) => {
    try {
        const data = await proposals_service_1.proposalsService.getById(req.params.id);
        // Enforce expiry — reject if past expiresAt
        if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
            return res.status(410).json({
                success: false,
                error: { message: 'This proposal has expired. Please contact your WindowWorld representative.' },
            });
        }
        // Record view (increments viewCount, sets firstViewedAt, advances SENT → VIEWED)
        await proposals_service_1.proposalsService.recordView(req.params.id, req.ip || '');
        res.json({ success: true, data });
    }
    catch {
        res.status(404).json({ success: false, error: { message: 'Proposal not found or expired' } });
    }
});
// POST /api/v1/proposals/portal/:id/accept
router.post('/portal/:id/accept', async (req, res) => {
    const { signerName } = req.body;
    if (!signerName?.trim()) {
        return res.status(400).json({ success: false, error: { message: 'Signer name is required' } });
    }
    try {
        // Check expiry before accepting
        const proposal = await proposals_service_1.proposalsService.getById(req.params.id);
        if (proposal.expiresAt && new Date(proposal.expiresAt) < new Date()) {
            return res.status(410).json({ success: false, error: { message: 'This proposal has expired.' } });
        }
        // Mark accepted + advance lead to VERBAL_COMMIT
        await proposals_service_1.proposalsService.updateStatus(req.params.id, 'ACCEPTED', 'portal-signature');
        // Persist signer name + IP for legal audit trail
        await prisma_1.prisma.proposal.update({
            where: { id: req.params.id },
            data: {
                acceptedAt: new Date(),
                signedByName: signerName.trim(),
                signedAt: new Date(),
                signedByIp: req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown',
            },
        });
        res.json({ success: true, message: 'Proposal accepted and signed', signerName });
    }
    catch (err) {
        res.status(400).json({ success: false, error: { message: err.message } });
    }
});
router.get('/', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const { page = '1', limit = '25', leadId, status } = req.query;
    const repId = user.role === 'SALES_REP' ? user.id : undefined;
    const result = await proposals_service_1.proposalsService.list({
        organizationId: user.organizationId,
        leadId, status, repId,
        page: parseInt(page), limit: parseInt(limit),
    });
    res.json({ success: true, ...result });
});
router.get('/:id', auth_1.auth.repOrAbove, async (req, res) => {
    const data = await proposals_service_1.proposalsService.getById(req.params.id);
    res.json({ success: true, data });
});
// Public: record when customer views the proposal
router.post('/p/:id/view', async (req, res) => {
    await proposals_service_1.proposalsService.recordView(req.params.id, req.ip);
    res.json({ success: true });
});
router.post('/', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const data = await proposals_service_1.proposalsService.create({ ...req.body, createdById: user.id, organizationId: user.organizationId });
    res.status(201).json({ success: true, data });
});
router.post('/:id/generate-pdf', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const data = await proposals_service_1.proposalsService.generatePdf(req.params.id, user.id);
    res.json({ success: true, data });
});
router.post('/:id/send', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const { channel = 'email' } = req.body;
    const data = await proposals_service_1.proposalsService.send(req.params.id, user.id, channel);
    res.json({ success: true, data });
});
// POST /api/v1/proposals/:id/sign — internal rep-side signing (e.g. in-person tablet sign)
router.post('/:id/sign', auth_1.auth.repOrAbove, async (req, res) => {
    const { signerName, signerIp } = req.body;
    if (!signerName?.trim()) {
        return res.status(400).json({ success: false, error: { message: 'signerName is required' } });
    }
    const proposal = await proposals_service_1.proposalsService.getById(req.params.id);
    // Check expiry
    if (proposal.expiresAt && new Date(proposal.expiresAt) < new Date()) {
        return res.status(410).json({ success: false, error: { message: 'Proposal has expired' } });
    }
    // Advance status to ACCEPTED (service handles lead advancement)
    if (!['ACCEPTED', 'CONTRACTED'].includes(proposal.status)) {
        await proposals_service_1.proposalsService.updateStatus(req.params.id, 'ACCEPTED', req.user.id);
    }
    // Persist signature metadata
    const updated = await prisma_1.prisma.proposal.update({
        where: { id: req.params.id },
        data: {
            signedByName: signerName.trim(),
            signedAt: new Date(),
            acceptedAt: proposal.acceptedAt || new Date(),
            signedByIp: signerIp || req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'internal',
        },
    });
    res.json({ success: true, data: updated, message: 'Proposal signed successfully' });
});
router.patch('/:id/status', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const data = await proposals_service_1.proposalsService.updateStatus(req.params.id, req.body.status, user.id);
    res.json({ success: true, data });
});
router.delete('/:id', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    await proposals_service_1.proposalsService.delete(req.params.id, user.id);
    res.json({ success: true, message: 'Proposal deleted' });
});
//# sourceMappingURL=proposals.routes.js.map