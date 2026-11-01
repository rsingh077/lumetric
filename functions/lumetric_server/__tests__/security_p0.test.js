'use strict';

const request = require('supertest');
const app = require('../index');

describe('P0 Security & Secrets Enforcement', () => {
  test('Helmet Security Headers are properly enforced', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['referrer-policy']).toBeDefined();
  });

  test('Global Rate Limiter sets rate limit headers on data routes', async () => {
    const res = await request(app).get('/api/data/records');
    expect(res.status).toBe(200);
    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
  });

  test('Authentication flow: Token issuance, authenticated profile, and revocation on logout', async () => {
    const testUser = {
      id: 'usr_sec_test_01',
      email: 'sec_test_user@lumetric.dev',
      name: 'Security Test User',
      role: 'builder',
      organization: 'Lumatric Engineering'
    };

    const tokenPair = app.issueTokenPair(testUser);
    expect(tokenPair.token).toBeDefined();
    expect(tokenPair.accessToken).toBeDefined();
    expect(tokenPair.refreshToken).toBeDefined();

    // Authenticated profile access
    const profRes = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${tokenPair.accessToken}`);
    expect(profRes.status).toBe(200);

    // Logout to revoke token
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${tokenPair.accessToken}`)
      .send({ refreshToken: tokenPair.refreshToken });
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    // Revoked token must be rejected with 401
    const revokedRes = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${tokenPair.accessToken}`);
    expect(revokedRes.status).toBe(401);
  });

  test('JWT Refresh Token Rotation & Family Reuse Revocation', async () => {
    const user2 = {
      id: 'usr_sec_rotation_02',
      email: 'rotation_test@lumetric.dev',
      name: 'Rotation Tester',
      role: 'builder'
    };
    const user2Tokens = app.issueTokenPair(user2);

    // Rotate refresh token
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: user2Tokens.refreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toBeDefined();
    expect(refreshRes.body.refreshToken).toBeDefined();

    // Replay attack with used refresh token must fail with 401
    const replayRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: user2Tokens.refreshToken });
    expect(replayRes.status).toBe(401);
  });

  test('Queryable Audit Trail Logs are queryable by privileged users', async () => {
    const adminUser = {
      id: 'usr_admin_owner_01',
      email: 'owner@lumetric.dev',
      name: 'Super Owner',
      role: 'owner'
    };
    const adminTokens = app.issueTokenPair(adminUser);

    const auditRes = await request(app)
      .get('/api/audit/logs?category=Security&limit=5')
      .set('Authorization', `Bearer ${adminTokens.accessToken}`);
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.success).toBe(true);
    expect(Array.isArray(auditRes.body.logs)).toBe(true);
  });
});
