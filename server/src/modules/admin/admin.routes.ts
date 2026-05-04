import { Router, Request, Response } from 'express';
import { auth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { usersService } from '../users/users.service';
import { prisma } from '../../shared/services/prisma';
import { logger } from '../../shared/utils/logger';

const router = Router();

// ─── Users ────────────────────────────────────────────────────

/** GET /api/v1/admin/users — list all users in the org */
router.get('/users', auth.adminOnly, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { role, search, isActive } = req.query;
  const data = await usersService.list(user.organizationId, {
    role: role as any,
    search: search as string,
    isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
  });
  res.json({ success: true, data });
});

/** POST /api/v1/admin/users — create a new user */
router.post('/users', auth.adminOnly, async (req: Request, res: Response) => {
  const actor = (req as AuthenticatedRequest).user;
  const data = await usersService.create(
    { ...req.body, organizationId: actor.organizationId },
    actor.id
  );
  res.status(201).json({ success: true, data });
});

/** PATCH /api/v1/admin/users/:id — update user details / role */
router.patch('/users/:id', auth.adminOnly, async (req: Request, res: Response) => {
  const actor = (req as AuthenticatedRequest).user;
  const data = await usersService.update(req.params.id as string, actor.organizationId, req.body, actor.id);
  res.json({ success: true, data });
});

/** POST /api/v1/admin/users/:id/deactivate */
router.post('/users/:id/deactivate', auth.adminOnly, async (req: Request, res: Response) => {
  const actor = (req as AuthenticatedRequest).user;
  await usersService.deactivate(req.params.id as string, actor.organizationId, actor.id);
  res.json({ success: true, message: 'User deactivated' });
});

/** POST /api/v1/admin/users/:id/reactivate */
router.post('/users/:id/reactivate', auth.adminOnly, async (req: Request, res: Response) => {
  const actor = (req as AuthenticatedRequest).user;
  const data = await usersService.update(req.params.id as string, actor.organizationId, { isActive: true }, actor.id);
  res.json({ success: true, data });
});

// ─── Audit Log ────────────────────────────────────────────────

/** GET /api/v1/admin/audit-log — paginated audit log */
router.get('/audit-log', auth.adminOnly, async (req: Request, res: Response) => {
  const { entityType, entityId, userId, limit = '50', offset = '0' } = req.query;
  const where: any = {};
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (userId) where.userId = userId;

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({ success: true, data: items, total, limit: parseInt(limit as string), offset: parseInt(offset as string) });
});

// ─── Leaderboard ──────────────────────────────────────────────

/** GET /api/v1/admin/leaderboard */
router.get('/leaderboard', auth.repOrAbove, async (req: Request, res: Response) => {
  const actor = (req as AuthenticatedRequest).user;
  const { period } = req.query;
  const data = await usersService.getLeaderboard(actor.organizationId, period as any);
  res.json({ success: true, data });
});

// ─── Org Stats ────────────────────────────────────────────────

/** GET /api/v1/admin/stats — org-wide summary stats */
router.get('/stats', auth.adminOnly, async (req: Request, res: Response) => {
  const actor = (req as AuthenticatedRequest).user;
  const orgId = actor.organizationId;

  const [
    totalLeads, activeLeads, totalProposals, sentProposals,
    totalInvoices, paidInvoices, activeUsers, totalRevenue
  ] = await Promise.all([
    prisma.lead.count({ where: { organizationId: orgId } }),
    prisma.lead.count({ where: { organizationId: orgId, status: { notIn: ['LOST', 'INSTALLED', 'PAID'] } } }),
    prisma.proposal.count({ where: { lead: { organizationId: orgId } } }),
    prisma.proposal.count({ where: { lead: { organizationId: orgId }, status: { in: ['SENT', 'VIEWED', 'ACCEPTED'] } } }),
    prisma.invoice.count({ where: { lead: { organizationId: orgId } } as any }),
    prisma.invoice.count({ where: { lead: { organizationId: orgId }, status: 'PAID' } as any }),
    prisma.user.count({ where: { organizationId: orgId, isActive: true } }),
    prisma.invoice.aggregate({
      where: { lead: { organizationId: orgId }, status: 'PAID' } as any,
      _sum: { total: true } as any,
    }),
  ]);

  res.json({
    success: true,
    data: {
      totalLeads, activeLeads,
      totalProposals, sentProposals,
      totalInvoices, paidInvoices,
      activeUsers,
      totalRevenue: (totalRevenue._sum?.total) || 0,
    },
  });
});

// ─── Settings ────────────────────────────────────────────────

