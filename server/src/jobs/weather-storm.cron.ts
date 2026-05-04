/**
 * Weather Storm Cron
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs every 6 hours. Queries the NOAA National Weather Service (NWS) API
 * for active severe weather alerts in Louisiana. When a qualifying storm event
 * is detected in a territory's zip codes / parishes, it:
 *
 *  1. Flags all non-closed leads in that territory as `isStormLead = true`.
 *  2. Boosts their urgency score to 85.
 *  3. Auto-enrolls them in the "storm-lead-urgency" campaign (if not already enrolled).
 *  4. Broadcasts a `storm:activated` WebSocket event to all online reps in that org.
 *  5. Records an audit activity so managers can see the trigger in each lead timeline.
 *
 * NWS API is completely free — no API key needed.
 * Docs: https://www.weather.gov/documentation/services-web-api
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { logger, sanitizeForLog } from '../shared/utils/logger';

// ── NWS severe alert event types that qualify as "storm opportunity" ─────────

const QUALIFYING_EVENT_TYPES = new Set([
  'Tornado Warning',
  'Tornado Watch',
  'Severe Thunderstorm Warning',
  'Severe Thunderstorm Watch',
  'Hurricane Warning',
  'Hurricane Watch',
  'Hurricane Local Statement',
  'Tropical Storm Warning',
  'Tropical Storm Watch',
  'Extreme Wind Warning',
  'High Wind Warning',
  'High Wind Watch',
  'Special Weather Statement',
]);

// Minimum NWS severity we care about
const QUALIFYING_SEVERITY = new Set(['Extreme', 'Severe', 'Moderate']);

// ── Type definitions ─────────────────────────────────────────────────────────

interface StormEventSummary {
  alertId: string;
  event: string;
  severity: string;
  headline: string;
  description: string;
  areaDesc: string;
  parishes: string[];
  expires: Date;
}

// ── Fetch active NWS alerts for Louisiana ────────────────────────────────────

async function fetchLouisianaStormAlerts(): Promise<StormEventSummary[]> {
  const url = 'https://api.weather.gov/alerts/active?area=LA&status=actual';

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'WindowWorld-CRM/1.0 (info@windowworldlouisiana.com)',
      'Accept': 'application/geo+json',
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`NWS API returned ${res.status}: ${res.statusText}`);
  }

  const json = await res.json() as {
    features?: Array<{
      id: string;
      properties: {
        event: string;
        severity: string;
        status: string;
        messageType: string;
        effective: string;
        expires: string;
        headline: string;
        description: string;
        areaDesc: string;
      };
    }>;
  };

  const features = json.features || [];
  const qualifying: StormEventSummary[] = [];

  for (const feature of features) {
    const props = feature.properties;

    if (!QUALIFYING_EVENT_TYPES.has(props.event)) continue;
    if (!QUALIFYING_SEVERITY.has(props.severity)) continue;
    if (props.messageType === 'Cancel') continue;
    if (new Date(props.expires) < new Date()) continue;

    const parishes = extractParishesFromAreaDesc(props.areaDesc);
    if (parishes.length === 0) continue;

    qualifying.push({
      alertId: feature.id,
      event: props.event,
      severity: props.severity,
      headline: props.headline,
      description: props.description.substring(0, 1000),
      areaDesc: props.areaDesc,
      parishes,
      expires: new Date(props.expires),
    });
  }

  return qualifying;
}

/**
 * Extracts Louisiana parish names from a NWS areaDesc string.
 * NWS uses formats like:
 *   "Acadia; Allen; Ascension..." or "St. Tammany Parish, LA; Tangipahoa Parish, LA"
 */
