"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
let app;
(0, vitest_1.beforeAll)(async () => {
    // Set required env vars before importing the app to pass startup validation
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-minimum-32-chars-long-ok';
    process.env.NODE_ENV = 'test';
    const module = await Promise.resolve().then(() => __importStar(require('../index')));
    app = module.app;
});
(0, vitest_1.describe)('Health Endpoint', () => {
    (0, vitest_1.it)('GET /health returns status field', async () => {
        const res = await (0, supertest_1.default)(app).get('/health');
        // 200 (db ok) or 503 (db degraded) are both acceptable — endpoint is responding
        (0, vitest_1.expect)([200, 503]).toContain(res.status);
        (0, vitest_1.expect)(res.body).toHaveProperty('status');
        (0, vitest_1.expect)(res.body).toHaveProperty('timestamp');
        (0, vitest_1.expect)(res.body).toHaveProperty('env');
        (0, vitest_1.expect)(res.body).toHaveProperty('db');
    });
});
(0, vitest_1.describe)('Auth Protection', () => {
    (0, vitest_1.it)('GET /api/v1/leads returns 401 without token', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/v1/leads');
        (0, vitest_1.expect)(res.status).toBe(401);
    });
    (0, vitest_1.it)('GET /api/v1/notifications returns 401 without token', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/v1/notifications');
        (0, vitest_1.expect)(res.status).toBe(401);
    });
    (0, vitest_1.it)('GET /api/v1/openings without auth returns 400 or 401', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/v1/openings');
        (0, vitest_1.expect)([400, 401]).toContain(res.status);
    });
    (0, vitest_1.it)('POST /api/v1/auth/login with bad creds returns error', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/api/v1/auth/login')
            .send({ email: 'notauser@test.com', password: 'wrongpassword' });
        (0, vitest_1.expect)([400, 401, 422]).toContain(res.status);
        (0, vitest_1.expect)(res.body).toHaveProperty('success', false);
    });
});
//# sourceMappingURL=api.test.js.map