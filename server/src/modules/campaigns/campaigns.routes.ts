import { Router } from 'express';
import { auth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { campaignsService } from './campaigns.service';

const router = Router();

router.get('/', auth.repOrAbove, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await campaignsService.list(user.organizationId);
  res.json({ success: true, data });
});

router.get('/templates', auth.repOrAbove, async (req, res) => {
  const data = await campaignsService.templates();
  res.json({ success: true, data });
});

router.post('/enroll', auth.repOrAbove, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const { leadId, campaignTemplateKey } = req.body;
  const data = await campaignsService.enroll(leadId, campaignTemplateKey, user.id);
  res.json({ success: true, data });
});

router.post('/trigger-for-status', auth.repOrAbove, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const { leadId, status } = req.body;
  const data = await campaignsService.triggerForStatus(leadId, status, user.id);
  res.json({ success: true, data });
});

router.post('/:leadId/unenroll', auth.repOrAbove, async (req, res) => {
  const { reason } = req.body;
  await campaignsService.unenroll(req.params.leadId, reason);
  res.json({ success: true, message: 'Lead unenrolled from all active campaigns' });
});

export { router as campaignsRouter };
