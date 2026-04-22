import winston from 'winston';
export declare const logger: winston.Logger;
/**
 * Sanitize a user-supplied string before embedding in log messages.
 * Prevents log injection by stripping newlines, carriage returns, and
 * other control characters that could be used to forge log entries.
 * (CodeQL: js/log-injection)
 */
export declare function sanitizeForLog(value: unknown): string;
//# sourceMappingURL=logger.d.ts.map