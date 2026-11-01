'use strict';

/**
 * Lumetric Administration & Connectors Router
 */

const express = require('express');
const router = express.Router();
const { getAllUsersFromStore, getUserFromStore, saveUserToStore } = require('../services/datastore.service');
const { logAuditEvent } = require('../services/audit.service');
const { cloudConnectorsStore } = require('../services/data.service');
const { authenticateToken } = require('../middleware/auth.middleware');

// GET /api/connectors - List Enterprise Connectors
router.get('/api/connectors', authenticateToken, (req, res) => {
  res.json({
    success: true,
    total: cloudConnectorsStore.length,
    connectors: cloudConnectorsStore
  });
});

// POST /api/connectors/sync/:id - Trigger Connector Sync
router.post('/api/connectors/sync/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const connector = cloudConnectorsStore.find(c => c.id === id);
  if (!connector) {
    return res.status(404).json({ success: false, error: 'Connector not found' });
  }

  connector.status = 'syncing';
  connector.lastSync = 'Just now';

  logAuditEvent(req.user.email, 'CONNECTOR_SYNC_TRIGGERED', 'Data Ingestion', `Triggered sync for connector ${connector.name} (${id})`);

  setTimeout(() => {
    connector.status = 'connected';
    connector.recordsSyncCount += Math.floor(Math.random() * 5000) + 120;
  }, 4000);

  return res.json({
    success: true,
    message: `Sync operation initiated for ${connector.name}`,
    connector
  });
});

// GET /api/admin/users - List All Workspace Users
router.get('/api/admin/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner' && req.user.role !== 'administrator') {
    return res.status(403).json({
      success: false,
      error: 'Access denied: Requires Administrator or Owner privileges.'
    });
  }

  const users = await getAllUsersFromStore(req);
  return res.json({
    success: true,
    users
  });
});

// PATCH /api/admin/users/:userId/role - Update User's Role
router.patch('/api/admin/users/:userId/role', authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner' && req.user.role !== 'administrator') {
    return res.status(403).json({
      success: false,
      error: 'Access denied: Requires Administrator or Owner privileges.'
    });
  }

  const { targetEmail, newRole } = req.body;
  if (!targetEmail || !newRole) {
    return res.status(400).json({
      success: false,
      error: 'targetEmail and newRole are required'
    });
  }

  const validRoles = ['owner', 'administrator', 'builder', 'reviewer', 'viewer'];
  if (!validRoles.includes(newRole)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid role specified.'
    });
  }

  const targetUser = await getUserFromStore(req, targetEmail);
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      error: 'Target user not found.'
    });
  }

  const oldRole = targetUser.role;
  targetUser.role = newRole;
  await saveUserToStore(req, targetUser);

  logAuditEvent(req.user.email, 'ROLE_ELEVATION', 'Governance', `Elevated ${targetEmail} from ${oldRole} to ${newRole}`);

  const { passwordHash: _, mfaSecret: __, ...userSafe } = targetUser;
  return res.json({
    success: true,
    message: `User role successfully elevated to ${newRole.toUpperCase()} in database.`,
    user: userSafe
  });
});

module.exports = router;
