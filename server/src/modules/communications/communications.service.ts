/**
 * communications.service.ts
 * Business logic for Twilio-powered calls and SMS tied to the database.
 *
 * Every outbound call or SMS:
 *  1. Fires through Twilio
 *  2. Creates an Activity record (type: CALL or SMS) on the lead
 *  3. Persists a CommunicationLog record with the Twilio SID + status
 *
 * Webhook handlers update those records when Twilio POSTs back status.
 */
import { prisma } from '../../shared/services/prisma';
import { sendSms, initiateCall, getCallRecordings, isTwilioEnabled } from '../../shared/services/twilio.service';
import { logger, sanitizeForLog } from '../../shared/utils/logger';
import { ActivityType, ContactMethod } from '@prisma/client';

// ─── Helpers ──────────────────────────────────────────────────────────────
function normalizePhone(phone: string): string {
  // Strip all non-digit characters and ensure E.164 US format
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return phone; // Return as-is if we can't normalize
}

// ─── Send SMS ─────────────────────────────────────────────────────────────
export interface SendSmsInput {
  leadId: string;
  organizationId: string;
  userId: string;
  phone: string;
  message: string;
  /** Optional: link to proposal/invoice/appointment */
  referenceId?: string;
  referenceType?: 'proposal' | 'invoice' | 'appointment';
}

export async function sendSmsToLead(input: SendSmsInput) {
  const { leadId, organizationId, userId, phone, message, referenceId, referenceType } = input;

  // Verify lead belongs to org
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId, deletedAt: null },

  });
  if (!lead) throw new Error('Lead not found');
  if ((lead as any).doNotCall) throw new Error(`${lead.firstName} ${lead.lastName} is on the Do Not Contact list`);

  const to = normalizePhone(phone);

  // Send via Twilio
  const result = await sendSms(to, message);

  // Log Activity on the lead
  const activity = await prisma.activity.create({
    data: {
      leadId,
      userId,
      type: ActivityType.SMS,
      contactMethod: ContactMethod.SMS,
      title: `SMS sent${result.simulated ? ' (simulated)' : ''}`,
      description: message,
      outcome: result.success ? 'sent' : 'failed',
      isAutomatic: false,
      proposalId: referenceType === 'proposal' ? referenceId : undefined,
      invoiceId: referenceType === 'invoice' ? referenceId : undefined,
      appointmentId: referenceType === 'appointment' ? referenceId : undefined,
    },
  });

  // Persist communication log
  const commLog = await prisma.communicationLog.create({
    data: {
      leadId,
      organizationId,
      userId,
      direction: 'OUTBOUND',
      type: 'SMS',
      to,
      from: process.env.TWILIO_PHONE_NUMBER || 'SIMULATED',
      body: message,
      status: result.success ? 'sent' : 'failed',
      twilioSid: result.sid,
      activityId: activity.id,
      simulated: result.simulated ?? false,
    },
  });

  logger.info(`SMS comm_log=${commLog.id} lead=${sanitizeForLog(leadId)} sid=${result.sid}`);
  return { success: result.success, sid: result.sid, activityId: activity.id, commLogId: commLog.id, simulated: result.simulated };
}

// ─── Initiate Outbound Call ───────────────────────────────────────────────
export interface InitiateCallInput {
  leadId: string;
  organizationId: string;
  userId: string;
  phone: string;
}

export async function initiateCallToLead(input: InitiateCallInput) {
  const { leadId, organizationId, userId, phone } = input;

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId, deletedAt: null },

  });
  if (!lead) throw new Error('Lead not found');
  if ((lead as any).doNotCall) throw new Error(`${lead.firstName} ${lead.lastName} is on the Do Not Contact list`);

  const to = normalizePhone(phone);
  const result = await initiateCall(to, userId, leadId);

  // Create placeholder Activity — duration/outcome updated by status webhook
  const activity = await prisma.activity.create({
    data: {
      leadId,
      userId,
      type: ActivityType.CALL,
      contactMethod: ContactMethod.PHONE,
      title: `Outbound call${result.simulated ? ' (simulated)' : ''}`,
      outcome: result.status || 'initiated',
      isAutomatic: false,
    },
  });

  // Persist communication log — status gets updated via webhook
  const commLog = await prisma.communicationLog.create({
    data: {
      leadId,
      organizationId,
      userId,
      direction: 'OUTBOUND',
      type: 'CALL',
      to,
      from: process.env.TWILIO_PHONE_NUMBER || 'SIMULATED',
      status: result.status || 'initiated',
      twilioSid: result.sid,
      activityId: activity.id,
      simulated: result.simulated ?? false,
    },
  });

  logger.info(`Call initiated comm_log=${commLog.id} lead=${sanitizeForLog(leadId)} sid=${result.sid}`);
  return { success: result.success, sid: result.sid, activityId: activity.id, commLogId: commLog.id, simulated: result.simulated };
}

