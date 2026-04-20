"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quotesRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../shared/middleware/auth");
const quotes_service_1 = require("./quotes.service");
const router = (0, express_1.Router)();
exports.quotesRouter = router;
router.get('/lead/:leadId', auth_1.auth.repOrAbove, async (req, res) => {
    const data = await quotes_service_1.quotesService.listForLead(req.params.leadId);
    res.json({ success: true, data });
});
router.get('/:id', auth_1.auth.repOrAbove, async (req, res) => {
    const data = await quotes_service_1.quotesService.getById(req.params.id);
    res.json({ success: true, data });
});
// POST /api/v1/quotes â€” create quote from manual line items
router.post('/', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const data = await quotes_service_1.quotesService.create({ ...req.body, createdById: user.id });
    res.status(201).json({ success: true, data });
});
// POST /api/v1/quotes/build â€” auto-build from property openings
router.post('/build', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const result = await quotes_service_1.quotesService.buildFromOpenings({
        ...req.body,
        createdById: user.id,
        organizationId: user.organizationId,
    });
    res.json({ success: true, data: result });
});
// POST /api/v1/quotes/calculate â€” calculate totals without saving
router.post('/calculate', auth_1.auth.repOrAbove, (req, res) => {
    const { lineItems, discountPct } = req.body;
    const result = quotes_service_1.quotesService.calculateTotals(lineItems, discountPct);
    res.json({ success: true, data: result });
});
router.patch('/:id', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const data = await quotes_service_1.quotesService.update(req.params.id, req.body, user.id);
    res.json({ success: true, data });
});
router.delete('/:id', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    await quotes_service_1.quotesService.delete(req.params.id, user.id);
    res.json({ success: true, message: 'Quote deleted' });
});
//# sourceMappingURL=quotes.routes.js.map