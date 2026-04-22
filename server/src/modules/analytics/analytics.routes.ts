import { Router, Request, Response } from 'express';
import { auth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { analyticsService } from './analytics.service';

const router = Router();

// GET /api/v1/analytics/dashboard — aggregate dashboard stats (same as summary but named for client)
router.get('/dashboard', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const days = parseInt(req.query.days as string) || 30;
  const data = await analyticsService.getRevenueSummary(user.organizationId, days);
  res.json({ success: true, data });
});

// GET /api/v1/analytics/summary — alias used by other parts of the system
router.get('/summary', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const days = parseInt(req.query.days as string) || 30;
  const data = await analyticsService.getRevenueSummary(user.organizationId, days);
  res.json({ success: true, data });
});

// GET /api/v1/analytics/pipeline — pipeline stage breakdown
router.get('/pipeline', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const days = parseInt(req.query.days as string) || 30;
  const data = await analyticsService.getConversionFunnel(user.organizationId, days);
  res.json({ success: true, data });
});

// GET /api/v1/analytics/rep-performance
router.get('/rep-performance', auth.manager, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const days = parseInt(req.query.days as string) || 30;
  const data = await analyticsService.getRepPerformance(user.organizationId, days);
  res.json({ success: true, data });
});

// GET /api/v1/analytics/lead-sources — canonical name (was /sources)
router.get('/lead-sources', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const days = parseInt(req.query.days as string) || 30;
  const data = await analyticsService.getLeadSourceBreakdown(user.organizationId, days);
  res.json({ success: true, data });
});

// GET /api/v1/analytics/sources — kept as backward-compatible alias
router.get('/sources', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const days = parseInt(req.query.days as string) || 30;
  const data = await analyticsService.getLeadSourceBreakdown(user.organizationId, days);
  res.json({ success: true, data });
});

// GET /api/v1/analytics/revenue-trend
router.get('/revenue-trend', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const days = parseInt(req.query.days as string) || 90;
  const data = await analyticsService.getRevenueTrend(user.organizationId, days);
  res.json({ success: true, data });
});

// GET /api/v1/analytics/funnel
router.get('/funnel', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const days = parseInt(req.query.days as string) || 30;
  const data = await analyticsService.getConversionFunnel(user.organizationId, days);
  res.json({ success: true, data });
});

// GET /api/v1/analytics/map — geographic lead density / heatmap data
router.get('/map', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const days = parseInt(req.query.days as string) || 90;
  const data = await analyticsService.getMapData(user.organizationId, days);
  res.json({ success: true, data });
});

// GET /api/v1/analytics/weather-correlation — storm/weather correlation data
router.get('/weather-correlation', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const days = parseInt(req.query.days as string) || 90;
  const data = await analyticsService.getWeatherCorrelation(user.organizationId, days);
  res.json({ success: true, data });
});

// GET /api/v1/analytics/commissions
router.get('/commissions', auth.manager, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await analyticsService.getCommissions(user.organizationId);
  res.json({ success: true, data });
});

// GET /api/v1/analytics/installed-leads
router.get('/installed-leads', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const limit = parseInt(req.query.limit as string) || 60;
  const data = await analyticsService.getInstalledLeads(user.organizationId, limit);
  res.json({ success: true, data });
});

export { router as analyticsRouter };
