import { Router, Request, Response } from 'express';
import { auth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { analyticsService } from './analytics.service';

const router = Router();

router.get('/dashboard', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const repId = ['SALES_REP', 'FIELD_MEASURE_TECH'].includes(user.role)
    ? user.id
    : (req.query.repId as string);
  const data = await analyticsService.getDashboard(user.organizationId, repId);
  res.json({ success: true, data });
});

router.get('/rep-performance', auth.manager, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const period = (req.query.period as 'week' | 'month' | 'quarter') || 'month';
  const data = await analyticsService.getRepPerformance(user.organizationId, period);
  res.json({ success: true, data });
});

router.get('/revenue', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const months = parseInt(req.query.months as string) || 6;
  const data = await analyticsService.getRevenueChart(user.organizationId, months);
  res.json({ success: true, data });
});

router.get('/parish-leaderboard', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await analyticsService.getParishLeaderboard(user.organizationId);
  res.json({ success: true, data });
});

router.get('/pipeline-aging', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await analyticsService.getPipelineAging(user.organizationId);
  res.json({ success: true, data });
});

export { router as analyticsRouter };
