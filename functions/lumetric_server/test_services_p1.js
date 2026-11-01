'use strict';

const http = require('http');
const assert = require('assert');
const app = require('./index');

const server = http.createServer(app);

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`P1 Service Layer Integration Test running on ${baseUrl}\n`);

  try {
    // 1. Root & Telemetry
    const rootRes = await fetch(`${baseUrl}/`);
    assert.strictEqual(rootRes.status, 200);
    const rootData = await rootRes.json();
    assert.strictEqual(rootData.status, 'online');
    console.log('✓ Root gateway probe PASS (200 OK)');

    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(healthRes.status, 200);
    const healthData = await healthRes.json();
    assert.strictEqual(healthData.status, 'healthy');
    console.log('✓ Health telemetry PASS (200 OK)');

    const statusRes = await fetch(`${baseUrl}/api/status`);
    assert.strictEqual(statusRes.status, 200);
    console.log('✓ Status telemetry PASS (200 OK)');

    const pingRes = await fetch(`${baseUrl}/api/ping`);
    assert.strictEqual(pingRes.status, 200);
    console.log('✓ Ping latency endpoint PASS (200 OK)');

    const geoRes = await fetch(`${baseUrl}/api/geo/summary`);
    assert.strictEqual(geoRes.status, 200);
    const geoData = await geoRes.json();
    assert.strictEqual(geoData.totalIndiaEntities, 37);
    console.log('✓ Sovereign Geo cartography PASS (200 OK)');

    const diagRes = await fetch(`${baseUrl}/api/diagnostics/system`);
    assert.strictEqual(diagRes.status, 200);
    console.log('✓ System diagnostics PASS (200 OK)');

    const mailDiagRes = await fetch(`${baseUrl}/api/mail/diagnostics`);
    assert.strictEqual(mailDiagRes.status, 200);
    console.log('✓ Mail diagnostics PASS (200 OK)');

    // 2. Data Intelligence & RBAC
    const intelRes = await fetch(`${baseUrl}/api/data/intelligence/live`);
    assert.strictEqual(intelRes.status, 200);
    const intelData = await intelRes.json();
    assert.strictEqual(intelData.success, true);
    console.log('✓ Data intelligence live stream PASS (200 OK)');

    const recordsRes = await fetch(`${baseUrl}/api/data/records`);
    assert.strictEqual(recordsRes.status, 200);
    const recordsData = await recordsRes.json();
    assert.strictEqual(recordsData.columnLevelMaskingApplied, true);
    console.log('✓ Tabular records RBAC masking PASS (200 OK)');

    // 3. Billing Plans
    const plansRes = await fetch(`${baseUrl}/api/billing/plans`);
    assert.strictEqual(plansRes.status, 200);
    const plansData = await plansRes.json();
    assert(plansData.plans.length >= 3);
    console.log('✓ Billing plans catalog PASS (200 OK, ' + plansData.plans.length + ' plans)');

    const subRes = await fetch(`${baseUrl}/api/billing/subscription`);
    assert.strictEqual(subRes.status, 200);
    console.log('✓ Default subscription tier PASS (200 OK)');

    // 4. Auth Email Check
    const emailCheckRes = await fetch(`${baseUrl}/api/auth/check-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new_architect@lumetric.dev' })
    });
    assert.strictEqual(emailCheckRes.status, 200);
    const emailCheckData = await emailCheckRes.json();
    assert.strictEqual(emailCheckData.isNewUser, true);
    console.log('✓ Real-time check-email PASS (200 OK, new_user detected)');

    // 5. Authenticated User Flow & Multi-Tenant Workspace Data Isolation
    const testUser = {
      id: 'usr_p1_architect_001',
      email: 'architect@lumetric.dev',
      role: 'administrator',
      name: 'Lead Architect',
      organization: 'Lumetric Core Engine'
    };
    const tokenPair = app.issueTokenPair(testUser);

    const profileRes = await fetch(`${baseUrl}/api/user/profile`, {
      headers: { 'Authorization': `Bearer ${tokenPair.accessToken}` }
    });
    assert.strictEqual(profileRes.status, 200);
    const profileData = await profileRes.json();
    assert.strictEqual(profileData.user.email, 'architect@lumetric.dev');
    console.log('✓ User profile endpoint PASS (200 OK)');

    // Save workspace data
    const wsSaveRes = await fetch(`${baseUrl}/api/user/workspace-data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenPair.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workspaceData: {
          userEmail: 'architect@lumetric.dev',
          datasets: [{ id: 'ds_001', name: 'Revenue Q4' }]
        }
      })
    });
    assert.strictEqual(wsSaveRes.status, 200);
    console.log('✓ Multi-tenant workspace data persistence PASS (200 OK)');

    // Fetch saved workspace data
    const wsGetRes = await fetch(`${baseUrl}/api/user/workspace-data`, {
      headers: { 'Authorization': `Bearer ${tokenPair.accessToken}` }
    });
    assert.strictEqual(wsGetRes.status, 200);
    const wsGetData = await wsGetRes.json();
    assert.strictEqual(wsGetData.workspaceData.datasets[0].name, 'Revenue Q4');
    console.log('✓ Multi-tenant workspace data retrieval PASS (200 OK)');

    // 6. Connectors & Admin Routes
    const connRes = await fetch(`${baseUrl}/api/connectors`, {
      headers: { 'Authorization': `Bearer ${tokenPair.accessToken}` }
    });
    assert.strictEqual(connRes.status, 200);
    const connData = await connRes.json();
    assert(connData.total >= 4);
    console.log('✓ Enterprise cloud connectors PASS (200 OK, ' + connData.total + ' connectors)');

    const adminUsersRes = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { 'Authorization': `Bearer ${tokenPair.accessToken}` }
    });
    assert.strictEqual(adminUsersRes.status, 200);
    console.log('✓ Admin user management PASS (200 OK)');

    console.log('\n========================================');
    console.log('ALL P1 MODULAR SERVICE LAYER CHECKS PASSED!');
    console.log('========================================');
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('P1 Integration Test FAILED:', err);
    server.close();
    process.exit(1);
  }
});
