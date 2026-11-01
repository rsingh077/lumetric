'use strict';

/**
 * Lumetric Audit Router
 */

const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../services/audit.service');
const { authenticateToken } = require('../middleware/auth.middleware');

// GET /api/audit/logs - Queryable Audit Logs (Authenticated)
router.get('/api/audit/logs', authenticateToken, (req, res) => {
  const result = getAuditLogs({
    limit: req.query.limit,
    category: req.query.category,
    actorEmail: req.query.actorEmail,
    search: req.query.search
  });

  return res.json({
    success: true,
    totalLogs: result.total,
    total: result.total,
    limit: result.limit,
    headSha256: result.headSha256,
    logs: result.logs
  });
});

module.exports = router;
