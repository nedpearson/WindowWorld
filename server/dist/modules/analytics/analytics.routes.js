"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../shared/middleware/auth");
const analytics_service_1 = require("./analytics.service");
const router = (0, express_1.Router)();
exports.analyticsRouter = router;
router.get('/summary', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const days = parseInt(req.query.days) || 30;
    const data = await analytics_service_1.analyticsService.getRevenueSummary(user.organizationId, days);
    res.json({ success: true, data });
});
router.get('/rep-performance', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    const days = parseInt(req.query.days) || 30;
    const data = await analytics_service_1.analyticsService.getRepPerformance(user.organizationId, days);
    res.json({ success: true, data });
});
router.get('/sources', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const days = parseInt(req.query.days) || 30;
    const data = await analytics_service_1.analyticsService.getLeadSourceBreakdown(user.organizationId, days);
    res.json({ success: true, data });
});
router.get('/revenue-trend', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const days = parseInt(req.query.days) || 90;
    const data = await analytics_service_1.analyticsService.getRevenueTrend(user.organizationId, days);
    res.json({ success: true, data });
});
router.get('/funnel', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const days = parseInt(req.query.days) || 30;
    const data = await analytics_service_1.analyticsService.getConversionFunnel(user.organizationId, days);
    res.json({ success: true, data });
});
//# sourceMappingURL=analytics.routes.js.map