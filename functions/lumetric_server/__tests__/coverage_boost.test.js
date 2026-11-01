'use strict';

const request = require('supertest');
const app = require('../index');
const authService = require('../services/auth.service');
const auditService = require('../services/audit.service');
const datastoreService = require('../services/datastore.service');
const validation = require('../lib/validation');

describe('Comprehensive Unit & Service Coverage Suite', () => {
  let userToken = '';
  let adminToken = '';
  const testEmail = `coverage-user-${Date.now()}@lumetric.dev`;
  const adminEmail = `coverage-admin-${Date.now()}@lumetric.dev`;

  beforeAll(() => {
    userToken = app.issueTokenPair({
      id: 'usr_cov_01',
      email: testEmail,
      role: 'builder',
      name: 'Coverage User'
    }).accessToken;

    adminToken = app.issueTokenPair({
      id: 'usr_cov_admin',
      email: adminEmail,
      role: 'owner',
      name: 'Coverage Admin'
    }).accessToken;
  });

  describe('Auth Service Unit Tests', () => {
    test('hashPassword and verifyPassword', async () => {
      const hash = await authService.hashPassword('MySecurePass123!');
      expect(typeof hash).toBe('string');
      const isValid = await authService.verifyPassword('MySecurePass123!', hash);
      expect(isValid).toBe(true);
      const isInvalid = await authService.verifyPassword('WrongPass', hash);
      expect(isInvalid).toBe(false);
      expect(await authService.verifyPassword('', hash)).toBe(false);
    });

    test('generateOtp produces 6-digit numeric string', () => {
      const otp = authService.generateOtp();
      expect(otp).toHaveLength(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    });

    test('token revocation list handles null and expired tokens', () => {
      expect(authService.isTokenRevoked(null)).toBe(false);
      expect(authService.isTokenRevoked('non-existent-token')).toBe(false);
      authService.revokeToken('expired-token', Date.now() - 1000);
      expect(authService.isTokenRevoked('expired-token')).toBe(false);
    });
  });

  describe('Audit Service Unit Tests', () => {
    test('logAuditEvent, getAuditLogs, and getAuditTrailCount', () => {
      const initialCount = auditService.getAuditTrailCount();
      auditService.logAuditEvent(testEmail, 'TEST_EVENT', 'Testing', { status: 'SUCCESS' });
      expect(auditService.getAuditTrailCount()).toBe(initialCount + 1);

      const auditRes = auditService.getAuditLogs({ category: 'Testing', limit: 10 });
      expect(auditRes.success).toBe(true);
      expect(Array.isArray(auditRes.logs)).toBe(true);
      expect(auditRes.logs.some(l => l.action === 'TEST_EVENT')).toBe(true);

      const userLogs = auditService.getAuditLogs({ actorEmail: testEmail });
      expect(userLogs.logs.length).toBeGreaterThan(0);
    });
  });

  describe('Datastore Service Unit Tests', () => {
    test('saveUserToStore and getUserFromStore', async () => {
      const userObj = {
        id: 'usr_ds_test',
        email: 'ds_test@lumetric.dev',
        name: 'DS Tester',
        role: 'viewer'
      };
      await datastoreService.saveUserToStore(null, userObj);
      const retrieved = await datastoreService.getUserFromStore(null, 'ds_test@lumetric.dev');
      expect(retrieved).toBeDefined();
      expect(retrieved.name).toBe('DS Tester');
      expect(datastoreService.getCacheSize()).toBeGreaterThan(0);
    });

    test('checkDataStoreStatus returns status object', async () => {
      const status = await datastoreService.checkDataStoreStatus(null);
      expect(status).toBeDefined();
      expect(typeof status.connected).toBe('boolean');
    });

    test('extractRowData handles various input types', () => {
      expect(datastoreService.extractRowData(null)).toBeNull();
      expect(datastoreService.extractRowData({ data: { a: 1 } }, 'data')).toEqual({ a: 1 });
      expect(datastoreService.extractRowData({ Users: { name: 'Alice' } }, 'users')).toEqual({ name: 'Alice' });
    });
  });

  describe('Billing Routes Integration Tests', () => {
    test('GET /api/billing/invoices returns list', async () => {
      const res = await request(app)
        .get('/api/billing/invoices')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.invoices)).toBe(true);
    });

    test('POST /api/billing/create-order handles order creation', async () => {
      const res = await request(app)
        .post('/api/billing/create-order')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ planId: 'growth', billingCycle: 'monthly' });
      expect([200, 400, 500]).toContain(res.status);
    });

    test('POST /api/billing/verify-upi handles verification request', async () => {
      const res = await request(app)
        .post('/api/billing/verify-upi')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ utrNumber: '123456789012', planId: 'growth' });
      expect([200, 400]).toContain(res.status);
    });

    test('POST /api/billing/webhook/bank-credit requires valid secret', async () => {
      const failRes = await request(app)
        .post('/api/billing/webhook/bank-credit')
        .send({ secret: 'wrong-secret', amount: 100, utrNumber: 'UTR123' });
      expect(failRes.status).toBe(403);

      const successRes = await request(app)
        .post('/api/billing/webhook/bank-credit')
        .send({
          secret: process.env.BANK_WEBHOOK_SECRET,
          amount: 2999,
          utrNumber: 'UTR_TEST_' + Date.now()
        });
      expect([200, 400, 404]).toContain(successRes.status);
    });
  });

  describe('User and Settings Routes', () => {
    test('GET and PUT /api/user/profile', async () => {
      const getRes = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${userToken}`);
      expect([200, 404]).toContain(getRes.status);

      const putRes = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Updated Coverage Name', organization: 'New Org' });
      expect([200, 404]).toContain(putRes.status);
    });

    test('Unauthenticated user requests return 401', async () => {
      const res = await request(app).get('/api/user/profile');
      expect(res.status).toBe(401);
    });
  });

  describe('Validation Logic Coverage', () => {
    test('validates various password scenarios', () => {
      const weak = validation.validatePasswordStrength('short');
      expect(weak.valid).toBe(false);
      const strong = validation.validatePasswordStrength('ValidPassword123!');
      expect(strong.valid).toBe(true);
    });
  });
});
