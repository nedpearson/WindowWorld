"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaignsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../shared/middleware/auth");
const campaigns_service_1 = require("./campaigns.service");
const router = (0, express_1.Router)();
exports.campaignsRouter = router;
router.get('/', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const data = await campaigns_service_1.campaignsService.list(user.organizationId);
    res.json({ success: true, data });
});
router.get('/templates', auth_1.auth.repOrAbove, async (req, res) => {
    const data = await campaigns_service_1.campaignsService.templates();
    res.json({ success: true, data });
});
router.post('/enroll', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const { leadId, campaignTemplateKey } = req.body;
    const data = await campaigns_service_1.campaignsService.enroll(leadId, campaignTemplateKey, user.id);
    res.json({ success: true, data });
});
router.post('/trigger-for-status', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const { leadId, status } = req.body;
    const data = await campaigns_service_1.campaignsService.triggerForStatus(leadId, status, user.id);
    res.json({ success: true, data });
});
router.post('/:leadId/unenroll', auth_1.auth.repOrAbove, async (req, res) => {
    const { reason } = req.body;
    await campaigns_service_1.campaignsService.unenroll(req.params.leadId, reason);
    res.json({ success: true, message: 'Lead unenrolled from all active campaigns' });
});
router.post('/deploy-playbook', auth_1.auth.repOrAbove, async (req, res) => {
    const user = req.user;
    const { playbookId, config } = req.body;
    const data = await campaigns_service_1.campaignsService.deployPlaybook(playbookId, config, user.id);
    res.json({ success: true, data });
});
//# sourceMappingURL=campaigns.routes.js.map