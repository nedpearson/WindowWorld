"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
function createPrismaClient() {
    const client = new client_1.PrismaClient({
        log: process.env.NODE_ENV === 'development'
            ? [
                { level: 'query', emit: 'event' },
                { level: 'warn', emit: 'stdout' },
                { level: 'error', emit: 'stdout' },
            ]
            : [{ level: 'error', emit: 'stdout' }],
    });
    if (process.env.NODE_ENV === 'development') {
        client.$on('query', (e) => {
            if (process.env.LOG_QUERIES === 'true') {
                logger_1.logger.debug(`Query: ${e.query}`, { duration: `${e.duration}ms` });
            }
        });
    }
    return client;
}
// Singleton pattern to avoid multiple connections in development (hot reload)
exports.prisma = global.__prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== 'production') {
    global.__prisma = exports.prisma;
}
exports.default = exports.prisma;
//# sourceMappingURL=prisma.js.map