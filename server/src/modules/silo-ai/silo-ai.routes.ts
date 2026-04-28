import { Router, Request, Response } from 'express';
import { auth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { siloAiService } from './silo-ai.service';
import { logger } from '../../shared/utils/logger';

const router = Router();

// Phase 2: Morning Brief
router.get('/morning-brief/:repId', auth.repOrAbove, async (req: Request, res: Response) => {
  try {
    const { repId } = req.params;
    // ensure users can only see their own brief unless they are a manager
    if ((req as AuthenticatedRequest).user.id !== repId && !['MANAGER', 'ADMIN', 'OWNER', 'SALES_MANAGER'].includes((req as AuthenticatedRequest).user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const data = await siloAiService.generateMorningBrief(repId as string);
    res.json({ success: true, data });
  } catch (error: any) {
    logger.error('Silo AI morning-brief error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Phase 3: Appointment Prep
router.get('/appointment-prep/:appointmentId', auth.repOrAbove, async (req: Request, res: Response) => {
  try {
    const data = await siloAiService.generateAppointmentPrep(req.params.appointmentId as string);
    res.json({ success: true, data });
  } catch (error: any) {
    logger.error('Silo AI appointment-prep error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Phase 5: Follow Up Engine
router.get('/follow-up-engine', auth.repOrAbove, async (req: Request, res: Response) => {
  try {
    const data = await siloAiService.getFollowUpQueue((req as AuthenticatedRequest).user.id);
    res.json({ success: true, data });
  } catch (error: any) {
    logger.error('Silo AI follow-up-engine error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Phase 4: Live Assist
router.get('/live-assist', auth.repOrAbove, async (req: Request, res: Response) => {
  try {
    const data = await siloAiService.getLiveAssist(req.query.prompt as string);
    res.json({ success: true, data });
  } catch (error: any) {
    logger.error('Silo AI live-assist error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Phase 6: Proposal Analysis
router.get('/proposal-analysis/:proposalId', auth.repOrAbove, async (req: Request, res: Response) => {
  try {
    const data = await siloAiService.analyzeProposal(req.params.proposalId as string);
    res.json({ success: true, data });
  } catch (error: any) {
    logger.error('Silo AI proposal-analysis error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export { router as siloAiRouter };