/** GET /api/v1/admin/settings */
router.get('/settings', auth.adminOnly, async (req: Request, res: Response) => {
  const actor = (req as AuthenticatedRequest).user;
  const org = await prisma.organization.findUnique({
    where: { id: actor.organizationId },
    select: { id: true, name: true, slug: true, logoUrl: true, brandColor: true, createdAt: true },
  });
  res.json({ success: true, data: org });
});

/** PATCH /api/v1/admin/settings */
router.patch('/settings', auth.adminOnly, async (req: Request, res: Response) => {
  const actor = (req as AuthenticatedRequest).user;
  const { name, logoUrl, brandColor } = req.body;
  const org = await prisma.organization.update({
    where: { id: actor.organizationId },
    data: { name, logoUrl, brandColor },
  });
  res.json({ success: true, data: org });
});

/** GET /api/v1/admin/sync-status */
router.get('/sync-status', auth.adminOnly, async (_req: Request, res: Response) => {
  res.json({ success: true, data: { status: 'ok', lastSync: new Date().toISOString() } });
});

/** GET /api/v1/admin/job-status */
router.get('/job-status', auth.adminOnly, async (_req: Request, res: Response) => {
  res.json({ success: true, data: { queues: [], redisConnected: !!process.env.REDIS_URL } });
});

/** GET /api/v1/admin/health */
router.get('/health', auth.adminOnly, async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, data: { status: 'ok', db: 'connected', uptime: Math.round(process.uptime()) } });
  } catch {
    res.status(503).json({ success: false, data: { status: 'error', db: 'unreachable' } });
  }
});

/**
 * POST /api/v1/admin/seed-owner-leads
 * Seeds 15 realistic Louisiana homeowner leads with full property/contact data
 * into the calling SUPER_ADMIN's organization. Safe to call multiple times (idempotent).
 */
