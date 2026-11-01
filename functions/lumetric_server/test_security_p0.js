const assert = require('assert');

// Test the server locally in-process without listening on a public port
process.env.NODE_ENV = 'test';
process.env.LUMETRIC_JWT_SECRET = 'test-security-secret-key-for-unit-testing-32chars';

// Load server
const app = require('./index.js');
const http = require('http');

const server = http.createServer(app);

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server running on ${baseUrl}`);

  try {
    // 1. Verify Helmet Security Headers
    console.log('\n--- 1. Testing Helmet Security Headers ---');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(healthRes.status, 200);
    const headers = healthRes.headers;

    assert.ok(headers.get('content-security-policy'), 'CSP header missing');
    assert.strictEqual(headers.get('x-content-type-options'), 'nosniff', 'nosniff missing');
    assert.ok(headers.get('strict-transport-security'), 'HSTS header missing');
    assert.ok(headers.get('referrer-policy'), 'Referrer-Policy missing');
    console.log('✓ Helmet CSP, HSTS, nosniff, and Referrer-Policy confirmed!');

    // 2. Verify Global Rate Limiter
    console.log('\n--- 2. Testing Global Rate Limiter ---');
    assert.ok(healthRes.headers.get('x-ratelimit-limit') === null, 'Health check should bypass global rate limiter');
    const dataRes = await fetch(`${baseUrl}/api/data/records`);
    assert.ok(dataRes.headers.get('x-ratelimit-limit') !== null, 'Data records should have X-RateLimit-Limit');
    console.log(`✓ Global Rate Limiter active (Limit: ${dataRes.headers.get('x-ratelimit-limit')}, Remaining: ${dataRes.headers.get('x-ratelimit-remaining')})`);

    // 3. Verify JWT Issue, Revocation, and Logout
    console.log('\n--- 3. Testing JWT Token Issuance & Revocation ---');
    const testUser = {
      id: 'usr_sec_test_01',
      email: 'sec_test_user@lumetric.dev',
      name: 'Security Test User',
      role: 'builder',
      organization: 'Lumatric Engineering'
    };

    const tokenPair = app.issueTokenPair(testUser);
    assert.ok(tokenPair.token, 'Token missing');
    assert.ok(tokenPair.accessToken, 'AccessToken missing');
    assert.ok(tokenPair.refreshToken, 'RefreshToken missing');
    console.log('✓ Token pair issued (AccessToken + RefreshToken)');

    // Test profile access with token
    const profRes = await fetch(`${baseUrl}/api/user/profile`, {
      headers: { 'Authorization': `Bearer ${tokenPair.accessToken}` }
    });
    assert.strictEqual(profRes.status, 200, 'Profile fetch should succeed');
    console.log('✓ Authenticated request succeeded');

    // Test Logout & Revocation
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenPair.accessToken}`
      },
      body: JSON.stringify({ refreshToken: tokenPair.refreshToken })
    });
    assert.strictEqual(logoutRes.status, 200);
    const logoutData = await logoutRes.json();
    assert.strictEqual(logoutData.success, true);
    console.log('✓ Logout endpoint revoked token successfully');

    // Verify revoked token is now rejected
    const revokedRes = await fetch(`${baseUrl}/api/user/profile`, {
      headers: { 'Authorization': `Bearer ${tokenPair.accessToken}` }
    });
    assert.strictEqual(revokedRes.status, 401, 'Revoked token must be rejected with 401');
    console.log('✓ Revoked access token correctly rejected with 401!');

    // 4. Test Refresh Token Rotation & Reuse Detection
    console.log('\n--- 4. Testing Refresh Token Rotation & Reuse Detection ---');
    const user2 = {
      id: 'usr_sec_rotation_02',
      email: 'rotation_test@lumetric.dev',
      name: 'Rotation Tester',
      role: 'builder'
    };
    const user2Tokens = app.issueTokenPair(user2);

    // Rotate refresh token
    const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: user2Tokens.refreshToken })
    });
    assert.strictEqual(refreshRes.status, 200);
    const refreshData = await refreshRes.json();
    assert.ok(refreshData.accessToken, 'New access token missing');
    assert.ok(refreshData.refreshToken, 'New refresh token missing');
    assert.notStrictEqual(refreshData.refreshToken, user2Tokens.refreshToken, 'Refresh token must rotate to a new token');
    console.log('✓ Refresh token successfully rotated!');

    // Reuse detection: Submit the OLD refresh token again
    const reuseRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: user2Tokens.refreshToken })
    });
    assert.strictEqual(reuseRes.status, 401, 'Reused refresh token must be rejected with 401');
    const reuseData = await reuseRes.json();
    assert.ok(reuseData.error.includes('reuse detected'), 'Must detect token reuse');
    console.log('✓ Token reuse detection successfully triggered & family revoked!');

    // 5. Test Audit Logs Filtering
    console.log('\n--- 5. Testing Queryable Audit Logs ---');
    const adminUser = {
      id: 'usr_admin_owner_01',
      email: 'owner@lumetric.dev',
      name: 'Super Owner',
      role: 'owner'
    };
    const adminTokens = app.issueTokenPair(adminUser);

    const auditRes = await fetch(`${baseUrl}/api/audit/logs?category=Security&limit=5`, {
      headers: { 'Authorization': `Bearer ${adminTokens.accessToken}` }
    });
    assert.strictEqual(auditRes.status, 200);
    const auditData = await auditRes.json();
    assert.ok(Array.isArray(auditData.logs), 'Logs must be an array');
    assert.ok(auditData.logs.length <= 5, 'Limit must be respected');
    console.log(`✓ Queryable Audit Logs verified (${auditData.logs.length} entries filtered by category=Security)!`);

    console.log('\n========================================');
    console.log('ALL P0 SECURITY & SECRETS TESTS PASSED!');
    console.log('========================================');
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
