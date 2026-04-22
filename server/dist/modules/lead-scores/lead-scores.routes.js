"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadscoresRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../shared/middleware/auth");
const lead_scores_service_1 = require("./lead-scores.service");
const router = (0, express_1.Router)();
exports.leadscoresRouter = router;
// GET /lead-scores/lead/:leadId — all scores for a lead (most recent first)
router.get('/lead/:leadId', auth_1.auth.repOrAbove, async (req, res) => {
    const data = await lead_scores_service_1.leadScoreService.getByLead(String(req.params.leadId));
    res.json({ success: true, data });
});
// GET /lead-scores/lead/:leadId/latest — single latest score
router.get('/lead/:leadId/latest', auth_1.auth.repOrAbove, async (req, res) => {
    const data = await lead_scores_service_1.leadScoreService.getLatest(String(req.params.leadId));
    res.json({ success: true, data });
});
// POST /lead-scores/lead/:leadId/override — manager manual override
router.post('/lead/:leadId/override', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    const data = await lead_scores_service_1.leadScoreService.override(String(req.params.leadId), String(user.id), req.body);
    res.status(201).json({ success: true, data });
});
//# sourceMappingURL=lead-scores.routes.js.map