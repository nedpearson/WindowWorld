/**
 * google-calendar.service.ts
 * Google Calendar integration for WindowWorld appointment scheduling.
 *
 * Features:
 *  1. OAuth2 flow — generate consent URL, exchange code for tokens
 *  2. Token management — auto-refresh expired access tokens, store encrypted
 *  3. Busy-time checking — fetch freebusy for a time window before booking
 *  4. Event sync — push WW appointments to the user's Google Calendar
 *  5. Event deletion — remove synced event on appointment cancel
 *
 * Env vars required:
 *   GOOGLE_CLIENT_ID      — from Google Cloud Console (same OAuth2 app)
 *   GOOGLE_CLIENT_SECRET  — from Google Cloud Console
 *   GOOGLE_REDIRECT_URI   — e.g. https://yourapp.com/api/v1/calendar/oauth/callback
 *   GCAL_TOKEN_SECRET     — random 32+ char string used to AES encrypt stored tokens
 *
 * Gracefully no-ops when GOOGLE_CLIENT_ID is not set.
 */
import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as crypto from 'crypto';
import { prisma } from './prisma';
import { logger, sanitizeForLog } from '../utils/logger';

// ── Config ────────────────────────────────────────────────────────────────
const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI  ||
  `${process.env.APP_URL || 'http://localhost:3001'}/api/v1/calendar/oauth/callback`;
const TOKEN_SECRET  = process.env.GCAL_TOKEN_SECRET    || 'dev-only-not-secure-change-me!';

export const isCalendarEnabled = !!(CLIENT_ID && CLIENT_SECRET);

if (isCalendarEnabled) {
  logger.info('Google Calendar OAuth configured');
} else {
  logger.warn('GOOGLE_CLIENT_ID / SECRET not set — Google Calendar disabled');
}

// ── Scopes ────────────────────────────────────────────────────────────────
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',   // Create / update / delete events
  'https://www.googleapis.com/auth/calendar.readonly',  // List busy times + read calendars
];

// ── Encryption helpers (AES-256-GCM) ─────────────────────────────────────
const ALGO    = 'aes-256-gcm';
const KEY_BUF = crypto.scryptSync(TOKEN_SECRET, 'gcal-salt', 32);

function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY_BUF, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

function decrypt(encoded: string): string {
  const buf = Buffer.from(encoded, 'base64');
  const iv  = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, KEY_BUF, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

// ── OAuth2 client factory ─────────────────────────────────────────────────
function makeOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

// ── Step 1: Generate OAuth consent URL ───────────────────────────────────
/**
 * Returns the Google OAuth2 consent URL the user must visit in their browser.
 * Pass userId as state so we know who to attach the tokens to on callback.
 */
export function getAuthUrl(userId: string): string {
  if (!isCalendarEnabled) return '';
  const oauth2 = makeOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',         // Always get a refresh_token
    scope: SCOPES,
    state: userId,
  });
}

// ── Step 2: Exchange auth code for tokens + save ──────────────────────────
export async function handleOAuthCallback(code: string, userId: string): Promise<void> {
  if (!isCalendarEnabled) throw new Error('Google Calendar not configured');
  const oauth2 = makeOAuth2Client();
  const { tokens } = await oauth2.getToken(code);

  await (prisma.user as any).update({
    where: { id: userId },
    data: {
      gcalAccessToken:  tokens.access_token  ? encrypt(tokens.access_token)  : undefined,
      gcalRefreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
      gcalTokenExpiry:  tokens.expiry_date   ? new Date(tokens.expiry_date)  : undefined,
      gcalSyncEnabled:  true,
      gcalConnectedAt:  new Date(),
    },
  });
  logger.info(`Google Calendar connected for user ${sanitizeForLog(userId)}`);
}

// ── Disconnect ────────────────────────────────────────────────────────────
export async function disconnectCalendar(userId: string): Promise<void> {
  const user = await (prisma.user as any).findUnique({
    where: { id: userId },
    select: { gcalAccessToken: true },
  });
  if (user?.gcalAccessToken) {
    try {
      const oauth2 = makeOAuth2Client();
      oauth2.setCredentials({ access_token: decrypt(user.gcalAccessToken) });
      await oauth2.revokeCredentials();
    } catch { /* ignore revocation errors */ }
  }
  await (prisma.user as any).update({
    where: { id: userId },
    data: {
      gcalAccessToken: null,
      gcalRefreshToken: null,
      gcalTokenExpiry: null,
      gcalSyncEnabled: false,
      gcalConnectedAt: null,
    },
  });
  logger.info(`Google Calendar disconnected for user ${sanitizeForLog(userId)}`);
}