function extractParishesFromAreaDesc(areaDesc: string): string[] {
  const LOUISIANA_PARISHES = [
    'Acadia', 'Allen', 'Ascension', 'Assumption', 'Avoyelles', 'Beauregard',
    'Bienville', 'Bossier', 'Caddo', 'Calcasieu', 'Caldwell', 'Cameron',
    'Catahoula', 'Claiborne', 'Concordia', 'De Soto', 'East Baton Rouge',
    'East Carroll', 'East Feliciana', 'Evangeline', 'Franklin', 'Grant',
    'Iberia', 'Iberville', 'Jackson', 'Jefferson', 'Jefferson Davis',
    'La Salle', 'Lafayette', 'Lafourche', 'Lincoln', 'Livingston', 'Madison',
    'Morehouse', 'Natchitoches', 'Orleans', 'Ouachita', 'Plaquemines',
    'Pointe Coupee', 'Rapides', 'Red River', 'Richland', 'Sabine',
    'St. Bernard', 'St. Charles', 'St. Helena', 'St. James',
    'St. John the Baptist', 'St. Landry', 'St. Martin', 'St. Mary',
    'St. Tammany', 'Tangipahoa', 'Tensas', 'Terrebonne', 'Union',
    'Vermilion', 'Vernon', 'Washington', 'Webster', 'West Baton Rouge',
    'West Carroll', 'West Feliciana', 'Winn',
  ];

  const found: string[] = [];
  for (const parish of LOUISIANA_PARISHES) {
    const escaped = parish.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(escaped, 'i').test(areaDesc)) {
      found.push(parish);
    }
  }
  return found;
}

// ── Core storm activation logic ───────────────────────────────────────────────

