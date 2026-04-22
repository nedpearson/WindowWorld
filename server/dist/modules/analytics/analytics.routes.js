"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../shared/middleware/auth");
const analytics_service_1 = require("./analytics.service");
const router = (0, express_1.Router)();
exports.analyticsRouter = router;
// GET /api/v1/analytics/dashboard — aggregate dashboard stats (same as summary but named for client)
router.get('/dashboard', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const days = parseInt(req.query.days) || 30;
    const data = await analytics_service_1.analyticsService.getRevenueSummary(user.organizationId, days);
    res.json({ success: true, data });
});
// GET /api/v1/analytics/summary — alias used by other parts of the system
router.get('/summary', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const days = parseInt(req.query.days) || 30;
    const data = await analytics_service_1.analyticsService.getRevenueSummary(user.organizationId, days);
    res.json({ success: true, data });
});
// GET /api/v1/analytics/pipeline — pipeline stage breakdown
router.get('/pipeline', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const days = parseInt(req.query.days) || 30;
    const data = await analytics_service_1.analyticsService.getConversionFunnel(user.organizationId, days);
    res.json({ success: true, data });
});
// GET /api/v1/analytics/rep-performance
router.get('/rep-performance', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    const days = parseInt(req.query.days) || 30;
    const data = await analytics_service_1.analyticsService.getRepPerformance(user.organizationId, days);
    res.json({ success: true, data });
});
// GET /api/v1/analytics/lead-sources — canonical name (was /sources)
router.get('/lead-sources', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const days = parseInt(req.query.days) || 30;
    const data = await analytics_service_1.analyticsService.getLeadSourceBreakdown(user.organizationId, days);
    res.json({ success: true, data });
});
// GET /api/v1/analytics/sources — kept as backward-compatible alias
router.get('/sources', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const days = parseInt(req.query.days) || 30;
    const data = await analytics_service_1.analyticsService.getLeadSourceBreakdown(user.organizationId, days);
    res.json({ success: true, data });
});
// GET /api/v1/analytics/revenue-trend
router.get('/revenue-trend', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const days = parseInt(req.query.days) || 90;
    const data = await analytics_service_1.analyticsService.getRevenueTrend(user.organizationId, days);
    res.json({ success: true, data });
});
// GET /api/v1/analytics/funnel
router.get('/funnel', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const days = parseInt(req.query.days) || 30;
    const data = await analytics_service_1.analyticsService.getConversionFunnel(user.organizationId, days);
    res.json({ success: true, data });
});
// GET /api/v1/analytics/map — geographic lead density / heatmap data
router.get('/map', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const days = parseInt(req.query.days) || 90;
    const data = await analytics_service_1.analyticsService.getMapData(user.organizationId, days);
    res.json({ success: true, data });
});
// GET /api/v1/analytics/weather-correlation — storm/weather correlation data
router.get('/weather-correlation', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const days = parseInt(req.query.days) || 90;
    const data = await analytics_service_1.analyticsService.getWeatherCorrelation(user.organizationId, days);
    res.json({ success: true, data });
});
// GET /api/v1/analytics/commissions
router.get('/commissions', auth_1.auth.manager, async (req, res) => {
    const user = req.user;
    const data = await analytics_service_1.analyticsService.getCommissions(user.organizationId);
    res.json({ success: true, data });
});
// GET /api/v1/analytics/installed-leads
router.get('/installed-leads', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const limit = parseInt(req.query.limit) || 60;
    const data = await analytics_service_1.analyticsService.getInstalledLeads(user.organizationId, limit);
    res.json({ success: true, data });
});
//# sourceMappingURL=analytics.routes.js.map