// ── Get authenticated Calendar client for a user ──────────────────────────
async function getCalendarClient(userId: string): Promise<calendar_v3.Calendar | null> {
  const user = await (prisma.user as any).findUnique({
    where: { id: userId },
    select: {
      gcalAccessToken: true,
      gcalRefreshToken: true,
      gcalTokenExpiry: true,
      gcalSyncEnabled: true,
    },
  });

  if (!user?.gcalSyncEnabled || !user.gcalRefreshToken) return null;

  const oauth2 = makeOAuth2Client();
  oauth2.setCredentials({
    access_token:  user.gcalAccessToken  ? decrypt(user.gcalAccessToken)  : undefined,
    refresh_token: user.gcalRefreshToken ? decrypt(user.gcalRefreshToken) : undefined,
    expiry_date:   user.gcalTokenExpiry  ? user.gcalTokenExpiry.getTime() : undefined,
  });

  // Auto-refresh if token is expired or expiring within 5 minutes
  const expiresAt = user.gcalTokenExpiry ? user.gcalTokenExpiry.getTime() : 0;
  if (expiresAt < Date.now() + 5 * 60 * 1000) {
    try {
      const { credentials } = await oauth2.refreshAccessToken();
      await (prisma.user as any).update({
        where: { id: userId },
        data: {
          gcalAccessToken: credentials.access_token ? encrypt(credentials.access_token) : undefined,
          gcalTokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
        },
      });
      oauth2.setCredentials(credentials);
    } catch (err: any) {
      logger.error(`GCal token refresh failed for user ${sanitizeForLog(userId)}: ${sanitizeForLog(err.message)}`);
      return null;
    }
  }

  return google.calendar({ version: 'v3', auth: oauth2 });
}

// ── Check for conflicts with personal Google Calendar ────────────────────
export interface BusyBlock {
  start: string; // ISO
  end: string;   // ISO
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflicts: BusyBlock[];
  calendarConnected: boolean;
}

/**
 * Check if a proposed time window overlaps with busy blocks in the user's
 * Google Calendar. Returns hasConflict=true if any overlap found.
 *
 * @param userId      Rep's user ID
 * @param startAt     Appointment start (ISO string or Date)
 * @param endAt       Appointment end (ISO string or Date)
 */
export async function checkForConflicts(
  userId: string,
  startAt: Date | string,
  endAt: Date | string,
): Promise<ConflictCheckResult> {
  const calClient = await getCalendarClient(userId);
  if (!calClient) {
    return { hasConflict: false, conflicts: [], calendarConnected: false };
  }

  const user = await (prisma.user as any).findUnique({
    where: { id: userId },
    select: { gcalCalendarId: true },
  });
  const calendarId = user?.gcalCalendarId || 'primary';

  try {
    const resp = await calClient.freebusy.query({
      requestBody: {
        timeMin: new Date(startAt).toISOString(),
        timeMax: new Date(endAt).toISOString(),
        items: [{ id: calendarId }],
      },
    });

    const busyTimes: BusyBlock[] =
      (resp.data.calendars?.[calendarId]?.busy || []).map((b) => ({
        start: b.start || '',
        end:   b.end   || '',
      }));

    return {
      hasConflict:      busyTimes.length > 0,
      conflicts:        busyTimes,
      calendarConnected: true,
    };
  } catch (err: any) {
    logger.error(`GCal freebusy check failed: ${sanitizeForLog(err.message)}`);
    // Fail open — don't block booking on calendar errors
    return { hasConflict: false, conflicts: [], calendarConnected: true };
  }
}

