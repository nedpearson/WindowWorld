import twilio from 'twilio';
import { logger } from '../utils/logger';

const isTwilioEnabled = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);

const client = isTwilioEnabled 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) 
  : null;

export class SmsService {
  async sendSms(to: string, body: string): Promise<boolean> {
    if (!isTwilioEnabled || !client) {
      logger.info(`[SMS SIMULATION] To: ${to} | Message: ${body}`);
      return true; // Simulate success in dev/test if lacking keys
    }

    try {
      await client.messages.create({
        body,
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
      });
      logger.info(`SMS sent to ${to}: ${body.substring(0, 30)}...`);
      return true;
    } catch (error: any) {
      logger.error(`Failed to send SMS to ${to}: ${error.message}`);
      return false;
    }
  }
}

export const smsService = new SmsService();