// ─── Get Communication History for a Lead ────────────────────────────────
export async function getLeadCommunications(leadId: string, organizationId: string, limit = 50) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!lead) throw new Error('Lead not found');

  return prisma.communicationLog.findMany({
    where: { leadId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: { select: { firstName: true, lastName: true, role: true } },
    },
  });
}

// ─── Handle Twilio Call Status Webhook ───────────────────────────────────
export async function handleCallStatusWebhook(payload: Record<string, string>) {
  const { CallSid, CallStatus, CallDuration, To } = payload;

  if (!CallSid) {
    logger.warn('Call status webhook missing CallSid');
    return;
  }

  const log = await prisma.communicationLog.findFirst({ where: { twilioSid: CallSid } });
  if (!log) {
    logger.warn(`No comm log found for CallSid=${sanitizeForLog(CallSid)}`);
    return;
  }

  const duration = CallDuration ? parseInt(CallDuration, 10) : undefined;

  // Map Twilio statuses to our internal statuses
  const statusMap: Record<string, string> = {
    queued: 'queued',
    initiated: 'initiated',
    ringing: 'ringing',
    'in-progress': 'in-progress',
    completed: 'completed',
    busy: 'busy',
    'no-answer': 'no-answer',
    canceled: 'canceled',
    failed: 'failed',
  };

  const normalizedStatus = statusMap[CallStatus] || CallStatus;

  await prisma.communicationLog.update({
    where: { id: log.id },
    data: { status: normalizedStatus, duration },
  });

  // Update the linked Activity with call outcome + duration
  if (log.activityId) {
    const outcomeLabel =
      normalizedStatus === 'completed' ? `completed (${duration || 0}s)` : normalizedStatus;
    const durationMinutes = duration ? Math.ceil(duration / 60) : undefined;

    await prisma.activity.update({
      where: { id: log.activityId },
      data: {
        outcome: outcomeLabel,
        duration: durationMinutes,
        title: normalizedStatus === 'no-answer' ? 'Outbound call — No answer' :
               normalizedStatus === 'busy'       ? 'Outbound call — Busy' :
               normalizedStatus === 'completed'  ? `Outbound call — ${durationMinutes || 0}m` :
               `Outbound call — ${normalizedStatus}`,
      },
    });
  }

  logger.info(`Call status webhook sid=${sanitizeForLog(CallSid)} status=${normalizedStatus} duration=${duration}s`);
}

// ─── Handle Twilio SMS Status Webhook ────────────────────────────────────
export async function handleSmsStatusWebhook(payload: Record<string, string>) {
  const { MessageSid, MessageStatus, ErrorCode } = payload;
  if (!MessageSid) return;

  const log = await prisma.communicationLog.findFirst({ where: { twilioSid: MessageSid } });
  if (!log) return;

  await prisma.communicationLog.update({
    where: { id: log.id },
    data: {
      status: MessageStatus,
      errorCode: ErrorCode || null,
    },
  });

  // Update activity outcome if delivered/failed
  if (log.activityId && (MessageStatus === 'delivered' || MessageStatus === 'failed')) {
    await prisma.activity.update({
      where: { id: log.activityId },
      data: { outcome: MessageStatus },
    });
  }
}

// ─── Handle Call Recording Webhook ───────────────────────────────────────
export async function handleRecordingWebhook(payload: Record<string, string>) {
  const { CallSid, RecordingUrl, RecordingDuration } = payload;
  if (!CallSid || !RecordingUrl) return;

  const log = await prisma.communicationLog.findFirst({ where: { twilioSid: CallSid } });
  if (!log) return;

  await prisma.communicationLog.update({
    where: { id: log.id },
    data: {
      recordingUrl: `${RecordingUrl}.mp3`,
      duration: RecordingDuration ? parseInt(RecordingDuration, 10) : undefined,
    },
  });

  logger.info(`Recording saved for call ${sanitizeForLog(CallSid)}: ${RecordingUrl}`);
}

// ─── Get org-level comms dashboard ───────────────────────────────────────
export async function getOrgCommunicationsStats(organizationId: string) {
  const [totalCalls, totalSms, recentLogs] = await Promise.all([
    prisma.communicationLog.count({ where: { organizationId, type: 'CALL' } }),
    prisma.communicationLog.count({ where: { organizationId, type: 'SMS' } }),
    prisma.communicationLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        lead: { select: { firstName: true, lastName: true } },
        user: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  return { totalCalls, totalSms, recentLogs };
}
