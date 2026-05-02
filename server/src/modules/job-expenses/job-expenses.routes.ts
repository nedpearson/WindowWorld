import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { auth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { jobExpensesService } from './job-expenses.service';
import { ExpenseCategory } from '@prisma/client';
import { wsService } from '../../shared/services/websocket.service';

const router = Router();

// ─── Per-user AI parse rate limit: 10/min ─────────────────────
const parseReceiptLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => (req as AuthenticatedRequest).user?.id || req.ip || 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    success: false,
    error: {
      message: 'Too many receipt parse requests. Please wait a minute.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    },
  },
});

const VALID_CATEGORIES = Object.values(ExpenseCategory);

// ─── POST /api/v1/job-expenses/parse-receipt ──────────────────
// Calls GPT-4o vision to parse a receipt. Does NOT save an expense.
router.post(
  '/parse-receipt',
  ...auth.repOrAbove,
  parseReceiptLimiter,
  [
    body('imageUrl').notEmpty().isURL().withMessage('imageUrl must be a valid URL'),
    body('leadId').notEmpty().isString().withMessage('leadId is required'),
  ],
  async (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;
    const { imageUrl, leadId } = req.body as { imageUrl: string; leadId: string };

    const result = await jobExpensesService.parseReceiptWithAI(
      imageUrl,
      leadId,
      user.organizationId,
    );

    res.json({ success: true, data: result });
  },
);

// ─── POST /api/v1/job-expenses ────────────────────────────────
router.post(
  '/',
  ...auth.repOrAbove,
  [
    body('leadId').notEmpty().isString().withMessage('leadId is required'),
    body('amount')
      .isFloat({ gt: 0 })
      .withMessage('amount must be a positive number'),
    body('category')
      .isIn(VALID_CATEGORIES)
      .withMessage(`category must be one of: ${VALID_CATEGORIES.join(', ')}`),
    body('vendor').optional().isString().isLength({ max: 255 }),
    body('description').optional().isString().isLength({ max: 1000 }),
    body('receiptDate').optional().isISO8601().withMessage('receiptDate must be ISO 8601'),
    body('documentId').optional().isString(),
    body('aiConfidence').optional().isFloat({ min: 0, max: 1 }),
  ],
  async (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;
    const expense = await jobExpensesService.createExpense(
      req.body,
      user.id,
      user.organizationId,
    );

    // Notify desktop clients of field-synced expense
    try {
      wsService.broadcastToOrg(user.organizationId, 'mobile:sync', {
        type: 'EXPENSE_SAVE',
        entityId: (expense as any).id,
        leadId: req.body.leadId ?? null,
        updatedAt: new Date().toISOString(),
        organizationId: user.organizationId,
      });
    } catch { /* fire-and-forget */ }

    res.status(201).json({ success: true, data: expense });
  },
);

// ─── GET /api/v1/job-expenses/lead/:leadId ───────────────────
router.get(
  '/lead/:leadId',
  ...auth.repOrAbove,
  [param('leadId').notEmpty().isString()],
  async (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;
    const { leadId } = req.params as { leadId: string };

    const [expenses, summary] = await Promise.all([
      jobExpensesService.listExpensesByLead(leadId, user.organizationId),
      jobExpensesService.getJobCostSummary(leadId, user.organizationId),
    ]);

    res.json({ success: true, data: { expenses, summary } });
  },
);

// ─── PATCH /api/v1/job-expenses/:id ──────────────────────────
router.patch(
  '/:id',
  ...auth.repOrAbove,
  [
    param('id').notEmpty().isString(),
    body('amount').optional().isFloat({ gt: 0 }),
    body('category').optional().isIn(VALID_CATEGORIES),
    body('vendor').optional().isString().isLength({ max: 255 }),
    body('description').optional().isString().isLength({ max: 1000 }),
    body('receiptDate').optional().isISO8601(),
  ],
  async (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;
    const expense = await jobExpensesService.updateExpense(
      req.params.id as string,
      req.body,
      user.id,
      user.organizationId,
    );
    res.json({ success: true, data: expense });
  },
);

// ─── PATCH /api/v1/job-expenses/:id/verify ───────────────────
// Manager-only: marks expense as verified
router.patch(
  '/:id/verify',
  ...auth.manager,
  [param('id').notEmpty().isString()],
  async (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;
    const expense = await jobExpensesService.verifyExpense(
      req.params.id as string,
      user.id,
      user.organizationId,
    );
    res.json({ success: true, data: expense });
  },
);

// ─── DELETE /api/v1/job-expenses/:id ─────────────────────────
router.delete(
  '/:id',
  ...auth.repOrAbove,
  [param('id').notEmpty().isString()],
  async (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;
    await jobExpensesService.deleteExpense(
      req.params.id as string,
      user.id,
      user.organizationId,
      user.role,
    );
    res.json({ success: true, data: null });
  },
);

export { router as jobExpensesRouter };
