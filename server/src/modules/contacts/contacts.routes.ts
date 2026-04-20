import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { auth, AuthenticatedRequest } from '../../shared/middleware/auth';
import { contactsService } from './contacts.service';
import { ValidationError } from '../../shared/middleware/errorHandler';

const router = Router();

function validate(req: Request) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const map: Record<string, string[]> = {};
    errors.array().forEach((e: any) => { if (!map[e.path]) map[e.path] = []; map[e.path].push(e.msg); });
    throw new ValidationError('Validation failed', map);
  }
}

// GET /api/v1/contacts — list all contacts for org (with optional search)
router.get('/', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const { search } = req.query as Record<string, string>;
  const data = await contactsService.listForOrg(user.organizationId, search);
  res.json({ success: true, data });
});

// GET /api/v1/contacts/lead/:leadId
router.get('/lead/:leadId', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const contacts = await contactsService.listByLead(req.params.leadId as string, user.organizationId);
  res.json({ success: true, data: contacts });
});

// GET /api/v1/contacts/:id
router.get('/:id', auth.repOrAbove, async (req: Request, res: Response) => {
  const contact = await contactsService.getById((req.params.id as string));
  res.json({ success: true, data: contact });
});

// POST /api/v1/contacts
router.post('/',
  auth.repOrAbove,
  [
    body('firstName').notEmpty().withMessage('First name required'),
    body('lastName').notEmpty().withMessage('Last name required'),
    body('email').optional().isEmail(),
    body('phone').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    validate(req);
    const user = (req as AuthenticatedRequest).user;
    const contact = await contactsService.create({ ...req.body, userId: user.id });
    res.status(201).json({ success: true, data: contact });
  }
);

// PATCH /api/v1/contacts/:id
router.patch('/:id', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const contact = await contactsService.update((req.params.id as string), req.body, user.id);
  res.json({ success: true, data: contact });
});

// DELETE /api/v1/contacts/:id
router.delete('/:id', auth.manager, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  await contactsService.delete((req.params.id as string), user.id);
  res.json({ success: true, message: 'Contact deleted' });
});

export { router as contactsRouter };
