"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.siloAiRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../shared/middleware/auth");
const silo_ai_service_1 = require("./silo-ai.service");
const logger_1 = require("../../shared/utils/logger");
const router = (0, express_1.Router)();
exports.siloAiRouter = router;
// Phase 2: Morning Brief
router.get('/morning-brief/:repId', auth_1.auth.repOrAbove, async (req, res) => {
    try {
        const { repId } = req.params;
        // ensure users can only see their own brief unless they are a manager
        if (req.user.id !== repId && !['MANAGER', 'ADMIN', 'OWNER', 'SALES_MANAGER'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        const data = await silo_ai_service_1.siloAiService.generateMorningBrief(repId);
        res.json({ success: true, data });
    }
    catch (error) {
        logger_1.logger.error('Silo AI morning-brief error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// Phase 3: Appointment Prep
router.get('/appointment-prep/:appointmentId', auth_1.auth.repOrAbove, async (req, res) => {
    try {
        const data = await silo_ai_service_1.siloAiService.generateAppointmentPrep(req.params.appointmentId);
        res.json({ success: true, data });
    }
    catch (error) {
        logger_1.logger.error('Silo AI appointment-prep error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// Phase 5: Follow Up Engine
router.get('/follow-up-engine', auth_1.auth.repOrAbove, async (req, res) => {
    try {
        const data = await silo_ai_service_1.siloAiService.getFollowUpQueue(req.user.id);
        res.json({ success: true, data });
    }
    catch (error) {
        logger_1.logger.error('Silo AI follow-up-engine error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// Phase 4: Live Assist
router.get('/live-assist', auth_1.auth.repOrAbove, async (req, res) => {
    try {
        const data = await silo_ai_service_1.siloAiService.getLiveAssist(req.query.prompt);
        res.json({ success: true, data });
    }
    catch (error) {
        logger_1.logger.error('Silo AI live-assist error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// Phase 6: Proposal Analysis
router.get('/proposal-analysis/:proposalId', auth_1.auth.repOrAbove, async (req, res) => {
    try {
        const data = await silo_ai_service_1.siloAiService.analyzeProposal(req.params.proposalId);
        res.json({ success: true, data });
    }
    catch (error) {
        logger_1.logger.error('Silo AI proposal-analysis error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
//# sourceMappingURL=silo-ai.routes.js.map