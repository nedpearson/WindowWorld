"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.smsService = exports.SmsService = void 0;
const twilio_1 = __importDefault(require("twilio"));
const logger_1 = require("../utils/logger");
const isTwilioEnabled = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
const client = isTwilioEnabled
    ? (0, twilio_1.default)(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;
class SmsService {
    async sendSms(to, body) {
        // Sanitize user-supplied phone number and body before logging (CodeQL: js/log-injection)
        const safeTo = String((0, logger_1.sanitizeForLog)(to));
        if (!isTwilioEnabled || !client) {
            logger_1.logger.info(`[SMS SIMULATION] To: ${safeTo} | Message: [${body.length} chars]`);
            return true; // Simulate success in dev/test if lacking keys
        }
        try {
            await client.messages.create({
                body,
                from: process.env.TWILIO_PHONE_NUMBER,
                to,
            });
            logger_1.logger.info(`SMS sent to ${safeTo}: [${body.length} chars]`);
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Failed to send SMS to ${safeTo}: ${(0, logger_1.sanitizeForLog)(error.message)}`);
            return false;
        }
    }
}
exports.SmsService = SmsService;
exports.smsService = new SmsService();
//# sourceMappingURL=sms.service.js.map