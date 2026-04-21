import { Router, Request, Response } from 'express';
import { auth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { analyticsService } from './analytics.service';

const router = Router();

router.get('/summary', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const days = parseInt(req.query.days as string) || 30;
  const data = await analyticsService.getRevenueSummary(user.organizationId, days);
  res.json({ success: true, data });
});

router.get('/rep-performance', auth.manager, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const days = parseInt(req.query.days as string) || 30;
  const data = await analyticsService.getRepPerformance(user.organizationId, days);
  res.json({ success: true, data });
});

router.get('/sources', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const days = parseInt(req.query.days as string) || 30;
  const data = await analyticsService.getLeadSourceBreakdown(user.organizationId, days);
  res.json({ success: true, data });
});

router.get('/revenue-trend', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const days = parseInt(req.query.days as string) || 90;
  const data = await analyticsService.getRevenueTrend(user.organizationId, days);
  res.json({ success: true, data });
});

router.get('/funnel', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const days = parseInt(req.query.days as string) || 30;
  const data = await analyticsService.getConversionFunnel(user.organizationId, days);
  res.json({ success: true, data });
});

router.get('/commissions', auth.manager, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await analyticsService.getCommissions(user.organizationId);
  res.json({ success: true, data });
});

router.get('/installed-leads', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const limit = parseInt(req.query.limit as string) || 60;
  const data = await analyticsService.getInstalledLeads(user.organizationId, limit);
  res.json({ success: true, data });
});

export { router as analyticsRouter };
