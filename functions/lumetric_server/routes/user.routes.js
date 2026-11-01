'use strict';

/**
 * Lumetric User Profile & Workspace Data Router
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getUserFromStore, saveUserToStore } = require('../services/datastore.service');
const { logAuditEvent } = require('../services/audit.service');
const { validatePasswordStrength } = require('../lib/validation');
const { authenticateToken } = require('../middleware/auth.middleware');
const { rateLimiter } = require('../middleware/rateLimiter');

// GET /api/user/profile - Get Current User Safe Profile
router.get('/api/user/profile', authenticateToken, (req, res) => {
  const { passwordHash: _, mfaSecret: __, ...userSafe } = req.user;
  return res.json({
    success: true,
    user: userSafe
  });
});

// PATCH /api/user/profile - Update User Profile
router.patch('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { name, organization, avatarUrl, settings } = req.body;
    const user = req.user;

    if (name) user.name = name.trim();
    if (organization) user.organization = organization.trim();
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (settings && typeof settings === 'object') {
      user.settings = { ...user.settings, ...settings };
    }

    await saveUserToStore(req, user);
    logAuditEvent(user.email, 'PROFILE_UPDATED', 'User Account', 'Profile settings updated');

    const { passwordHash: _, mfaSecret: __, ...userSafe } = user;
    return res.json({
      success: true,
      message: 'User profile updated in database.',
      user: userSafe
    });
  } catch {
    return res.status(500).json({
      success: false,
      error: 'Failed to update user profile.'
    });
  }
});

// GET /api/user/workspace-data - Multi-Tenant Workspace & Datasets
router.get('/api/user/workspace-data', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.email) {
      return res.status(401).json({ success: false, error: 'User session not found' });
    }
    const freshUser = await getUserFromStore(req, user.email);
    const targetUser = freshUser || user;
    const workspaceData = (targetUser.settings && targetUser.settings.workspaceData) || null;
    return res.json({
      success: true,
      userEmail: targetUser.email,
      workspaceData
    });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to retrieve workspace data' });
  }
});

// POST /api/user/workspace-data - Multi-Tenant Save Workspace Data
router.post('/api/user/workspace-data', authenticateToken, async (req, res) => {
  try {
    const { workspaceData } = req.body;
    const user = req.user;
    if (!user || !user.email) {
      return res.status(401).json({ success: false, error: 'User session not found' });
    }
    const normEmail = user.email.toLowerCase().trim();

    if (workspaceData && workspaceData.userEmail) {
      const payloadEmail = String(workspaceData.userEmail).toLowerCase().trim();
      if (payloadEmail !== normEmail) {
        return res.status(403).json({
          success: false,
          error: 'Multi-tenant isolation violation: Cannot overwrite another profile workspace database.'
        });
      }
    }

    if (!user.settings) user.settings = {};
    user.settings.workspaceData = workspaceData ? { ...workspaceData, userEmail: normEmail } : null;
    await saveUserToStore(req, user);
    logAuditEvent(normEmail, 'WORKSPACE_DATA_SYNCED', 'DataStore', 'Individual profile workspace & datasets synced');
    return res.json({
      success: true,
      message: 'Individual profile database saved to cloud store.'
    });
  } catch {
    return res.status(500).json({
      success: false,
      error: 'Failed to persist individual profile workspace data.'
    });
  }
});

// POST /api/user/workspace-data/reset - Reset Workspace Data
router.post('/api/user/workspace-data/reset', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.email) {
      return res.status(401).json({ success: false, error: 'User session not found' });
    }
    if (!user.settings) user.settings = {};
    user.settings.workspaceData = null;
    await saveUserToStore(req, user);
    logAuditEvent(user.email, 'WORKSPACE_DATA_RESET', 'DataStore', 'Individual profile workspace reset to clean slate');
    return res.json({
      success: true,
      message: 'Workspace data cleared. Profile reset to clean slate.'
    });
  } catch {
    return res.status(500).json({
      success: false,
      error: 'Failed to reset profile workspace data.'
    });
  }
});

// POST /api/user/change-password - Change Account Password
router.post('/api/user/change-password', authenticateToken, rateLimiter({ windowMs: 5 * 60 * 1000, max: 10, message: 'Too many password change attempts.' }), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required.'
      });
    }

    const pwValidation = validatePasswordStrength(newPassword);
    if (!pwValidation.valid) {
      return res.status(400).json({
        success: false,
        error: pwValidation.message
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      logAuditEvent(user.email, 'PASSWORD_CHANGE_FAILED', 'Security', 'Current password was incorrect');
      return res.status(401).json({
        success: false,
        error: 'Incorrect current password.'
      });
    }

    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await saveUserToStore(req, user);
    logAuditEvent(user.email, 'PASSWORD_CHANGED', 'Security', 'User updated password with 12-round bcrypt hash');

    return res.json({
      success: true,
      message: 'Password updated successfully in database.'
    });
  } catch {
    return res.status(500).json({
      success: false,
      error: 'Failed to change password.'
    });
  }
});

module.exports = router;
