import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

declare global {
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? [
          { level: 'query', emit: 'event' },
          { level: 'warn', emit: 'stdout' },
          { level: 'error', emit: 'stdout' },
        ]
      : [{ level: 'error', emit: 'stdout' }],
  });

  if (process.env.NODE_ENV === 'development') {
    (client as any).$on('query', (e: any) => {
      if (process.env.LOG_QUERIES === 'true') {
        logger.debug(`Query: ${e.query}`, { duration: `${e.duration}ms` });
      }
    });
  }

  return client;
}

// Singleton pattern to avoid multiple connections in development (hot reload)
export const prisma = global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export default prisma;
