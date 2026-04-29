/**
 * twilio.service.ts
 * Centralised Twilio integration for the WindowWorld platform.
 *
 * Capabilities:
 *  • SMS — send transactional or manual texts to any E.164 number
 *  • Outbound calls — initiate Twilio-hosted calls (rep's browser or phone)
 *  • TwiML — generate voice response XML for inbound / outbound call flows
 *  • Status callbacks — receive and process call / message status updates from Twilio
 *  • Recording — retrieve call recording URLs after the call ends
 *
 * All operations degrade gracefully in dev / test when TWILIO_* env vars are absent
 * (simulation mode — logs the action instead of hitting Twilio APIs).
 */
import twilio, { Twilio } from 'twilio';
import { logger, sanitizeForLog } from '../utils/logger';

// ── Environment -----------------------------------------------------------
const ACCOUNT_SID   = process.env.TWILIO_ACCOUNT_SID  || '';
const AUTH_TOKEN    = process.env.TWILIO_AUTH_TOKEN    || '';
const FROM_NUMBER   = process.env.TWILIO_PHONE_NUMBER  || '';
const APP_URL       = process.env.APP_URL              || 'https://app.windowworldla.com';
const TWIML_APP_SID = process.env.TWILIO_TWIML_APP_SID || ''; // Optional – for browser calling

export const isTwilioEnabled = !!(ACCOUNT_SID && AUTH_TOKEN && FROM_NUMBER);

let client: Twilio | null = null;
if (isTwilioEnabled) {
  client = twilio(ACCOUNT_SID, AUTH_TOKEN);
  logger.info('Twilio client initialized (calls + SMS enabled)');
} else {
  logger.warn('Twilio env vars missing — running in SMS/call simulation mode');
}

// ── Types -----------------------------------------------------------------
export interface SmsResult {
  success: boolean;
  sid?: string;
  error?: string;
  simulated?: boolean;
}

export interface CallResult {
  success: boolean;
  sid?: string;
  status?: string;
  error?: string;
  simulated?: boolean;
}

export interface AccessTokenResult {
  token: string;
  identity: string;
  simulated?: boolean;
}

// ── SMS ------------------------------------------------------------------
/**
 * Send an SMS via Twilio.
 * @param to    E.164 phone number, e.g. +12255550100
 * @param body  Message text (Twilio truncates at 1600 chars)
 */
export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const safeTo = String(sanitizeForLog(to));

  if (!isTwilioEnabled || !client) {
    logger.info(`[SMS SIMULATION] To: ${safeTo} | ${body.length} chars`);
    return { success: true, sid: `SIM_SMS_${Date.now()}`, simulated: true };
  }

  try {
    const msg = await client.messages.create({ body, from: FROM_NUMBER, to });
    logger.info(`SMS sent sid=${msg.sid} to=${safeTo}`);
    return { success: true, sid: msg.sid };
  } catch (err: any) {
    logger.error(`SMS failed to=${safeTo}: ${sanitizeForLog(err.message)}`);
    return { success: false, error: err.message };
  }
}

// ── Outbound Call --------------------------------------------------------
/**
 * Initiate an outbound PSTN call via Twilio.
 * Twilio will first call `callbackUrl` to fetch TwiML, then bridge to `to`.
 *
 * @param to          Customer E.164 number to call
 * @param repUserId   Rep's user ID — used to build a per-call TwiML endpoint
 * @param leadId      Lead ID — stored as metadata in the Activity record
 */
