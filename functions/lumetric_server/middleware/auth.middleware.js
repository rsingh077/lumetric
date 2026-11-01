'use strict';

/**
 * Lumetric Authentication & Authorization Middleware
 */

const jwt = require('jsonwebtoken');
const { JWT_SECRET, isTokenRevoked } = require('../services/auth.service');
const { getUserFromStore } = require('../services/datastore.service');

async function authenticateToken(req, res, next) {
  let token = req.headers['x-auth-token'] || req.headers['x-access-token'] || req.headers['x-lumetric-token'];
  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && (authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader);
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication token required'
    });
  }

  if (isTokenRevoked(token)) {
    return res.status(401).json({
      success: false,
      error: 'Authentication token has been revoked. Please sign in again.'
    });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired authentication session'
      });
    }

    if (decoded && ((decoded.jti && isTokenRevoked(decoded.jti)) || (decoded.familyId && isTokenRevoked(decoded.familyId)))) {
      return res.status(401).json({
        success: false,
        error: 'Session token has been revoked. Please sign in again.'
      });
    }

    let user = await getUserFromStore(req, decoded.email);
    if (!user) {
      if (decoded && decoded.email) {
        user = {
          id: decoded.id || `usr_${decoded.email.replace(/[^a-zA-Z0-9]/g, '_')}`,
          email: decoded.email,
          name: decoded.name || decoded.email.split('@')[0],
          role: decoded.role || 'builder',
          organization: decoded.organization || 'Enterprise Data Lab',
          createdAt: new Date().toISOString(),
          settings: {}
        };
      } else {
        return res.status(404).json({
          success: false,
          error: 'User profile associated with token no longer exists'
        });
      }
    }

    req.user = {
      ...user,
      jti: decoded ? decoded.jti : null,
      familyId: decoded ? decoded.familyId : null,
      tokenExp: decoded ? decoded.exp : null
    };
    req.token = token;
    next();
  });
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const userRole = (req.user.role || 'builder').toLowerCase();
    const authorized = allowedRoles.map(r => r.toLowerCase()).includes(userRole);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`
      });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole
};
