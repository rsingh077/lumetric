'use strict';

const request = require('supertest');
const app = require('../index');

describe('P1 Service Layer Integration & Endpoints', () => {
  let tokenPair = null;

  beforeAll(() => {
    const testUser = {
      id: 'usr_p1_architect_001',
      email: 'architect@lumetric.dev',
      role: 'administrator',
      name: 'Lead Architect',
      organization: 'Lumetric Core Engine'
    };
    tokenPair = app.issueTokenPair(testUser);
  });

  test('Root gateway and system health telemetry', async () => {
    const rootRes = await request(app).get('/');
    expect(rootRes.status).toBe(200);
    expect(rootRes.body.status).toBe('online');
    expect(rootRes.headers['x-request-id']).toBeDefined();

    const healthRes = await request(app).get('/api/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.status).toBe('healthy');

    const statusRes = await request(app).get('/api/status');
    expect(statusRes.status).toBe(200);

    const pingRes = await request(app).get('/api/ping');
    expect(pingRes.status).toBe(200);

    const metricsRes = await request(app).get('/api/metrics');
    expect(metricsRes.status).toBe(200);
    expect(metricsRes.body.success).toBe(true);
    expect(metricsRes.body.metrics.uptimeSec).toBeGreaterThanOrEqual(0);
    expect(metricsRes.body.metrics.totalRequests).toBeGreaterThan(0);
    expect(metricsRes.body.metrics.cacheHitRate).toBeDefined();
  });

  test('Geo Cartography and System Diagnostics', async () => {
    const geoRes = await request(app).get('/api/geo/summary');
    expect(geoRes.status).toBe(200);
    expect(geoRes.body.totalIndiaEntities).toBe(37);

    const diagRes = await request(app).get('/api/diagnostics/system');
    expect(diagRes.status).toBe(200);

    const mailRes = await request(app).get('/api/mail/diagnostics');
    expect(mailRes.status).toBe(200);
  });

  test('Data Intelligence Stream and Tabular Records with RBAC', async () => {
    const liveRes = await request(app).get('/api/data/intelligence/live');
    expect(liveRes.status).toBe(200);
    expect(liveRes.body.success).toBe(true);

    const recRes = await request(app).get('/api/data/records');
    expect(recRes.status).toBe(200);
    expect(recRes.body.columnLevelMaskingApplied).toBe(true);
  });

  test('Billing Plans Catalog & Subscription Status', async () => {
    const plansRes = await request(app).get('/api/billing/plans');
    expect(plansRes.status).toBe(200);
    expect(plansRes.body.plans.length).toBeGreaterThanOrEqual(3);

    const subRes = await request(app).get('/api/billing/subscription');
    expect(subRes.status).toBe(200);
  });

  test('Real-time check-email for presence detection', async () => {
    const checkRes = await request(app)
      .post('/api/auth/check-email')
      .send({ email: 'new_architect@lumetric.dev' });
    expect(checkRes.status).toBe(200);
    expect(checkRes.body.isNewUser).toBe(true);
  });

  test('User Profile and Multi-tenant Workspace Data isolation', async () => {
    const profRes = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${tokenPair.accessToken}`);
    expect(profRes.status).toBe(200);
    expect(profRes.body.user.email).toBe('architect@lumetric.dev');

    const saveRes = await request(app)
      .post('/api/user/workspace-data')
      .set('Authorization', `Bearer ${tokenPair.accessToken}`)
      .send({
        workspaceData: {
          userEmail: 'architect@lumetric.dev',
          datasets: [{ id: 'ds_001', name: 'Revenue Q4' }]
        }
      });
    expect(saveRes.status).toBe(200);

    const getRes = await request(app)
      .get('/api/user/workspace-data')
      .set('Authorization', `Bearer ${tokenPair.accessToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.workspaceData.datasets[0].name).toBe('Revenue Q4');
  });

  test('Enterprise Cloud Connectors and Admin Users', async () => {
    const connRes = await request(app)
      .get('/api/connectors')
      .set('Authorization', `Bearer ${tokenPair.accessToken}`);
    expect(connRes.status).toBe(200);
    expect(connRes.body.total).toBeGreaterThanOrEqual(4);

    const adminRes = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${tokenPair.accessToken}`);
    expect(adminRes.status).toBe(200);
  });
});
