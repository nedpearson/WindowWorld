import { Router, Request, Response } from 'express';
import { auth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { invoicesService } from './invoices.service';

const router = Router();

router.get('/', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { page = '1', limit = '25', leadId, status, overdueOnly } = req.query as Record<string, string>;
  const result = await invoicesService.list({
    organizationId: user.organizationId,
    leadId, status,
    overdueOnly: overdueOnly === 'true',
    page: parseInt(page), limit: parseInt(limit),
  });
  res.json({ success: true, ...result });
});

router.get('/aging', auth.manager, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await invoicesService.getAgingSummary(user.organizationId);
  res.json({ success: true, data });
});

router.get('/:id', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await invoicesService.getById((req.params.id as string), user.organizationId);
  res.json({ success: true, data });
});

router.post('/from-proposal', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await invoicesService.createFromProposal({ ...req.body, createdById: user.id, organizationId: user.organizationId });
  res.status(201).json({ success: true, data });
});

router.post('/:id/payments', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await invoicesService.recordPayment((req.params.id as string), user.organizationId, { ...req.body, recordedById: user.id });
  res.status(201).json({ success: true, data });
});

router.post('/:id/send', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const data = await invoicesService.send((req.params.id as string), user.organizationId, user.id);
  res.json({ success: true, data });
});

// POST /api/v1/invoices/:id/generate-pdf — queue PDF generation for an invoice
router.post('/:id/generate-pdf', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const id = req.params.id as string;

  const invoice = await invoicesService.getById(id, user.organizationId);

  const { pdfQueue } = await import('../../jobs');
  const { prisma: db } = await import('../../shared/services/prisma');

  // Mark as generating
  await db.invoice.update({ where: { id }, data: { pdfStatus: 'GENERATING' } as any });

  try {
    const job = await pdfQueue.add('generate-invoice-pdf', {
      invoiceId: id,
      invoiceNumber: (invoice as any).invoiceNumber,
      leadId: invoice.leadId,
      generatedById: user.id,
    });

    res.json({ success: true, data: { queued: true, invoiceId: id, jobId: job.id } });
  } catch (err: any) {
    await db.invoice.update({ where: { id }, data: { pdfStatus: 'FAILED' } as any });
    throw err;
  }
});

// GET /invoices/install-schedule — invoices that are contracted and ready for install scheduling
router.get('/install-schedule', auth.manager, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { prisma } = await import('../../shared/services/prisma');
  const jobs: any[] = await (prisma.invoice.findMany as any)({
    where: {
      organizationId: user.organizationId,
      status: { in: ['SENT', 'PARTIAL', 'PAID'] },
      proposalId: { not: null }, // only invoices tied to a proposal
    },
    include: {
      lead: {
        select: {
          id: true, firstName: true, lastName: true,
          address: true, city: true, zip: true, phone: true,
        },
      },
      proposal: {
        include: {
          quote: { select: { grandTotal: true, totalWindows: true, lineItems: true } },
        },
      },
      payments: { select: { amount: true, paidAt: true } },
    },
    orderBy: { createdAt: 'asc' },
  } as any);

  // Shape into install job format
  const formatted = jobs.map((inv: any) => {
    const lead = inv.lead || {};
    const quote = inv.proposal?.quote;
    const totalPaid = (inv.payments || []).reduce((s: number, p: any) => s + p.amount, 0);
    return {
      id: inv.id,
      leadId: lead.id || inv.leadId,
      customerName: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
      address: lead.address || '',
      city: lead.city || '',
      phone: lead.phone || '',
      windowCount: quote?.totalWindows || 0,
      series: quote?.lineItems?.[0]?.productName || 'Unknown Series',
      contractValue: inv.grandTotal,
      contractDate: inv.createdAt.toISOString().split('T')[0],
      installDate: inv.installDate || null,
      crew: inv.installCrew || null,
      status: inv.installStatus || (inv.status === 'PAID' ? 'COMPLETE' : 'NEEDS_SCHEDULING'),
      notes: inv.installNotes || inv.notes || null,
      depositPaid: totalPaid >= (inv.depositAmount || 0),
      depositAmount: inv.depositAmount || 0,
      estimatedDays: Math.max(1, Math.ceil((quote?.totalWindows || 0) / 8)),
    };
  });

  res.json({ success: true, data: formatted });
});

// PATCH /invoices/:id/install — set install date, crew, and status
router.patch('/:id/install', auth.manager, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  
  // Verify invoice belongs to org
  await invoicesService.getById(req.params.id as string, user.organizationId);

  const { prisma } = await import('../../shared/services/prisma');
  const { installDate, crew, installStatus, notes } = req.body;
  const updated = await prisma.invoice.update({
    where: { id: req.params.id as string },
    data: {
      ...(installDate && { installDate: new Date(installDate) } as any),
      ...(crew !== undefined && { installCrew: crew } as any),
      ...(installStatus && { installStatus } as any),
      ...(notes !== undefined && { installNotes: notes } as any),
    },
  });
  res.json({ success: true, data: updated });
});

export { router as invoicesRouter };