export async function initiateCall(
  to: string,
  repUserId: string,
  leadId: string,
): Promise<CallResult> {
  const safeTo = String(sanitizeForLog(to));

  if (!isTwilioEnabled || !client) {
    logger.info(`[CALL SIMULATION] outbound to=${safeTo} rep=${repUserId} lead=${leadId}`);
    return {
      success: true,
      sid: `SIM_CALL_${Date.now()}`,
      status: 'initiated',
      simulated: true,
    };
  }

  try {
    // The TwiML at this URL tells Twilio what to do with the call.
    // We pass lead + rep as query params so the webhook can look them up.
    const twimlUrl = `${APP_URL}/api/v1/communications/twiml/outbound?leadId=${encodeURIComponent(leadId)}&repId=${encodeURIComponent(repUserId)}`;
    const statusCallback = `${APP_URL}/api/v1/communications/webhooks/call-status`;

    const call = await client.calls.create({
      to,
      from: FROM_NUMBER,
      url: twimlUrl,
      statusCallback,
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      record: true, // Auto-record — stored in Twilio and retrievable via recording URL
      recordingStatusCallback: `${APP_URL}/api/v1/communications/webhooks/recording`,
    });

    logger.info(`Call initiated sid=${call.sid} to=${safeTo}`);
    return { success: true, sid: call.sid, status: call.status };
  } catch (err: any) {
    logger.error(`Call failed to=${safeTo}: ${sanitizeForLog(err.message)}`);
    return { success: false, error: err.message };
  }
}

// ── TwiML Builders -------------------------------------------------------
/**
 * Generate TwiML for an outbound call.
 * Plays a brief intro then dials the customer's number.
 */
export function buildOutboundTwiML(customerPhone: string, repName: string): string {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();
  response.say(
    { voice: 'Polly.Joanna', language: 'en-US' },
    `Connecting you to your customer now.`,
  );
  const dial = response.dial({ callerId: FROM_NUMBER, record: 'record-from-ringing', timeout: 30 });
  dial.number(customerPhone);
  return response.toString();
}

/**
 * Generate TwiML for inbound calls — greet caller and queue them.
 */
export function buildInboundTwiML(): string {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();
  response.say(
    { voice: 'Polly.Joanna', language: 'en-US' },
    'Thank you for calling WindowWorld. Please hold while we connect you to a representative.',
  );
  response.pause({ length: 1 });
  response.enqueue('windowworld-queue');
  return response.toString();
}

// ── Browser Calling Token ------------------------------------------------
/**
 * Generate a Twilio Access Token so a rep's browser tab can make/receive calls
 * using the Twilio Voice JS SDK.
 * Requires TWILIO_TWIML_APP_SID in env.
 */
export function generateAccessToken(repUserId: string): AccessTokenResult {
  if (!isTwilioEnabled || !TWIML_APP_SID) {
    logger.info(`[TOKEN SIMULATION] identity=${repUserId}`);
    return { token: `SIM_TOKEN_${repUserId}_${Date.now()}`, identity: repUserId, simulated: true };
  }

  const { AccessToken } = twilio.jwt;
  const { VoiceGrant } = AccessToken;
  const identity = `rep_${repUserId.replace(/-/g, '')}`;

  const token = new AccessToken(ACCOUNT_SID, TWIML_APP_SID, AUTH_TOKEN, {
    identity,
    ttl: 3600, // 1 hour
  });

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: TWIML_APP_SID,
    incomingAllow: true,
  });
  token.addGrant(voiceGrant);

  return { token: token.toJwt(), identity };
}

// ── Recording ------------------------------------------------------------
/**
 * Fetch all recording URLs for a completed call SID.
 */
export async function getCallRecordings(callSid: string): Promise<string[]> {
  if (!isTwilioEnabled || !client) return [];

  try {
    const recordings = await client.recordings.list({ callSid });
    return recordings.map(
      (r) => `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Recordings/${r.sid}.mp3`,
    );
  } catch (err: any) {
    logger.warn(`Could not fetch recordings for call ${sanitizeForLog(callSid)}: ${sanitizeForLog(err.message)}`);
    return [];
  }
}

// ── Validate Webhook Signature -------------------------------------------
/**
 * Validate that an incoming HTTP request is genuinely from Twilio.
 * Use this in webhook middleware to reject spoofed requests.
 */
export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  if (!isTwilioEnabled) return true; // Skip validation in dev/simulation
  return twilio.validateRequest(AUTH_TOKEN, signature, url, params);
}

// ── Compat export (backwards-compat with old sms.service.ts usage) ------
export const smsService = {
  sendSms: (to: string, body: string) => sendSms(to, body),
};

export default {
  sendSms,
  initiateCall,
  buildOutboundTwiML,
  buildInboundTwiML,
  generateAccessToken,
  getCallRecordings,
  validateTwilioSignature,
  isTwilioEnabled,
};
