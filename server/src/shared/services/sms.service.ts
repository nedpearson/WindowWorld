/**
 * sms.service.ts — backwards-compatibility shim.
 * All SMS logic now lives in twilio.service.ts.
 * This file is kept so existing imports don't break.
 */
export { smsService, sendSms } from './twilio.service';
