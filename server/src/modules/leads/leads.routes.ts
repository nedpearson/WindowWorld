import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { auth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { leadService } from './leads.service';
import { ValidationError, NotFoundError } from '../../shared/middleware/errorHandler';

const router = Router();

function validate(req: Request) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const map: Record<string, string[]> = {};
    errors.array().forEach((e: any) => {
      if (!map[e.path]) map[e.path] = [];
      map[e.path].push(e.msg);
    });
    throw new ValidationError('Validation failed', map);
  }
}

// GET /api/v1/leads
router.get('/', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const {
    page = '1', limit = '25', status, search, parish, zip,
    assignedRepId, territoryId, isStormLead, minScore, maxScore,
    source, sortBy = 'createdAt', sortDir = 'desc',
  } = req.query as Record<string, string>;

  const result = await leadService.list({
    organizationId: user.organizationId,
    page: parseInt(page),
    limit: Math.min(parseInt(limit), 100),
    status: status as any,
    search,
    parish,
    zip,
    assignedRepId,
    territoryId,
    isStormLead: isStormLead === 'true',
    minScore: minScore ? parseInt(minScore) : undefined,
    maxScore: maxScore ? parseInt(maxScore) : undefined,
    source,
    sortBy,
    sortDir: sortDir as 'asc' | 'desc',
    // Reps only see their own leads unless manager+
    restrictToRepId: ['SALES_REP', 'FIELD_MEASURE_TECH'].includes(user.role)
      ? user.id
      : undefined,
  });

  res.json({ success: true, ...result });
});

// GET /api/v1/leads/map â€” statewide lead map data
router.get('/map', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { parish, zip, status, isStormLead } = req.query as Record<string, string>;

  const data = await leadService.getMapData({
    organizationId: user.organizationId,
    parish,
    zip,
    status: status as any,
    isStormLead: isStormLead === 'true',
  });

  res.json({ success: true, data });
});

// GET /api/v1/leads/best-today â€” AI-prioritized leads for today
router.get('/best-today', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await leadService.getBestLeadsToday({
    organizationId: user.organizationId,
    repId: user.id,
  });
  res.json({ success: true, data });
});

// GET /api/v1/leads/storm-follow-up â€” storm opportunity leads
router.get('/storm-follow-up', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await leadService.getStormFollowUpLeads({
    organizationId: user.organizationId,
  });
  res.json({ success: true, data });
});

// GET /api/v1/leads/pipeline â€” kanban stage view
router.get('/pipeline', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { repId } = req.query as Record<string, string>;

  const data = await leadService.getPipelineView({
    organizationId: user.organizationId,
    repId: ['SALES_REP', 'FIELD_MEASURE_TECH'].includes(user.role) ? user.id : repId,
  });
  res.json({ success: true, data });
});

// GET /api/v1/leads/:id
router.get('/:id', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const lead = await leadService.getById((req.params.id as string), user.organizationId);
  res.json({ success: true, data: lead });
});

// POST /api/v1/leads
router.post(
  '/',
  auth.repOrAbove,
  [
    body('firstName').optional().isString(),
    body('lastName').optional().isString(),
    body('email').optional().isEmail(),
    body('phone').optional().isString(),
    body('address').optional().isString(),
    body('city').optional().isString(),
    body('zip').optional().isString(),
    body('parish').optional().isString(),
    body('source').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    validate(req);
    const user = (req as AuthenticatedRequest).user;

    const lead = await leadService.create({
      ...req.body,
      organizationId: user.organizationId,
      assignedRepId: req.body.assignedRepId || user.id,
      createdById: user.id,
    });

    res.status(201).json({ success: true, data: lead });
  }
);

// PATCH /api/v1/leads/:id
router.patch('/:id', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const lead = await leadService.update((req.params.id as string), user.organizationId, req.body, user.id);
  res.json({ success: true, data: lead });
});

// PATCH /api/v1/leads/:id/status
router.patch(
  '/:id/status',
  auth.repOrAbove,
  [body('status').isString().notEmpty()],
  async (req: Request, res: Response) => {
    validate(req);
    const user = (req as AuthenticatedRequest).user;
    const lead = await leadService.updateStatus(
      (req.params.id as string),
      user.organizationId,
      req.body.status,
      req.body.reason,
      user.id
    );
    res.json({ success: true, data: lead });
  }
);

