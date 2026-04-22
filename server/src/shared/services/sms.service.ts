import twilio from 'twilio';
import { logger, sanitizeForLog } from '../utils/logger';

const isTwilioEnabled = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);

const client = isTwilioEnabled 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) 
  : null;

export class SmsService {
  async sendSms(to: string, body: string): Promise<boolean> {
    // Sanitize user-supplied phone number and body before logging (CodeQL: js/log-injection)
    const safeTo = sanitizeForLog(to);
    if (!isTwilioEnabled || !client) {
      logger.info(`[SMS SIMULATION] To: ${safeTo} | Message: [${body.length} chars]`);
      return true; // Simulate success in dev/test if lacking keys
    }

    try {
      await client.messages.create({
        body,
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
      });
      logger.info(`SMS sent to ${safeTo}: [${body.length} chars]`);
      return true;
    } catch (error: any) {
      logger.error(`Failed to send SMS to ${safeTo}: ${sanitizeForLog(error.message)}`);
      return false;
    }
  }
}

export const smsService = new SmsService();
