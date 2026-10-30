const baseUrl = 'https://project-rainfall-60092395179.development.catalystserverless.in';

const testEndpoints = [
  // Web Client HTML pages & routes
  { name: 'Root Gateway (/)', url: baseUrl + '/', method: 'GET' },
  { name: 'App Root (/app/)', url: baseUrl + '/app/', method: 'GET' },
  { name: 'App Main (/app/index.html)', url: baseUrl + '/app/index.html', method: 'GET' },
  { name: 'App Fallback (/app/app.html)', url: baseUrl + '/app/app.html', method: 'GET' },
  { name: 'App 404 Route (/app/404.html)', url: baseUrl + '/app/404.html', method: 'GET' },
  { name: 'Analysis View (/app/analysis.html)', url: baseUrl + '/app/analysis.html', method: 'GET' },
  { name: 'Dashboards View (/app/dashboards.html)', url: baseUrl + '/app/dashboards.html', method: 'GET' },
  { name: 'Data Management (/app/data.html)', url: baseUrl + '/app/data.html', method: 'GET' },
  { name: 'Excel Automator (/app/excel.html)', url: baseUrl + '/app/excel.html', method: 'GET' },
  { name: 'AutoML Studio (/app/models.html)', url: baseUrl + '/app/models.html', method: 'GET' },
  { name: 'Operations (/app/operations.html)', url: baseUrl + '/app/operations.html', method: 'GET' },
  { name: 'Pipelines (/app/pipelines.html)', url: baseUrl + '/app/pipelines.html', method: 'GET' },
  { name: 'Projects (/app/projects.html)', url: baseUrl + '/app/projects.html', method: 'GET' },
  { name: 'Settings (/app/settings.html)', url: baseUrl + '/app/settings.html', method: 'GET' },
  { name: 'SQL Studio (/app/sql.html)', url: baseUrl + '/app/sql.html', method: 'GET' },
  { name: 'Stories (/app/stories.html)', url: baseUrl + '/app/stories.html', method: 'GET' },

  // Server API endpoints
  { name: 'Server Root (/)', url: baseUrl + '/server/lumetric_server/', method: 'GET' },
  { name: 'Health Telemetry (/api/health)', url: baseUrl + '/server/lumetric_server/api/health', method: 'GET' },
  { name: 'Server Status (/api/status)', url: baseUrl + '/server/lumetric_server/api/status', method: 'GET' },
  { name: 'Ping Latency (/api/ping)', url: baseUrl + '/server/lumetric_server/api/ping', method: 'GET' },
  { name: 'Engine Version (/api/version)', url: baseUrl + '/server/lumetric_server/api/version', method: 'GET' },
  { name: 'Geo Cartography (/api/geo/summary)', url: baseUrl + '/server/lumetric_server/api/geo/summary', method: 'GET' },
  { name: 'System Diagnostics (/api/diagnostics/system)', url: baseUrl + '/server/lumetric_server/api/diagnostics/system', method: 'GET' },
  { name: 'Datastore Status (/api/datastore/status)', url: baseUrl + '/server/lumetric_server/api/datastore/status', method: 'GET' },
  { name: 'Billing Plans (/api/billing/plans)', url: baseUrl + '/server/lumetric_server/api/billing/plans', method: 'GET' },
  { name: 'Billing Invoices (/api/billing/invoices)', url: baseUrl + '/server/lumetric_server/api/billing/invoices', method: 'GET' },
  { name: 'Live Intelligence Stream (/api/data/intelligence/live)', url: baseUrl + '/server/lumetric_server/api/data/intelligence/live', method: 'GET' },
  { name: 'Tabular Data Records (/api/data/records)', url: baseUrl + '/server/lumetric_server/api/data/records', method: 'GET' },
  { name: 'Mail Diagnostics (/api/mail/diagnostics)', url: baseUrl + '/server/lumetric_server/api/mail/diagnostics', method: 'GET' },
  { name: 'Real-time Check Email - Old User', url: baseUrl + '/server/lumetric_server/api/auth/check-email', method: 'POST', body: { email: 'rajskatoch07@gmail.com' } },
  { name: 'Real-time Check Email - New User', url: baseUrl + '/server/lumetric_server/api/auth/check-email', method: 'POST', body: { email: 'auditor_lead_test_543@lumetric.dev' } },
];

async function runComprehensiveAudit() {
  console.log('='.repeat(80));
  console.log('LUMETRIC PRODUCTION CLOUD VERIFICATION & 200 OK AUDIT');
  console.log('Target Gateway: ' + baseUrl);
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  for (const ep of testEndpoints) {
    try {
      const opts = {
        method: ep.method,
        headers: ep.body ? { 'Content-Type': 'application/json' } : {}
      };
      if (ep.body) opts.body = JSON.stringify(ep.body);

      const start = Date.now();
      const res = await fetch(ep.url, opts);
      const latency = Date.now() - start;
      const isOk = res.status === 200;

      if (isOk) {
        passed++;
        console.log(`[PASS 200 OK] ${ep.method.padEnd(4)} | ${ep.name.padEnd(40)} | ${String(latency).padStart(4)}ms | ${ep.url}`);
      } else {
        failed++;
        console.log(`[FAIL ${res.status}] ${ep.method.padEnd(4)} | ${ep.name.padEnd(40)} | ${String(latency).padStart(4)}ms | ${ep.url}`);
      }
    } catch (err) {
      failed++;
      console.log(`[ERROR]     ${ep.method.padEnd(4)} | ${ep.name.padEnd(40)} | ${ep.url} -> ${err.message}`);
    }
  }

  console.log('-'.repeat(80));
  console.log(`AUDIT RESULTS: ${passed}/${testEndpoints.length} ENDPOINTS STABLE & RETURNED HTTP 200 OK.`);
  if (failed === 0) {
    console.log('STATUS: ALL CHECKS PASSED WITH 100% STABLE 200 OK.');
  } else {
    console.log(`STATUS: ${failed} ENDPOINT(S) RETURNED NON-200.`);
  }
  console.log('='.repeat(80));
}

runComprehensiveAudit();
