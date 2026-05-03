/**
 * Automations Cron
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs periodically to process time-based automations and background updates.
 *
 * Implements automations:
 * 1. "No-Show" Auto-Rescheduling Sequence
 * 2. Stale Lead Re-engagement
 * 3. Post-Install Review Request
 * 4. Overdue Invoice Reminder
 * 5. Pre-Appointment AI Pitch Prep
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { logger, sanitizeForLog } from '../shared/utils/logger';

// ── Shared ───────────────────────────────────────────────────────────────────

async function getSystemUser(organizationId: string, prisma: any): Promise<string | null> {
  const systemUser = await prisma.user.findFirst({
    where: {
      organizationId,
      isActive: true,
      role: { in: ['SUPER_ADMIN', 'SALES_MANAGER'] },
    },
    select: { id: true },
  });
  return systemUser?.id || null;
}

// ── 1. No-Show Auto-Rescheduling Sequence ────────────────────────────────────
// Finds appointments marked NO_SHOW in the last 24h where the lead has no future appointments
async function processNoShows() {
  logger.info('[automations-cron] Running No-Show Auto-Rescheduling Sequence...');
  const { prisma } = await import('../shared/services/prisma');
  const { campaignsService } = await import('../modules/campaigns/campaigns.service');

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const noShows = await prisma.appointment.findMany({
    where: {
      status: 'NO_SHOW',
      scheduledAt: { gte: yesterday },
      lead: {
        status: { in: ['APPOINTMENT_SET', 'FOLLOW_UP'] },
        appointments: {
          none: {
            scheduledAt: { gt: new Date() },
            status: { not: 'CANCELLED' }
          }
        }
      }
    },
    include: {
      lead: { select: { id: true, organizationId: true } },
    }
  });

  for (const apt of noShows) {
    const sysUser = await getSystemUser(apt.lead.organizationId, prisma);
    if (!sysUser) continue;

    try {
      // Revert lead to ATTEMPTING_CONTACT to prompt rebooking
      await prisma.lead.update({
        where: { id: apt.lead.id },
        data: { status: 'ATTEMPTING_CONTACT' }
      });

      // Enroll in rebooking sequence
      await campaignsService.enroll(apt.lead.id, 'no-show-recovery', sysUser);

      await prisma.activity.create({
        data: {
          leadId: apt.lead.id,
          userId: sysUser,
          type: 'SYSTEM_AUTO',
          title: 'Auto-Trigger: No-Show Recovery',
          description: 'Lead marked as no-show. Status reverted to Attempting Contact and added to recovery campaign.',
          isAutomatic: true,
        }
      });
      logger.info(`[automations-cron] Enrolled lead ${apt.lead.id} in no-show recovery`);
    } catch (e: any) {
      logger.warn(`[automations-cron] Failed no-show processing for ${apt.lead.id}: ${sanitizeForLog(e.message)}`);
    }
  }
}

// ── 2. Stale Lead Re-engagement ──────────────────────────────────────────────
// Finds leads untouched for 30 days and drops them into a nurture campaign
async function processStaleLeads() {
  logger.info('[automations-cron] Running Stale Lead Re-engagement...');
  const { prisma } = await import('../shared/services/prisma');
  const { campaignsService } = await import('../modules/campaigns/campaigns.service');

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const staleLeads = await prisma.lead.findMany({
    where: {
      status: { in: ['NEW_LEAD', 'ATTEMPTING_CONTACT', 'FOLLOW_UP'] },
      lastContactedAt: { lt: thirtyDaysAgo },
      deletedAt: null,
      leadScore: { gte: 50 }, // Only nurture good leads
    },
    select: { id: true, organizationId: true },
  });

  for (const lead of staleLeads) {
    const sysUser = await getSystemUser(lead.organizationId, prisma);
    if (!sysUser) continue;

    try {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'NURTURE' }
      });
      await campaignsService.enroll(lead.id, 'stale-lead-nurture', sysUser);

      await prisma.activity.create({
        data: {
          leadId: lead.id,
          userId: sysUser,
          type: 'SYSTEM_AUTO',
          title: 'Auto-Trigger: Stale Lead Re-engagement',
          description: 'Lead has been inactive for 30+ days. Moved to Nurture status.',
          isAutomatic: true,
        }
      });
      logger.info(`[automations-cron] Enrolled lead ${lead.id} in nurture campaign`);
    } catch (e: any) {
      logger.warn(`[automations-cron] Failed stale lead processing for ${lead.id}: ${sanitizeForLog(e.message)}`);
    }
  }
}

// ── 3. Post-Install Review Request ───────────────────────────────────────────
// Finds leads that were INSTALLED exactly 7 days ago
async function processPostInstallReviews() {
  logger.info('[automations-cron] Running Post-Install Review Requests...');
  const { prisma } = await import('../shared/services/prisma');
  const { campaignsService } = await import('../modules/campaigns/campaigns.service');

  const sevenDaysAgoStart = new Date();
  sevenDaysAgoStart.setDate(sevenDaysAgoStart.getDate() - 7);
  sevenDaysAgoStart.setHours(0, 0, 0, 0);
  
  const sevenDaysAgoEnd = new Date(sevenDaysAgoStart);
  sevenDaysAgoEnd.setHours(23, 59, 59, 999);

  // We find leads whose status changed to INSTALLED/PAID around 7 days ago by looking at activities
  const recentInstalls = await prisma.activity.findMany({
    where: {
      type: 'STATUS_CHANGE',
      title: { contains: 'INSTALLED' },
      occurredAt: { gte: sevenDaysAgoStart, lte: sevenDaysAgoEnd },
      lead: {
        status: { in: ['INSTALLED', 'PAID'] },
      }
    },
    select: { lead: { select: { id: true, organizationId: true } } },
  });

  const processed = new Set<string>();

  for (const record of recentInstalls) {
    const lead = record.lead;
    if (processed.has(lead.id)) continue;
    processed.add(lead.id);

    const sysUser = await getSystemUser(lead.organizationId, prisma);
    if (!sysUser) continue;

    try {
      await campaignsService.enroll(lead.id, 'post-install-review', sysUser);
      await prisma.activity.create({
        data: {
          leadId: lead.id,
          userId: sysUser,
          type: 'SYSTEM_AUTO',
          title: 'Auto-Trigger: Review Request',
          description: 'It has been 7 days since installation. Enrolled in review request campaign.',
          isAutomatic: true,
        }
      });
      logger.info(`[automations-cron] Enrolled lead ${lead.id} in post-install review`);
    } catch (e: any) {
      logger.warn(`[automations-cron] Failed post-install processing for ${lead.id}: ${sanitizeForLog(e.message)}`);
    }
  }
}

// ── 4. Overdue Invoice Reminder ──────────────────────────────────────────────
// Sends reminders for invoices overdue by exactly 3, 7, or 14 days
async function processOverdueInvoices() {
  logger.info('[automations-cron] Running Overdue Invoice Reminders...');
  const { prisma } = await import('../shared/services/prisma');
  const { invoicesService } = await import('../modules/invoices/invoices.service');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getTargetDate = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return d;
  };

  const targets = [getTargetDate(3), getTargetDate(7), getTargetDate(14)];

  for (const targetDate of targets) {
    const start = new Date(targetDate);
    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    const overdue = await prisma.invoice.findMany({
      where: {
        status: { in: ['SENT', 'PARTIAL'] },
        dueDate: { gte: start, lte: end },
      },
      select: { id: true, leadId: true, organizationId: true }
    });

    for (const inv of overdue) {
      const sysUser = await getSystemUser(inv.organizationId, prisma);
      if (!sysUser) continue;

      try {
        await invoicesService.send(inv.id, sysUser);
        
        await prisma.activity.create({
          data: {
            leadId: inv.leadId,
            userId: sysUser,
            type: 'SYSTEM_AUTO',
            title: 'Auto-Trigger: Overdue Invoice Reminder',
            description: `Sent automated email reminder for overdue invoice.`,
            isAutomatic: true,
          }
        });
        logger.info(`[automations-cron] Sent overdue reminder for invoice ${inv.id}`);
      } catch (e: any) {
        logger.warn(`[automations-cron] Failed invoice reminder for ${inv.id}: ${sanitizeForLog(e.message)}`);
      }
    }
  }
}

// ── 5. Pre-Appointment AI Pitch Prep ─────────────────────────────────────────
// Generates an AI pitch prep summary 2 hours before an appointment
async function processPreAppointmentPrep() {
  logger.info('[automations-cron] Running Pre-Appointment AI Pitch Prep...');
  const { prisma } = await import('../shared/services/prisma');
  const { leadScoringQueue } = await import('./index');

  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const twoHoursAndFifteenFromNow = new Date(Date.now() + 2.25 * 60 * 60 * 1000);

  const upcomingApts = await prisma.appointment.findMany({
    where: {
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
      scheduledAt: { gte: twoHoursFromNow, lte: twoHoursAndFifteenFromNow },
    },
    select: { id: true, leadId: true, organizationId: true, createdById: true },
  });

  for (const apt of upcomingApts) {
    try {
      // Trigger the AI scoring queue to generate the pitch prep (it caches the result)
      await leadScoringQueue.add('score-new-lead', { leadId: apt.leadId }, {
        attempts: 1,
      });

      await prisma.activity.create({
        data: {
          leadId: apt.leadId,
          userId: apt.createdById,
          type: 'SYSTEM_AUTO',
          title: 'Auto-Trigger: Pre-Appointment Pitch Prep',
          description: 'AI Pitch Prep has been generated for your upcoming appointment.',
          appointmentId: apt.id,
          isAutomatic: true,
        }
      });
      logger.info(`[automations-cron] Triggered AI Pitch Prep for appointment ${apt.id}`);
    } catch (e: any) {
      logger.warn(`[automations-cron] Failed pitch prep for ${apt.id}: ${sanitizeForLog(e.message)}`);
    }
  }
}

// ── Entry Points ─────────────────────────────────────────────────────────────

async function runDailyAutomations() {
  try {
    await processNoShows();
    await processStaleLeads();
    await processPostInstallReviews();
    await processOverdueInvoices();
  } catch (err: any) {
    logger.error(`[automations-cron] Daily automations failed: ${sanitizeForLog(err.message)}`);
  }
}

async function runHourlyAutomations() {
  try {
    await processPreAppointmentPrep();
  } catch (err: any) {
    logger.error(`[automations-cron] Hourly automations failed: ${sanitizeForLog(err.message)}`);
  }
}

export function startAutomationsCron(): void {
  logger.info('[automations-cron] Automations cron started (daily and hourly checks)');

  // Run immediately on startup
  runDailyAutomations();
  runHourlyAutomations();

  // Daily at roughly midnight (24h intervals)
  setInterval(runDailyAutomations, 24 * 60 * 60 * 1000);
  
  // Hourly
  setInterval(runHourlyAutomations, 60 * 60 * 1000);
}
