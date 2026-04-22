import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level}]: ${stack || message}`;
  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`;
  }
  return log;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : combine(colorize(), logFormat)
  ),
  transports: [
    new winston.transports.Console(),
    ...(process.env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
});

// Add HTTP level for morgan
logger.add(new winston.transports.Console({
  format: winston.format.simple(),
  level: 'http',
  silent: process.env.NODE_ENV === 'test',
}));

/**
 * Sanitize a user-supplied string before embedding in log messages.
 * Prevents log injection by stripping newlines, carriage returns, and
 * other control characters that could be used to forge log entries.
 * (CodeQL: js/log-injection)
 */
export function sanitizeForLog(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/[\r\n\t]/g, ' ')        // newlines → space (blocks log injection)
    .replace(/[\x00-\x1f\x7f]/g, '') // strip other control chars
    .slice(0, 200);                    // cap length
}