router.post('/seed-owner-leads', auth.superAdmin, async (req: Request, res: Response) => {
  const actor = (req as AuthenticatedRequest).user;
  const orgId = actor.organizationId;

  const REAL_LEADS = [
    { firstName: 'Robert',   lastName: 'Comeaux',    email: 'robert.comeaux@gmail.com',     phone: '(225) 784-3201', address: '4521 Greenwell Springs Rd', city: 'Baton Rouge',    state: 'Louisiana', zip: '70806', parish: 'East Baton Rouge', lat: 30.4821, lng: -91.1103, status: 'APPOINTMENT_SET', source: 'door-knock',         leadScore: 78, urgencyScore: 72, isStormLead: false, estimatedRevenue: 6500,  yearBuilt: 1978, sqft: 1850, stories: 1, windowCount: 9,  windowCond: 'FAIR',    openings: [{ room: 'Living Room',   type: 'DOUBLE_HUNG' }, { room: 'Kitchen',       type: 'SINGLE_HUNG' }, { room: 'Master Bed',  type: 'DOUBLE_HUNG' }, { room: 'Bed 2',    type: 'DOUBLE_HUNG' }, { room: 'Den',        type: 'PICTURE'     }] },
    { firstName: 'Patricia', lastName: 'Landry',     email: 'patricia.landry@yahoo.com',    phone: '(225) 663-4891', address: '312 Sherwood Forest Blvd',  city: 'Baton Rouge',    state: 'Louisiana', zip: '70815', parish: 'East Baton Rouge', lat: 30.4442, lng: -91.0892, status: 'PROPOSAL_SENT',   source: 'referral',           leadScore: 85, urgencyScore: 68, isStormLead: false, estimatedRevenue: 9200,  yearBuilt: 1985, sqft: 2100, stories: 1, windowCount: 11, windowCond: 'POOR',    openings: [{ room: 'Front Room',    type: 'DOUBLE_HUNG' }, { room: 'Dining Room',   type: 'PICTURE'     }, { room: 'Master Bed',  type: 'DOUBLE_HUNG' }, { room: 'Bed 2',    type: 'DOUBLE_HUNG' }, { room: 'Kitchen',    type: 'SINGLE_HUNG' }] },
    { firstName: 'Michael',  lastName: 'Trosclair',  email: 'mtrosclair@hotmail.com',       phone: '(225) 921-5512', address: '7824 Old Hammond Hwy',       city: 'Baton Rouge',    state: 'Louisiana', zip: '70809', parish: 'East Baton Rouge', lat: 30.4156, lng: -91.0634, status: 'VERBAL_COMMIT',   source: 'web',                leadScore: 91, urgencyScore: 88, isStormLead: true,  estimatedRevenue: 14800, yearBuilt: 1992, sqft: 2800, stories: 2, windowCount: 14, windowCond: 'POOR',    openings: [{ room: 'Great Room',    type: 'PICTURE'     }, { room: 'Kitchen',       type: 'DOUBLE_HUNG' }, { room: 'Master Bed',  type: 'CASEMENT'   }, { room: 'Bed 2',    type: 'DOUBLE_HUNG' }, { room: 'Study',      type: 'PICTURE'     }] },
    { firstName: 'Susan',    lastName: 'Bourgeois',  email: 'sbourgeois@att.net',           phone: '(225) 772-8034', address: '2207 Jefferson Hwy',          city: 'Baton Rouge',    state: 'Louisiana', zip: '70809', parish: 'East Baton Rouge', lat: 30.4058, lng: -91.1341, status: 'NEW_LEAD',        source: 'storm-list',         leadScore: 62, urgencyScore: 81, isStormLead: true,  estimatedRevenue: 4200,  yearBuilt: 1968, sqft: 1450, stories: 1, windowCount: 8,  windowCond: 'CRITICAL', openings: [{ room: 'Living Room',   type: 'DOUBLE_HUNG' }, { room: 'Kitchen',       type: 'SINGLE_HUNG' }, { room: 'Bedroom',     type: 'DOUBLE_HUNG' }, { room: 'Bathroom', type: 'SINGLE_HUNG' }] },
    { firstName: 'James',    lastName: 'Hebert',     email: 'jhebert1959@gmail.com',        phone: '(225) 348-6677', address: '5316 Perkins Rd',             city: 'Baton Rouge',    state: 'Louisiana', zip: '70808', parish: 'East Baton Rouge', lat: 30.3912, lng: -91.1045, status: 'SOLD',            source: 'referral',           leadScore: 95, urgencyScore: 92, isStormLead: false, estimatedRevenue: 11600, yearBuilt: 2001, sqft: 2450, stories: 2, windowCount: 12, windowCond: 'FAIR',    openings: [{ room: 'Family Room',   type: 'CASEMENT'    }, { room: 'Kitchen',       type: 'DOUBLE_HUNG' }, { room: 'Master Bed',  type: 'CASEMENT'   }, { room: 'Bed 2',    type: 'DOUBLE_HUNG' }, { room: 'Office',     type: 'PICTURE'     }] },
    { firstName: 'Karen',    lastName: 'Guidry',     email: 'karen.guidry@cox.net',         phone: '(225) 664-2290', address: '1134 Range Ave',              city: 'Denham Springs', state: 'Louisiana', zip: '70726', parish: 'Livingston',       lat: 30.4875, lng: -90.9427, status: 'INSPECTION_COMPLETE', source: 'neighborhood-canvass', leadScore: 74, urgencyScore: 69, isStormLead: true,  estimatedRevenue: 7800,  yearBuilt: 1988, sqft: 1980, stories: 1, windowCount: 10, windowCond: 'POOR',    openings: [{ room: 'Living Room',   type: 'DOUBLE_HUNG' }, { room: 'Master Bed',    type: 'DOUBLE_HUNG' }, { room: 'Bed 2',       type: 'DOUBLE_HUNG' }, { room: 'Kitchen',  type: 'SINGLE_HUNG' }, { room: 'Sunroom',    type: 'CASEMENT'    }] },
    { firstName: 'David',    lastName: 'Trahan',     email: 'dtrahan@bellsouth.net',        phone: '(225) 555-3342', address: '8843 Burgess Ave',            city: 'Denham Springs', state: 'Louisiana', zip: '70726', parish: 'Livingston',       lat: 30.5012, lng: -90.9612, status: 'FOLLOW_UP',       source: 'web',                leadScore: 58, urgencyScore: 45, isStormLead: false, estimatedRevenue: 3600,  yearBuilt: 1975, sqft: 1320, stories: 1, windowCount: 7,  windowCond: 'FAIR',    openings: [{ room: 'Living Room',   type: 'DOUBLE_HUNG' }, { room: 'Kitchen',       type: 'SINGLE_HUNG' }, { room: 'Master Bed',  type: 'DOUBLE_HUNG' }] },
    { firstName: 'Angela',   lastName: 'Mouton',     email: 'amouton@gmail.com',            phone: '(225) 442-8814', address: '226 Tupelo Dr',               city: 'Prairieville',   state: 'Louisiana', zip: '70769', parish: 'Ascension',        lat: 30.2998, lng: -90.9871, status: 'MEASURING_COMPLETE', source: 'referral',           leadScore: 82, urgencyScore: 75, isStormLead: false, estimatedRevenue: 8900,  yearBuilt: 2005, sqft: 2250, stories: 2, windowCount: 11, windowCond: 'GOOD',    openings: [{ room: 'Great Room',    type: 'PICTURE'     }, { room: 'Kitchen',       type: 'DOUBLE_HUNG' }, { room: 'Master Bed',  type: 'CASEMENT'   }, { room: 'Bed 2',    type: 'DOUBLE_HUNG' }, { room: 'Loft',       type: 'DOUBLE_HUNG' }] },
    { firstName: 'Brett',    lastName: 'Fontenot',   email: 'bfontenot@yahoo.com',          phone: '(337) 658-1102', address: '4412 Johnston St',            city: 'Lafayette',      state: 'Louisiana', zip: '70503', parish: 'Lafayette',        lat: 30.2073, lng: -92.0513, status: 'CONTACTED',       source: 'web',                leadScore: 65, urgencyScore: 55, isStormLead: false, estimatedRevenue: 5200,  yearBuilt: 1993, sqft: 1750, stories: 1, windowCount: 9,  windowCond: 'FAIR',    openings: [{ room: 'Living Room',   type: 'DOUBLE_HUNG' }, { room: 'Kitchen',       type: 'SINGLE_HUNG' }, { room: 'Master Bed',  type: 'DOUBLE_HUNG' }, { room: 'Den',      type: 'PICTURE'     }] },
    { firstName: 'Louis',    lastName: 'Badeaux',    email: 'lbadeaux@cox.net',             phone: '(504) 883-6221', address: '3312 Severn Ave',             city: 'Metairie',       state: 'Louisiana', zip: '70002', parish: 'Jefferson',        lat: 29.9975, lng: -90.1612, status: 'ATTEMPTING_CONTACT', source: 'storm-list',         leadScore: 77, urgencyScore: 82, isStormLead: true,  estimatedRevenue: 6800,  yearBuilt: 1972, sqft: 1620, stories: 1, windowCount: 9,  windowCond: 'POOR',    openings: [{ room: 'Living Room',   type: 'DOUBLE_HUNG' }, { room: 'Kitchen',       type: 'SINGLE_HUNG' }, { room: 'Bed 1',       type: 'DOUBLE_HUNG' }, { room: 'Bed 2',    type: 'DOUBLE_HUNG' }] },
    { firstName: 'Carol',    lastName: 'Chauvin',    email: 'carolchauvin@gmail.com',       phone: '(985) 641-7755', address: '1245 Gause Blvd',             city: 'Slidell',        state: 'Louisiana', zip: '70458', parish: 'St. Tammany',      lat: 30.2743, lng: -89.7813, status: 'QUALIFIED',       source: 'referral',           leadScore: 80, urgencyScore: 62, isStormLead: false, estimatedRevenue: 7400,  yearBuilt: 1999, sqft: 2060, stories: 2, windowCount: 11, windowCond: 'FAIR',    openings: [{ room: 'Living Room',   type: 'DOUBLE_HUNG' }, { room: 'Dining Room',   type: 'PICTURE'     }, { room: 'Master Bed',  type: 'CASEMENT'   }, { room: 'Bed 2',    type: 'DOUBLE_HUNG' }, { room: 'Flex Room',  type: 'DOUBLE_HUNG' }] },
    { firstName: 'Monique',  lastName: 'Robichaux',  email: 'mrobichaux@cox.net',           phone: '(225) 774-3389', address: '4319 Sullivan Rd',            city: 'Central',        state: 'Louisiana', zip: '70818', parish: 'East Baton Rouge', lat: 30.5431, lng: -91.0821, status: 'PAID',            source: 'referral',           leadScore: 88, urgencyScore: 80, isStormLead: false, estimatedRevenue: 10400, yearBuilt: 2008, sqft: 2600, stories: 2, windowCount: 13, windowCond: 'GOOD',    openings: [{ room: 'Great Room',    type: 'CASEMENT'    }, { room: 'Kitchen',       type: 'DOUBLE_HUNG' }, { room: 'Master Bed',  type: 'CASEMENT'   }, { room: 'Bed 2',    type: 'DOUBLE_HUNG' }, { room: 'Study',      type: 'PICTURE'     }] },
    { firstName: 'Dale',     lastName: 'Acosta',     email: 'dacosta@gmail.com',            phone: '(225) 529-1187', address: '2101 S Purpera Ave',          city: 'Gonzales',       state: 'Louisiana', zip: '70737', parish: 'Ascension',        lat: 30.2343, lng: -90.9211, status: 'NEW_LEAD',        source: 'web',                leadScore: 55, urgencyScore: 48, isStormLead: false, estimatedRevenue: 4100,  yearBuilt: 1982, sqft: 1540, stories: 1, windowCount: 8,  windowCond: 'FAIR',    openings: [{ room: 'Living Room',   type: 'DOUBLE_HUNG' }, { room: 'Kitchen',       type: 'SINGLE_HUNG' }, { room: 'Master Bed',  type: 'DOUBLE_HUNG' }, { room: 'Bed 2',    type: 'DOUBLE_HUNG' }] },
    { firstName: 'Linda',    lastName: 'Thibodaux',  email: 'lthibodaux@bellsouth.net',     phone: '(225) 839-4403', address: '618 Live Oak Blvd',           city: 'Zachary',        state: 'Louisiana', zip: '70791', parish: 'East Baton Rouge', lat: 30.6588, lng: -91.1501, status: 'CONTACTED',       source: 'door-knock',         leadScore: 67, urgencyScore: 58, isStormLead: false, estimatedRevenue: 5800,  yearBuilt: 1996, sqft: 1890, stories: 1, windowCount: 10, windowCond: 'FAIR',    openings: [{ room: 'Family Room',   type: 'DOUBLE_HUNG' }, { room: 'Kitchen',       type: 'SINGLE_HUNG' }, { room: 'Master Bed',  type: 'DOUBLE_HUNG' }, { room: 'Bed 2',    type: 'DOUBLE_HUNG' }, { room: 'Laundry',    type: 'SINGLE_HUNG' }] },
    { firstName: 'Harold',   lastName: 'Blanchard',  email: 'hblanchard@gmail.com',        phone: '(985) 872-3314', address: '334 N Morrison Blvd',         city: 'Hammond',        state: 'Louisiana', zip: '70401', parish: 'Tangipahoa',       lat: 30.5047, lng: -90.4651, status: 'NEW_LEAD',        source: 'storm-list',         leadScore: 71, urgencyScore: 76, isStormLead: true,  estimatedRevenue: 6200,  yearBuilt: 1969, sqft: 1720, stories: 1, windowCount: 9,  windowCond: 'POOR',    openings: [{ room: 'Living Room',   type: 'DOUBLE_HUNG' }, { room: 'Kitchen',       type: 'SINGLE_HUNG' }, { room: 'Master Bed',  type: 'DOUBLE_HUNG' }, { room: 'Bed 2',    type: 'DOUBLE_HUNG' }, { room: 'Den',        type: 'PICTURE'     }] },
    { firstName: 'Wayne',    lastName: 'Broussard',  email: 'wbroussard@cox.net',          phone: '(225) 412-8891', address: '1823 Lobdell Ave',            city: 'Baton Rouge',    state: 'Louisiana', zip: '70806', parish: 'East Baton Rouge', lat: 30.4634, lng: -91.1512, status: 'NEW_LEAD',        source: 'web',                leadScore: 92, urgencyScore: 85, isStormLead: true,  estimatedRevenue: 13200, yearBuilt: 1981, sqft: 2100, stories: 1, windowCount: 11, windowCond: 'POOR',    openings: [{ room: 'Living Room', type: 'DOUBLE_HUNG' }, { room: 'Kitchen', type: 'SINGLE_HUNG' }, { room: 'Master Bed', type: 'DOUBLE_HUNG' }, { room: 'Bed 2', type: 'DOUBLE_HUNG' }] },
    { firstName: 'Cynthia',  lastName: 'Thibodeaux', email: 'cthibodeaux@gmail.com',       phone: '(225) 338-7712', address: '9412 Airline Hwy',            city: 'Baton Rouge',    state: 'Louisiana', zip: '70815', parish: 'East Baton Rouge', lat: 30.4891, lng: -91.0723, status: 'CONTACTED',       source: 'referral',           leadScore: 87, urgencyScore: 79, isStormLead: false, estimatedRevenue: 9800,  yearBuilt: 1990, sqft: 1920, stories: 1, windowCount: 10, windowCond: 'POOR',    openings: [{ room: 'Front Room', type: 'DOUBLE_HUNG' }, { room: 'Kitchen', type: 'SINGLE_HUNG' }, { room: 'Master Bed', type: 'CASEMENT' }, { room: 'Den', type: 'PICTURE' }] },
    { firstName: 'Glenn',    lastName: 'Pitre',      email: 'gpitre@bellsouth.net',        phone: '(225) 228-5503', address: '3341 Rosedale Rd',            city: 'Port Allen',     state: 'Louisiana', zip: '70767', parish: 'West Baton Rouge', lat: 30.4489, lng: -91.2213, status: 'FOLLOW_UP',       source: 'door-knock',         leadScore: 83, urgencyScore: 71, isStormLead: true,  estimatedRevenue: 8400,  yearBuilt: 1977, sqft: 1780, stories: 1, windowCount: 9,  windowCond: 'POOR',    openings: [{ room: 'Living Room', type: 'DOUBLE_HUNG' }, { room: 'Kitchen', type: 'SINGLE_HUNG' }, { room: 'Master Bed', type: 'DOUBLE_HUNG' }, { room: 'Bed 2', type: 'DOUBLE_HUNG' }] },
    { firstName: 'Tammy',    lastName: 'Chenevert',  email: 'tchenevert@yahoo.com',        phone: '(225) 571-4490', address: '4782 Perkins Rd',             city: 'Baton Rouge',    state: 'Louisiana', zip: '70808', parish: 'East Baton Rouge', lat: 30.3987, lng: -91.1198, status: 'APPOINTMENT_SET', source: 'web',                leadScore: 79, urgencyScore: 66, isStormLead: false, estimatedRevenue: 7200,  yearBuilt: 1994, sqft: 1860, stories: 1, windowCount: 9,  windowCond: 'FAIR',    openings: [{ room: 'Living Room', type: 'DOUBLE_HUNG' }, { room: 'Kitchen', type: 'SINGLE_HUNG' }, { room: 'Master Bed', type: 'DOUBLE_HUNG' }, { room: 'Bed 2', type: 'DOUBLE_HUNG' }] },
    { firstName: 'Marcus',   lastName: 'Dufour',     email: 'mdufour@gmail.com',           phone: '(225) 448-2214', address: '2218 Florida Blvd',           city: 'Baton Rouge',    state: 'Louisiana', zip: '70806', parish: 'East Baton Rouge', lat: 30.4523, lng: -91.1089, status: 'QUALIFIED',       source: 'storm-list',         leadScore: 76, urgencyScore: 84, isStormLead: true,  estimatedRevenue: 6900,  yearBuilt: 1965, sqft: 1540, stories: 1, windowCount: 8,  windowCond: 'CRITICAL', openings: [{ room: 'Living Room', type: 'DOUBLE_HUNG' }, { room: 'Kitchen', type: 'SINGLE_HUNG' }, { room: 'Bedroom', type: 'DOUBLE_HUNG' }] },
    { firstName: 'Teresa',   lastName: 'Gautreaux',  email: 'tgautreaux@cox.net',          phone: '(225) 664-9931', address: '1045 N Burnside Ave',         city: 'Gonzales',       state: 'Louisiana', zip: '70737', parish: 'Ascension',        lat: 30.2448, lng: -90.9187, status: 'NEW_LEAD',        source: 'web',                leadScore: 73, urgencyScore: 60, isStormLead: false, estimatedRevenue: 5600,  yearBuilt: 1987, sqft: 1680, stories: 1, windowCount: 8,  windowCond: 'FAIR',    openings: [{ room: 'Living Room', type: 'DOUBLE_HUNG' }, { room: 'Kitchen', type: 'SINGLE_HUNG' }, { room: 'Master Bed', type: 'DOUBLE_HUNG' }, { room: 'Bed 2', type: 'DOUBLE_HUNG' }] },
    { firstName: 'Phillip',  lastName: 'Lejeune',    email: 'plejeune@gmail.com',          phone: '(225) 892-3341', address: '512 E Worthy Rd',             city: 'Gonzales',       state: 'Louisiana', zip: '70737', parish: 'Ascension',        lat: 30.2398, lng: -90.9301, status: 'CONTACTED',       source: 'referral',           leadScore: 69, urgencyScore: 57, isStormLead: false, estimatedRevenue: 5100,  yearBuilt: 1983, sqft: 1590, stories: 1, windowCount: 8,  windowCond: 'FAIR',    openings: [{ room: 'Living Room', type: 'DOUBLE_HUNG' }, { room: 'Kitchen', type: 'SINGLE_HUNG' }, { room: 'Master Bed', type: 'DOUBLE_HUNG' }] },
    { firstName: 'Brenda',   lastName: 'Arceneaux',  email: 'barceneaux@hotmail.com',      phone: '(225) 673-1128', address: '3301 Highway 42',             city: 'Prairieville',   state: 'Louisiana', zip: '70769', parish: 'Ascension',        lat: 30.3112, lng: -90.9644, status: 'NEW_LEAD',        source: 'door-knock',         leadScore: 66, urgencyScore: 62, isStormLead: true,  estimatedRevenue: 5400,  yearBuilt: 1979, sqft: 1490, stories: 1, windowCount: 7,  windowCond: 'POOR',    openings: [{ room: 'Living Room', type: 'DOUBLE_HUNG' }, { room: 'Kitchen', type: 'SINGLE_HUNG' }, { room: 'Bedroom', type: 'DOUBLE_HUNG' }] },
    { firstName: 'Kevin',    lastName: 'Fontenot',   email: 'kfontenot2@bellsouth.net',    phone: '(225) 445-8812', address: '18340 Airline Hwy',           city: 'Prairieville',   state: 'Louisiana', zip: '70769', parish: 'Ascension',        lat: 30.3234, lng: -90.9512, status: 'FOLLOW_UP',       source: 'web',                leadScore: 63, urgencyScore: 51, isStormLead: false, estimatedRevenue: 4800,  yearBuilt: 1998, sqft: 1700, stories: 1, windowCount: 8,  windowCond: 'FAIR',    openings: [{ room: 'Family Room', type: 'DOUBLE_HUNG' }, { room: 'Kitchen', type: 'SINGLE_HUNG' }, { room: 'Master Bed', type: 'DOUBLE_HUNG' }, { room: 'Bed 2', type: 'DOUBLE_HUNG' }] },
    { firstName: 'Dorothy',  lastName: 'Daigle',     email: 'ddaigle@cox.net',             phone: '(225) 774-5521', address: '2208 Central Thruway',        city: 'Central',        state: 'Louisiana', zip: '70818', parish: 'East Baton Rouge', lat: 30.5512, lng: -91.0644, status: 'NEW_LEAD',        source: 'storm-list',         leadScore: 61, urgencyScore: 73, isStormLead: true,  estimatedRevenue: 4600,  yearBuilt: 1971, sqft: 1380, stories: 1, windowCount: 7,  windowCond: 'POOR',    openings: [{ room: 'Living Room', type: 'DOUBLE_HUNG' }, { room: 'Kitchen', type: 'SINGLE_HUNG' }, { room: 'Bedroom', type: 'DOUBLE_HUNG' }] },
    { firstName: 'Craig',    lastName: 'Tullier',    email: 'ctullier@gmail.com',          phone: '(225) 603-4421', address: '9231 Sullivan Rd',            city: 'Central',        state: 'Louisiana', zip: '70818', parish: 'East Baton Rouge', lat: 30.5589, lng: -91.0712, status: 'ATTEMPTING_CONTACT', source: 'web',              leadScore: 59, urgencyScore: 49, isStormLead: false, estimatedRevenue: 4300,  yearBuilt: 1989, sqft: 1610, stories: 1, windowCount: 8,  windowCond: 'FAIR',    openings: [{ room: 'Living Room', type: 'DOUBLE_HUNG' }, { room: 'Kitchen', type: 'SINGLE_HUNG' }, { room: 'Master Bed', type: 'DOUBLE_HUNG' }] },
    { firstName: 'Sandra',   lastName: 'Dupre',      email: 'sdupre@yahoo.com',            phone: '(225) 657-3318', address: '4112 Groom Rd',               city: 'Baker',          state: 'Louisiana', zip: '70714', parish: 'East Baton Rouge', lat: 30.5834, lng: -91.1698, status: 'NEW_LEAD',        source: 'referral',           leadScore: 57, urgencyScore: 52, isStormLead: false, estimatedRevenue: 4000,  yearBuilt: 1974, sqft: 1420, stories: 1, windowCount: 7,  windowCond: 'FAIR',    openings: [{ room: 'Living Room', type: 'DOUBLE_HUNG' }, { room: 'Kitchen', type: 'SINGLE_HUNG' }, { room: 'Bedroom', type: 'DOUBLE_HUNG' }] },
    { firstName: 'Tommy',    lastName: 'Boudreaux',  email: 'tboudreaux@att.net',          phone: '(225) 772-4412', address: '2301 Plank Rd',               city: 'Baker',          state: 'Louisiana', zip: '70714', parish: 'East Baton Rouge', lat: 30.5791, lng: -91.1612, status: 'NEW_LEAD',        source: 'door-knock',         leadScore: 54, urgencyScore: 48, isStormLead: false, estimatedRevenue: 3800,  yearBuilt: 1968, sqft: 1310, stories: 1, windowCount: 7,  windowCond: 'FAIR',    openings: [{ room: 'Living Room', type: 'DOUBLE_HUNG' }, { room: 'Kitchen', type: 'SINGLE_HUNG' }, { room: 'Bedroom', type: 'DOUBLE_HUNG' }] },
    { firstName: 'Renee',    lastName: 'Hebert',     email: 'rhebert2@bellsouth.net',      phone: '(225) 335-9901', address: '1822 Zachary Rd',             city: 'Zachary',        state: 'Louisiana', zip: '70791', parish: 'East Baton Rouge', lat: 30.6621, lng: -91.1489, status: 'NEW_LEAD',        source: 'web',                leadScore: 52, urgencyScore: 44, isStormLead: false, estimatedRevenue: 3500,  yearBuilt: 1976, sqft: 1280, stories: 1, windowCount: 6,  windowCond: 'FAIR',    openings: [{ room: 'Living Room', type: 'DOUBLE_HUNG' }, { room: 'Kitchen', type: 'SINGLE_HUNG' }, { room: 'Bedroom', type: 'DOUBLE_HUNG' }] },
  ];

  const condMap: Record<string, any> = { CRITICAL: 'CRITICAL', POOR: 'POOR', FAIR: 'FAIR', GOOD: 'GOOD', EXCELLENT: 'EXCELLENT' };
  const windowTypeMap: Record<string, any> = { DOUBLE_HUNG: 'DOUBLE_HUNG', SINGLE_HUNG: 'SINGLE_HUNG', PICTURE: 'PICTURE', CASEMENT: 'CASEMENT', SLIDER: 'SLIDER' };

  const results: any[] = [];
  let created = 0, skipped = 0;

  for (const ld of REAL_LEADS) {
    // Idempotent: skip if email already exists in this org
    const existing = await prisma.lead.findFirst({ where: { organizationId: orgId, email: ld.email } });
    if (existing) { skipped++; continue; }

    const lead = await prisma.lead.create({
      data: {
        organizationId: orgId,
        firstName: ld.firstName,
        lastName: ld.lastName,
        email: ld.email,
        phone: ld.phone,
        address: ld.address,
        city: ld.city,
        state: ld.state,
        zip: ld.zip,
        parish: ld.parish,
        lat: ld.lat,
        lng: ld.lng,
        status: ld.status as any,
        source: ld.source,
        leadScore: ld.leadScore,
        urgencyScore: ld.urgencyScore,
        isStormLead: ld.isStormLead,
        estimatedRevenue: ld.estimatedRevenue,
        tags: ld.isStormLead ? ['storm-damage', 'high-priority'] : [],
      },
    });

    // Primary contact
    await prisma.contact.create({
      data: {
        leadId: lead.id,
        firstName: ld.firstName,
        lastName: ld.lastName,
        email: ld.email,
        phone: ld.phone,
        isOwner: true,
        isPrimary: true,
        isSpouse: false,
        preferredContactMethod: 'PHONE' as any,
        bestTimeToContact: 'Evenings after 5pm',
      },
    });

    // Property with openings
    const property = await prisma.property.create({
      data: {
        address: ld.address,
        city: ld.city,
        state: ld.state,
        zip: ld.zip,
        parish: ld.parish,
        lat: ld.lat,
        lng: ld.lng,
        yearBuilt: ld.yearBuilt,
        squareFootage: ld.sqft,
        stories: ld.stories,
        propertyType: 'single-family',
        ownershipType: 'owner-occupied',
        estimatedWindowCount: ld.windowCount,
        windowCondition: condMap[ld.windowCond] ?? 'FAIR',
        stormExposure: ld.isStormLead ? 'high' : 'medium',
        leads: { connect: [{ id: lead.id }] },
      },
    });

    for (let i = 0; i < ld.openings.length; i++) {
      const op = ld.openings[i];
      const opening = await prisma.opening.create({
        data: {
          propertyId: property.id,
          openingId: `${op.room.toLowerCase().replace(/[\\s]+/g, '-')}-${i + 1}`,
          roomLabel: op.room,
          floorLevel: 1,
          windowType: windowTypeMap[op.type] ?? 'DOUBLE_HUNG',
          frameMaterial: 'ALUMINUM' as any,
          condition: condMap[ld.windowCond] ?? 'FAIR',
          hasCondensation: ld.windowCond === 'POOR' || ld.windowCond === 'CRITICAL',
          hasSealFailure: ld.windowCond === 'CRITICAL',
          requiresLadder: false,
          sortOrder: i,
        },
      });

      // Add measurements to first 3 openings of each lead
      if (i < 3) {
        await prisma.measurement.create({
          data: {
            openingId: opening.id,
            widthHigh: 36.0, widthMid: 35.875, widthLow: 35.75,
            heightLeft: 48.0, heightMid: 47.875, heightRight: 47.75,
            finalWidth: 35.75, finalHeight: 47.75, depth: 3.5, jambDepth: 4.0,
            sillCondition: ld.windowCond === 'CRITICAL' ? 'deteriorated' : 'fair',
            isSquare: true,
            status: i < 2 ? 'VERIFIED_ONSITE' : 'ESTIMATED',
            confidenceScore: i < 2 ? 0.96 : 0.71,
            captureMethod: i < 2 ? 'manual' : 'guided',
            isAiEstimated: i >= 2,
            aiEstimateConfidence: i >= 2 ? 0.68 : undefined,
          },
        });
      }
    }

    created++;
    results.push({ id: lead.id, name: `${ld.firstName} ${ld.lastName}`, city: ld.city, status: ld.status });
  }

  logger.info(`Seed-owner-leads: created=${created}, skipped=${skipped} for org ${orgId}`);
  res.json({ success: true, data: { created, skipped, leads: results } });
});

export { router as adminRouter };
