import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import type { Express } from 'express';

let app: Express;

beforeAll(async () => {
  // Set required env vars before importing the app to pass startup validation
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-minimum-32-chars-long-ok';
  process.env.NODE_ENV = 'test';

  const module = await import('../index');
  app = module.app;
});

describe('Health Endpoint', () => {
  it('GET /health returns status field', async () => {
    const res = await supertest(app).get('/health');
    // 200 (db ok) or 503 (db degraded) are both acceptable — endpoint is responding
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('env');
    expect(res.body).toHaveProperty('db');
  });
});

describe('Auth Protection', () => {
  it('GET /api/v1/leads returns 401 without token', async () => {
    const res = await supertest(app).get('/api/v1/leads');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/notifications returns 401 without token', async () => {
    const res = await supertest(app).get('/api/v1/notifications');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/openings without auth returns 400 or 401', async () => {
    const res = await supertest(app).get('/api/v1/openings');
    expect([400, 401]).toContain(res.status);
  });

  it('POST /api/v1/auth/login with bad creds returns error', async () => {
    const res = await supertest(app)
      .post('/api/v1/auth/login')
      .send({ email: 'notauser@test.com', password: 'wrongpassword' });
    expect([400, 401, 422]).toContain(res.status);
    expect(res.body).toHaveProperty('success', false);
  });
});
