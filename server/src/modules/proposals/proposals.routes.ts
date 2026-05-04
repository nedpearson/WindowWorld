import { Router, Request, Response } from 'express';
import { auth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { proposalsService } from './proposals.service';
import { prisma } from '../../shared/services/prisma';

const router = Router();

// ── Public: homeowner portal (no auth required) ────────────────
// GET /api/v1/proposals/portal/:id
router.get('/portal/:id', async (req: Request, res: Response) => {
  try {
    const data = await proposalsService.getById(req.params.id as string);

    // Enforce expiry — reject if past expiresAt
    if ((data as any).expiresAt && new Date((data as any).expiresAt) < new Date()) {
      return res.status(410).json({
        success: false,
        error: { message: 'This proposal has expired. Please contact your WindowWorld representative.' },
      });
    }

    // Record view (increments viewCount, sets firstViewedAt, advances SENT → VIEWED)
    await proposalsService.recordView(req.params.id as string, req.ip || '');
    res.json({ success: true, data });
  } catch {
    res.status(404).json({ success: false, error: { message: 'Proposal not found or expired' } });
  }
});

// POST /api/v1/proposals/portal/:id/accept
router.post('/portal/:id/accept', async (req: Request, res: Response) => {
  const { signerName } = req.body;
  if (!signerName?.trim()) {
    return res.status(400).json({ success: false, error: { message: 'Signer name is required' } });
  }
  try {
    // Check expiry before accepting
    const proposal = await proposalsService.getById(req.params.id as string);
    if ((proposal as any).expiresAt && new Date((proposal as any).expiresAt) < new Date()) {
      return res.status(410).json({ success: false, error: { message: 'This proposal has expired.' } });
    }

    const orgId = (proposal as any).lead?.organizationId;

    // Mark accepted + advance lead to VERBAL_COMMIT
    await proposalsService.updateStatus(req.params.id as string, orgId, 'ACCEPTED', 'portal-signature');

    // Persist signer name + IP for legal audit trail
    await prisma.proposal.update({
      where: { id: req.params.id as string },
      data: {
        acceptedAt: new Date(),
        signedByName: signerName.trim(),
        signedAt: new Date(),
        signedByIp: req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown',
      } as any,
    });

    res.json({ success: true, message: 'Proposal accepted and signed', signerName });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

router.get('/', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { page = '1', limit = '25', leadId, status } = req.query as Record<string, string>;
  const repId = user.role === 'SALES_REP' ? user.id : undefined;
  const result = await proposalsService.list({
    organizationId: user.organizationId,
    leadId, status, repId,
    page: parseInt(page), limit: parseInt(limit),
  });
  res.json({ success: true, ...result });
});

router.get('/:id', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await proposalsService.getById((req.params.id as string), user.organizationId);
  res.json({ success: true, data });
});

// Public: record when customer views the proposal
router.post('/p/:id/view', async (req: Request, res: Response) => {
  await proposalsService.recordView((req.params.id as string), req.ip);
  res.json({ success: true });
});

router.post('/', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await proposalsService.create({ ...req.body, createdById: user.id, organizationId: user.organizationId });
  res.status(201).json({ success: true, data });
});

router.post('/:id/generate-pdf', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await proposalsService.generatePdf((req.params.id as string), user.organizationId, user.id);
  res.json({ success: true, data });
});

router.post('/:id/send', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { channel = 'email' } = req.body;
  const data = await proposalsService.send((req.params.id as string), user.organizationId, user.id, channel);
  res.json({ success: true, data });
});

// POST /api/v1/proposals/:id/sign — internal rep-side signing (e.g. in-person tablet sign)
router.post('/:id/sign', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { signerName, signerIp } = req.body;
  if (!signerName?.trim()) {
    return res.status(400).json({ success: false, error: { message: 'signerName is required' } });
  }

  const proposal = await proposalsService.getById(req.params.id as string, user.organizationId);

  // Check expiry
  if ((proposal as any).expiresAt && new Date((proposal as any).expiresAt) < new Date()) {
    return res.status(410).json({ success: false, error: { message: 'Proposal has expired' } });
  }

  // Advance status to ACCEPTED (service handles lead advancement)
  if (!['ACCEPTED', 'CONTRACTED'].includes(proposal.status as string)) {
    await proposalsService.updateStatus(req.params.id as string, user.organizationId, 'ACCEPTED', user.id);
  }

  // Persist signature metadata
  const updated = await prisma.proposal.update({
    where: { id: req.params.id as string },
    data: {
      signedByName: signerName.trim(),
      signedAt: new Date(),
      acceptedAt: (proposal as any).acceptedAt || new Date(),
      signedByIp: signerIp || req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'internal',
    } as any,
  });

  res.json({ success: true, data: updated, message: 'Proposal signed successfully' });
});

router.patch('/:id/status', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await proposalsService.updateStatus((req.params.id as string), user.organizationId, req.body.status, user.id);
  res.json({ success: true, data });
});

router.delete('/:id', auth.manager, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  await proposalsService.delete((req.params.id as string), user.organizationId, user.id);
  res.json({ success: true, message: 'Proposal deleted' });
});

export { router as proposalsRouter };