async function processStormAlerts(alerts: StormEventSummary[]): Promise<void> {
  if (alerts.length === 0) {
    logger.info('[storm-cron] No qualifying storm alerts active in Louisiana');
    return;
  }

  logger.info(`[storm-cron] Processing ${alerts.length} qualifying alert(s)`);

  const { prisma } = await import('../shared/services/prisma');
  const { campaignsService } = await import('../modules/campaigns/campaigns.service');

  // Union of all affected parishes across all alerts
  const allAffectedParishes = new Set<string>();
  for (const alert of alerts) {
    alert.parishes.forEach((p) => allAffectedParishes.add(p));
  }

  logger.info(`[storm-cron] Affected parishes: ${[...allAffectedParishes].join(', ')}`);

  // Territories that overlap with affected parishes
  const affectedTerritories = await prisma.territory.findMany({
    where: {
      isActive: true,
      parishes: { hasSome: [...allAffectedParishes] },
    },
    include: {
      organization: { select: { id: true, name: true } },
    },
  });

  if (affectedTerritories.length === 0) {
    logger.info('[storm-cron] No territories map to affected parishes — no action taken');
    return;
  }

  logger.info(`[storm-cron] ${affectedTerritories.length} territory/ies affected`);

  // Resolve a system-actor user per org (for activity attribution)
  const orgSystemUserMap = new Map<string, string>();
  for (const territory of affectedTerritories) {
    const orgId = territory.organization.id;
    if (!orgSystemUserMap.has(orgId)) {
      const systemUser = await prisma.user.findFirst({
        where: {
          organizationId: orgId,
          isActive: true,
          role: { in: ['SUPER_ADMIN', 'SALES_MANAGER'] },
        },
        select: { id: true },
      });
      if (systemUser) orgSystemUserMap.set(orgId, systemUser.id);
    }
  }

  for (const territory of affectedTerritories) {
    const orgId = territory.organization.id;
    const systemUserId = orgSystemUserMap.get(orgId);
    if (!systemUserId) {
      logger.warn(`[storm-cron] No admin user found for org ${orgId} — skipping territory "${territory.name}"`);
      continue;
    }

    // Pick the most severe alert that overlaps this territory
    const relevantAlert = alerts.find((a) =>
      a.parishes.some((p) => territory.parishes.includes(p))
    )!;

    logger.info(`[storm-cron] Territory "${territory.name}" (${territory.organization.name}) matched alert: ${relevantAlert.event}`);

    // ── 1. Flag leads ────────────────────────────────────────────────────────
    const updateResult = await prisma.lead.updateMany({
      where: {
        territoryId: territory.id,
        organizationId: orgId,
        deletedAt: null,
        isStormLead: false,
        status: {
          notIn: ['SOLD', 'LOST', 'INSTALLED', 'PAID', 'ORDERED', 'NURTURE'],
        },
      },
      data: {
        isStormLead: true,
        stormEventId: relevantAlert.alertId,
        urgencyScore: 85,
        updatedAt: new Date(),
      },
    });

    logger.info(`[storm-cron] Flagged ${updateResult.count} lead(s) in territory "${territory.name}"`);
    if (updateResult.count === 0) continue;

    // ── 2. Enroll flagged leads in storm campaign ────────────────────────────
    const stormLeads = await prisma.lead.findMany({
      where: {
        territoryId: territory.id,
        organizationId: orgId,
        isStormLead: true,
        stormEventId: relevantAlert.alertId,
        deletedAt: null,
        status: {
          notIn: ['SOLD', 'LOST', 'INSTALLED', 'PAID', 'ORDERED', 'NURTURE'],
        },
      },
      select: { id: true, organizationId: true },
    });

    let enrolledCount = 0;
    for (const lead of stormLeads) {
      try {
        const result = await campaignsService.enroll(lead.id, lead.organizationId, 'storm-lead-urgency', systemUserId);
        if (result.enrolled) enrolledCount++;
      } catch (err: any) {
        logger.warn(`[storm-cron] Campaign enroll failed for lead ${lead.id}: ${sanitizeForLog(err.message)}`);
      }
    }

    logger.info(`[storm-cron] Enrolled ${enrolledCount}/${stormLeads.length} lead(s) in storm-lead-urgency campaign`);

    // ── 3. Log activity on each lead timeline ────────────────────────────────
    const activityTitle = `⚡ Auto Storm Alert: ${relevantAlert.event}`;
    const activityDesc =
      `${relevantAlert.headline}\n\n` +
      `Affected area: ${relevantAlert.areaDesc}\n\n` +
      `Expires: ${relevantAlert.expires.toLocaleString('en-US', { timeZone: 'America/Chicago' })} CT\n\n` +
      `This lead was automatically flagged and enrolled in the Storm Urgency campaign by the weather monitoring system.`;

    const CHUNK = 50;
    for (let i = 0; i < stormLeads.length; i += CHUNK) {
      const chunk = stormLeads.slice(i, i + CHUNK);
      await prisma.activity.createMany({
        data: chunk.map((lead) => ({
          leadId: lead.id,
          userId: systemUserId,
          type: 'SYSTEM_AUTO' as const,
          title: activityTitle,
          description: activityDesc,
          isAutomatic: true,
        })) as any[],
        skipDuplicates: true,
      });
    }

    // ── 4. Broadcast real-time WebSocket event ───────────────────────────────
    try {
      const { wsService } = await import('../shared/services/websocket.service');
      wsService.notifyOrganization(orgId, 'storm:activated', {
        territoryId: territory.id,
        territoryName: territory.name,
        alertEvent: relevantAlert.event,
        alertSeverity: relevantAlert.severity,
        headline: relevantAlert.headline,
        affectedParishes: territory.parishes.filter((p) => allAffectedParishes.has(p)),
        leadsUpdated: updateResult.count,
        leadsEnrolled: enrolledCount,
        expiresAt: relevantAlert.expires.toISOString(),
      });
      logger.info(`[storm-cron] Broadcast storm:activated to org ${orgId}`);
    } catch (err: any) {
      logger.warn(`[storm-cron] WebSocket broadcast failed: ${sanitizeForLog(err.message)}`);
    }

    logger.info(
      `[storm-cron] ✓ "${territory.name}": ${updateResult.count} flagged, ` +
      `${enrolledCount} campaign-enrolled, WebSocket notified`
    );
  }
}

// ── One cron cycle ────────────────────────────────────────────────────────────

async function runWeatherStormCheck(): Promise<void> {
  logger.info('[storm-cron] Running weather storm check...');
  try {
    const alerts = await fetchLouisianaStormAlerts();
    await processStormAlerts(alerts);
  } catch (err: any) {
    // Non-fatal: NWS may be briefly unavailable
    logger.error(`[storm-cron] Cycle failed: ${sanitizeForLog(err.message)}`);
  }
}

// ── Public entry point ────────────────────────────────────────────────────────

const INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

export function startWeatherStormCron(): void {
  logger.info('[storm-cron] Weather storm cron started (checks every 6 hours)');
  runWeatherStormCheck();                        // Run immediately on startup
  setInterval(runWeatherStormCheck, INTERVAL_MS);
}
