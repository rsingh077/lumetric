'use strict';

/**
 * Lumetric Telemetry & System Status Router
 */

const express = require('express');
const router = express.Router();
const { checkDataStoreStatus, getCacheSize } = require('../services/datastore.service');
const { runMailDiagnostics } = require('../services/mail.service');
const { getAuditTrailCount } = require('../services/audit.service');
const { cloudConnectorsStore } = require('../services/data.service');
const { rateLimitMap } = require('../middleware/rateLimiter');
const { getMetrics } = require('../middleware/observability');

// 1. Root Gateway Probe
router.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Lumetric Enterprise Production Engine',
    cloudProvider: 'Zoho Catalyst Serverless',
    region: 'India (.in)',
    version: '1.3.0',
    compliance: ['SOC-2 Ready', 'ISO 27001 Certified Architecture'],
    activeConnectors: cloudConnectorsStore.length,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 2. Health Telemetry
router.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    nodeVersion: process.version,
    totalConnectors: cloudConnectorsStore.length,
    totalAuditEntries: getAuditTrailCount(),
    totalRegisteredUsers: getCacheSize(),
    catalystTimestamp: Date.now()
  });
});

// 3. Ping, Status, and Version Telemetry
router.get(['/api/status', '/status', '/api/ping', '/ping', '/api/version'], (req, res) => {
  res.json({
    status: 'online',
    success: true,
    code: 200,
    service: 'Lumetric Decision Studio Engine',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    registeredUsers: getCacheSize()
  });
});

// 4. Sovereign Geo Cartography Summary
router.get(['/api/geo/summary', '/api/geo/entities'], (req, res) => {
  res.json({
    success: true,
    code: 200,
    provider: 'Survey of India Sovereign GIS & US Census Bureau',
    totalIndiaEntities: 37,
    totalUSEntities: 51,
    totalWorldCountries: 176,
    activeGranularities: ['india-states', 'us-states', 'world'],
    defaultTerritory: 'Maharashtra',
    timestamp: new Date().toISOString()
  });
});

// 5. System Diagnostics
router.get(['/api/diagnostics/system', '/api/system'], (req, res) => {
  res.json({
    success: true,
    code: 200,
    system: 'Lumetric Cloud Serverless Compute Engine',
    environment: 'production',
    nodeVersion: process.version,
    memoryStoreSize: getCacheSize(),
    rateLimiterActive: rateLimitMap.size,
    auditTrailCount: getAuditTrailCount(),
    timestamp: new Date().toISOString()
  });
});

// 6. DataStore Provisioning & Schema Status
router.get('/api/datastore/status', async (req, res) => {
  const status = await checkDataStoreStatus(req);
  return res.json({ success: true, ...status });
});

// 7. Mail & SMTP Diagnostics
router.get('/api/mail/diagnostics', async (req, res) => {
  const diag = await runMailDiagnostics(req);
  return res.json(diag);
});

// 8. Runtime & System Metrics (Observability)
router.get('/api/metrics', (req, res) => {
  const metrics = getMetrics();
  res.json({
    success: true,
    code: 200,
    metrics
  });
});

module.exports = router;
