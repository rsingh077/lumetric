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

  test('generateOtp produces uniform 6-digit numeric CSPRNG strings', () => {
    const { generateOtp } = require('../services/auth.service');
    const seen = new Set();
    for (let i = 0; i < 50; i++) {
      const code = generateOtp();
      expect(typeof code).toBe('string');
      expect(code).toMatch(/^\d{6}$/);
      const num = parseInt(code, 10);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThan(1000000);
      seen.add(code);
    }
    // CSPRNG across 50 iterations should produce unique codes with high probability
    expect(seen.size).toBeGreaterThan(45);
  });

  test('Google OAuth OTP flow terminates with HTTP 429 lockout after 3 incorrect attempts', async () => {
    const testEmail = 'google_lockout_test@lumetric.dev';
    // 1. Request Google OTP
    const reqRes = await request(app)
      .post('/api/auth/google')
      .send({ email: testEmail, name: 'Lockout Tester' });
    expect(reqRes.status).toBe(200);
    expect(reqRes.body.requiresOtp).toBe(true);

    // 2. Submit wrong OTP attempt 1 -> 400
    const fail1 = await request(app)
      .post('/api/auth/google')
      .send({ email: testEmail, otp: '111111' });
    expect(fail1.status).toBe(400);
    expect(fail1.body.error).toContain('2 attempts remaining');

    // 3. Submit wrong OTP attempt 2 -> 400
    const fail2 = await request(app)
      .post('/api/auth/google')
      .send({ email: testEmail, otp: '222222' });
    expect(fail2.status).toBe(400);
    expect(fail2.body.error).toContain('1 attempts remaining');

    // 4. Submit wrong OTP attempt 3 -> 400
    const fail3 = await request(app)
      .post('/api/auth/google')
      .send({ email: testEmail, otp: '333333' });
    expect(fail3.status).toBe(400);
    expect(fail3.body.error).toContain('0 attempts remaining');

    // 5. Submit wrong OTP attempt 4 -> 429 OTP_LOCKOUT
    const fail4 = await request(app)
      .post('/api/auth/google')
      .send({ email: testEmail, otp: '444444' });
    expect(fail4.status).toBe(429);
    expect(fail4.body.code).toBe('OTP_LOCKOUT');
  });

  test('Password Reset flow terminates with HTTP 429 lockout after 3 incorrect attempts', async () => {
    const { saveUserToStore } = require('../services/datastore.service');
    const resetEmail = 'reset_lockout_test@lumetric.dev';

    await saveUserToStore(null, {
      id: 'usr_reset_lockout_01',
      email: resetEmail,
      name: 'Reset Lockout Tester',
      role: 'builder',
      resetOtp: '849201',
      resetOtpExpires: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      resetOtpAttempts: 0,
      settings: {
        security: {
          resetOtp: '849201',
          resetOtpExpires: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          resetOtpAttempts: 0
        }
      }
    });

    // Attempt 1 -> 400
    const fail1 = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: resetEmail, otp: '000001', newPassword: 'NewSecurePassword123!' });
    expect(fail1.status).toBe(400);
    expect(fail1.body.error).toContain('2 attempts remaining');

    // Attempt 2 -> 400
    const fail2 = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: resetEmail, otp: '000002', newPassword: 'NewSecurePassword123!' });
    expect(fail2.status).toBe(400);
    expect(fail2.body.error).toContain('1 attempts remaining');

    // Attempt 3 -> 429 lockout (at attempt 3)
    const fail3 = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: resetEmail, otp: '000003', newPassword: 'NewSecurePassword123!' });
    expect(fail3.status).toBe(429);
    expect(fail3.body.code).toBe('OTP_LOCKOUT');
  });
});
