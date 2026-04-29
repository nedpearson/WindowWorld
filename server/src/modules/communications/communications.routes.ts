/**
 * communications.routes.ts
 * REST API for Twilio calls and SMS, plus Twilio webhook receivers.
 *
 * All authenticated routes require repOrAbove.
 * Webhook routes (/webhooks/*) are intentionally unauthenticated —
 * Twilio signs them; we validate the signature before processing.
 *
 * Mounted at: /api/v1/communications
 */
import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { auth } from '../../shared/middleware/auth';
import type { AuthenticatedRequest } from '../../shared/middleware/auth';
import {
  sendSmsToLead,
  initiateCallToLead,
  getLeadCommunications,
  handleCallStatusWebhook,
  handleSmsStatusWebhook,
  handleRecordingWebhook,
  getOrgCommunicationsStats,
} from './communications.service';
import {
  buildOutboundTwiML,
  generateAccessToken,
  validateTwilioSignature,
} from '../../shared/services/twilio.service';
import { logger, sanitizeForLog } from '../../shared/utils/logger';

const router = Router();

// ── Validation helper ─────────────────────────────────────────────────────
function validate(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────
// AUTHENTICATED ROUTES
// ─────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/communications/leads/:leadId/sms
 * Send an SMS to a lead.
 */
router.post(
  '/leads/:leadId/sms',
  auth.repOrAbove,
  [
    param('leadId').isUUID().withMessage('Invalid leadId'),
    body('phone').notEmpty().withMessage('phone is required'),
    body('message').notEmpty().isLength({ max: 1600 }).withMessage('message is required (max 1600 chars)'),
  ],
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const user = (req as AuthenticatedRequest).user;
    const { phone, message, referenceId, referenceType } = req.body;

    const result = await sendSmsToLead({
      leadId: req.params.leadId as string,
      organizationId: user.organizationId,
      userId: user.id,
      phone,
      message,
      referenceId,
      referenceType,
    });

    res.status(201).json({ success: true, data: result });
  },
);

/**
 * POST /api/v1/communications/leads/:leadId/call
 * Initiate an outbound Twilio call to a lead.
 */
router.post(
  '/leads/:leadId/call',
  auth.repOrAbove,
  [
    param('leadId').isUUID().withMessage('Invalid leadId'),
    body('phone').notEmpty().withMessage('phone is required'),
  ],
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const user = (req as AuthenticatedRequest).user;

    const result = await initiateCallToLead({
      leadId: req.params.leadId as string,
      organizationId: user.organizationId,
      userId: user.id,
      phone: req.body.phone,
    });

    res.status(201).json({ success: true, data: result });
  },
);

/**
 * GET /api/v1/communications/leads/:leadId/history
 * Get call + SMS history for a specific lead.
 */
router.get(
  '/leads/:leadId/history',
  auth.repOrAbove,
  async (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;
    const limit = parseInt((req.query.limit as string) || '50', 10);

    const logs = await getLeadCommunications(
      String(req.params.leadId),
      user.organizationId,
      limit,
    );

    res.json({ success: true, data: logs });
  },
);

/**
 * GET /api/v1/communications/stats
 * Org-level comms dashboard stats (manager+).
 */
router.get('/stats', auth.manager, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const stats = await getOrgCommunicationsStats(user.organizationId);
  res.json({ success: true, data: stats });
});

/**
 * GET /api/v1/communications/token
 * Generate a Twilio Voice Access Token for browser-based calling (Voice SDK).
 */
router.get('/token', auth.repOrAbove, async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user;
  const result = generateAccessToken(user.id);
  res.json({ success: true, data: result });
});

// ─────────────────────────────────────────────────────────────────────────
// TwiML ENDPOINTS (called by Twilio to get call instructions)
// These do NOT use JWT auth — they use Twilio signature validation
// ─────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/communications/twiml/outbound
 * Returns TwiML that bridges the rep to the customer.
 * Twilio fetches this when an outbound call is initiated.
 */
router.post('/twiml/outbound', (req: Request, res: Response) => {
  const { leadId, repId } = req.query as Record<string, string>;
  logger.info(`TwiML outbound request lead=${sanitizeForLog(leadId)} rep=${sanitizeForLog(repId)}`);

  // Twilio signature validation
  const signature  = req.headers['x-twilio-signature'] as string || '';
  const fullUrl    = `${process.env.APP_URL}/api/v1/communications/twiml/outbound`;
  const isValid    = validateTwilioSignature(fullUrl, req.body || {}, signature);
  if (!isValid) {
    res.status(403).send('Forbidden');
    return;
  }

  const customerPhone = req.body?.To || req.query.to || '';
  const twiml = buildOutboundTwiML(customerPhone as string, 'Your WindowWorld Rep');
  res.type('text/xml').send(twiml);
});

// ─────────────────────────────────────────────────────────────────────────
// TWILIO WEBHOOK RECEIVERS (status callbacks from Twilio)
// ─────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/communications/webhooks/call-status
 * Twilio posts call status updates here (initiated → ringing → answered → completed).
 */
router.post('/webhooks/call-status', async (req: Request, res: Response) => {
  await handleCallStatusWebhook(req.body || {});
  // Twilio expects an empty 200 response for status callbacks
  res.status(200).send('');
});

/**
 * POST /api/v1/communications/webhooks/sms-status
 * Twilio posts SMS delivery status here (sent → delivered / failed).
 */
router.post('/webhooks/sms-status', async (req: Request, res: Response) => {
  await handleSmsStatusWebhook(req.body || {});
  res.status(200).send('');
});

/**
 * POST /api/v1/communications/webhooks/recording
 * Twilio posts recording metadata after a call is recorded.
 */
router.post('/webhooks/recording', async (req: Request, res: Response) => {
  await handleRecordingWebhook(req.body || {});
  res.status(200).send('');
});

export { router as communicationsRouter };