// PATCH /api/v1/leads/:id/assign
router.patch('/:id/assign', auth.manager, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const lead = await leadService.assign(
    (req.params.id as string),
    user.organizationId,
    req.body.repId,
    user.id
  );
  res.json({ success: true, data: lead });
});

// POST /api/v1/leads/:id/duplicate-check
router.post('/:id/duplicate-check', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const duplicates = await leadService.checkForDuplicates((req.params.id as string), user.organizationId);
  res.json({ success: true, data: duplicates });
});

// GET /api/v1/leads/:id/activities
router.get('/:id/activities', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const activities = await leadService.getActivities((req.params.id as string), user.organizationId);
  res.json({ success: true, data: activities });
});

// POST /api/v1/leads/:id/activities
router.post('/:id/activities', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const activity = await leadService.logActivity({
    leadId: (req.params.id as string),
    organizationId: user.organizationId,
    userId: user.id,
    ...req.body,
  });
  res.status(201).json({ success: true, data: activity });
});

// GET /api/v1/leads/:id/notes
router.get('/:id/notes', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const notes = await leadService.getNotes((req.params.id as string), user.organizationId);
  res.json({ success: true, data: notes });
});

// POST /api/v1/leads/:id/notes
router.post('/:id/notes', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const note = await leadService.addNote({
    leadId: (req.params.id as string),
    organizationId: user.organizationId,
    authorId: user.id,
    content: req.body.content,
    isInternal: req.body.isInternal ?? false,
    isPinned: req.body.isPinned ?? false,
  });
  res.status(201).json({ success: true, data: note });
});

// GET /api/v1/leads/:id/ai-summary â€” AI-generated lead summary + pitch
router.get('/:id/ai-summary', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const summary = await leadService.getAiSummary((req.params.id as string), user.organizationId);
  res.json({ success: true, data: summary });
});

// DELETE /api/v1/leads/:id
router.delete('/:id', auth.manager, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  await leadService.softDelete((req.params.id as string), user.organizationId, user.id);
  res.json({ success: true, message: 'Lead deleted' });
});

// POST /api/v1/leads/bulk-import — CSV/JSON bulk lead import (manager only)
router.post('/bulk-import', auth.manager, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { leads: rawLeads } = req.body;

  if (!Array.isArray(rawLeads) || rawLeads.length === 0) {
    return res.status(400).json({ success: false, error: { message: 'leads must be a non-empty array' } });
  }
  if (rawLeads.length > 500) {
    return res.status(413).json({ success: false, error: { message: 'Maximum 500 leads per import batch' } });
  }

  const results: { success: string[]; skipped: { row: number; reason: string }[]; failed: { row: number; reason: string }[] } = {
    success: [],
    skipped: [],
    failed: [],
  };

  for (let i = 0; i < rawLeads.length; i++) {
    const row = rawLeads[i];

    // At minimum we need some identifying info
    if (!row.firstName && !row.lastName && !row.phone && !row.email && !row.address) {
      results.failed.push({ row: i + 1, reason: 'Row has no usable data (need firstName, lastName, phone, email, or address)' });
      continue;
    }

    try {
      // Basic dedup: skip if a lead with same phone or email already exists in this org
      if (row.phone || row.email) {
        const { prisma: db } = await import('../../shared/services/prisma');
        const existing = await db.lead.findFirst({
          where: {
            organizationId: user.organizationId,
            OR: [
              ...(row.phone ? [{ phone: row.phone }] : []),
              ...(row.email ? [{ email: row.email }] : []),
            ],
          },
        });
        if (existing) {
          results.skipped.push({ row: i + 1, reason: `Duplicate: lead with this phone/email already exists (id: ${existing.id})` });
          continue;
        }
      }

      const lead = await leadService.create({
        firstName: row.firstName || '',
        lastName: row.lastName || '',
        email: row.email,
        phone: row.phone,
        address: row.address,
        city: row.city,
        state: row.state || 'LA',
        zip: row.zip,
        parish: row.parish,
        source: row.source || 'CSV_IMPORT',
        notes: row.notes,
        organizationId: user.organizationId,
        assignedRepId: row.assignedRepId || user.id,
        createdById: user.id,
      });

      results.success.push(lead.id);
    } catch (err: any) {
      results.failed.push({ row: i + 1, reason: err.message });
    }
  }

  res.status(207).json({
    success: true,
    data: {
      imported: results.success.length,
      skipped: results.skipped.length,
      failed: results.failed.length,
      details: results,
    },
  });
});

export { router as leadsRouter };
