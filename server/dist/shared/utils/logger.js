"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.sanitizeForLog = sanitizeForLog;
const winston_1 = __importDefault(require("winston"));
const { combine, timestamp, printf, colorize, errors } = winston_1.default.format;
const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${stack || message}`;
    if (Object.keys(meta).length > 0) {
        log += ` ${JSON.stringify(meta)}`;
    }
    return log;
});
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), process.env.NODE_ENV === 'production'
        ? winston_1.default.format.json()
        : combine(colorize(), logFormat)),
    transports: [
        new winston_1.default.transports.Console(),
        ...(process.env.NODE_ENV === 'production'
            ? [
                new winston_1.default.transports.File({ filename: 'logs/error.log', level: 'error' }),
                new winston_1.default.transports.File({ filename: 'logs/combined.log' }),
            ]
            : []),
    ],
});
// Add HTTP level for morgan
exports.logger.add(new winston_1.default.transports.Console({
    format: winston_1.default.format.simple(),
    level: 'http',
    silent: process.env.NODE_ENV === 'test',
}));
/**
 * Sanitize a user-supplied string before embedding in log messages.
 * Prevents log injection by stripping newlines, carriage returns, and
 * other control characters that could be used to forge log entries.
 * (CodeQL: js/log-injection)
 */
function sanitizeForLog(value) {
    if (value === null || value === undefined)
        return '';
    return String(value)
        .replace(/[\r\n\t]/g, ' ') // newlines → space (blocks log injection)
        .replace(/[\x00-\x1f\x7f]/g, '') // strip other control chars
        .slice(0, 200); // cap length
}
//# sourceMappingURL=logger.js.map