// ── Get all busy blocks for a day/week (for the frontend calendar) ────────
export async function getBusyBlocks(
  userId: string,
  startAt: Date,
  endAt: Date,
): Promise<BusyBlock[]> {
  const calClient = await getCalendarClient(userId);
  if (!calClient) return [];

  const user = await (prisma.user as any).findUnique({
    where: { id: userId },
    select: { gcalCalendarId: true },
  });
  const calendarId = user?.gcalCalendarId || 'primary';

  try {
    const resp = await calClient.freebusy.query({
      requestBody: {
        timeMin: startAt.toISOString(),
        timeMax: endAt.toISOString(),
        items: [{ id: calendarId }],
      },
    });
    return (resp.data.calendars?.[calendarId]?.busy || []).map((b) => ({
      start: b.start || '',
      end:   b.end   || '',
    }));
  } catch (err: any) {
    logger.warn(`getBusyBlocks failed: ${sanitizeForLog(err.message)}`);
    return [];
  }
}

// ── Sync appointment to Google Calendar ───────────────────────────────────
export interface SyncAppointmentInput {
  userId: string;
  appointmentId: string;
  title: string;
  description?: string;
  location?: string;
  startAt: Date;
  endAt: Date;
  customerName: string;
  customerPhone?: string;
}

/**
 * Create or update a Google Calendar event for a WW appointment.
 * Returns the Google event ID (stored in DB for future updates/deletes).
 */
export async function syncAppointmentToGoogle(
  input: SyncAppointmentInput,
): Promise<string | null> {
  const calClient = await getCalendarClient(input.userId);
  if (!calClient) return null;

  const user = await (prisma.user as any).findUnique({
    where: { id: input.userId },
    select: { gcalCalendarId: true },
  });
  const calendarId = user?.gcalCalendarId || 'primary';

  const event: calendar_v3.Schema$Event = {
    summary: `[WW] ${input.title}`,
    description: [
      input.description || '',
      `Customer: ${input.customerName}`,
      input.customerPhone ? `Phone: ${input.customerPhone}` : '',
      `WW Appointment ID: ${input.appointmentId}`,
    ].filter(Boolean).join('\n'),
    location: input.location,
    start: { dateTime: input.startAt.toISOString(), timeZone: 'America/Chicago' },
    end:   { dateTime: input.endAt.toISOString(),   timeZone: 'America/Chicago' },
    colorId: '1', // Lavender — stands out from personal events
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },
        { method: 'popup', minutes: 15 },
      ],
    },
    source: {
      title: 'WindowWorld',
      url: `${process.env.APP_URL || ''}/appointments`,
    },
  };

  try {
    const resp = await calClient.events.insert({ calendarId, requestBody: event });
    const googleEventId = resp.data.id || null;
    logger.info(`GCal event created: ${googleEventId} for apt ${sanitizeForLog(input.appointmentId)}`);
    return googleEventId;
  } catch (err: any) {
    logger.warn(`GCal sync failed for apt ${sanitizeForLog(input.appointmentId)}: ${sanitizeForLog(err.message)}`);
    return null;
  }
}

// ── Delete Google Calendar event on appointment cancel ────────────────────
export async function deleteGoogleEvent(userId: string, googleEventId: string): Promise<void> {
  const calClient = await getCalendarClient(userId);
  if (!calClient) return;

  const user = await (prisma.user as any).findUnique({
    where: { id: userId },
    select: { gcalCalendarId: true },
  });
  const calendarId = user?.gcalCalendarId || 'primary';

  try {
    await calClient.events.delete({ calendarId, eventId: googleEventId });
    logger.info(`GCal event deleted: ${sanitizeForLog(googleEventId)}`);
  } catch (err: any) {
    logger.warn(`GCal event delete failed: ${sanitizeForLog(err.message)}`);
  }
}

// ── Get user's calendar connection status ─────────────────────────────────
export async function getCalendarStatus(userId: string) {
  const user = await (prisma.user as any).findUnique({
    where: { id: userId },
    select: { gcalSyncEnabled: true, gcalConnectedAt: true, gcalCalendarId: true, gcalTokenExpiry: true },
  });
  return {
    connected:   user?.gcalSyncEnabled ?? false,
    connectedAt: user?.gcalConnectedAt ?? null,
    calendarId:  user?.gcalCalendarId ?? 'primary',
    tokenExpiry: user?.gcalTokenExpiry ?? null,
    enabled:     isCalendarEnabled,
  };
}
