'use strict';

/**
 * Lumetric Account Recovery & Session Management Router
 * Handles forgot-password, reset-password, logout, and refresh token rotation.
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const {
  JWT_SECRET,
  issueTokenPair,
  revokeToken,
  isTokenRevoked
} = require('../services/auth.service');

const {
  getUserFromStore,
  saveUserToStore
} = require('../services/datastore.service');

const { sendOtpEmail } = require('../services/mail.service');
const { logAuditEvent } = require('../services/audit.service');
const { validateEmailAuthenticity, validatePasswordStrength } = require('../lib/validation');
const { authenticateToken } = require('../middleware/auth.middleware');
const { rateLimiter } = require('../middleware/rateLimiter');

// POST /api/auth/forgot-password - Request recovery code
router.post('/api/auth/forgot-password', rateLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many password reset requests. Please wait 15 minutes.' }), async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailValidation = validateEmailAuthenticity(normalizedEmail);
    if (!emailValidation.valid) {
      return res.status(400).json({ success: false, error: emailValidation.message });
    }

    const user = await getUserFromStore(req, normalizedEmail);
    if (!user) {
      return res.status(404).json({ success: false, error: 'No account registered with this email address.' });
    }

    const resetOtp = crypto.randomInt(100000, 1000000).toString();
    const resetOtpExpires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    user.settings = user.settings || {};
    user.settings.security = user.settings.security || {};
    user.settings.security.resetOtp = resetOtp;
    user.settings.security.resetOtpExpires = resetOtpExpires;
    user.settings.security.resetOtpAttempts = 0;
    user.resetOtp = resetOtp;
    user.resetOtpExpires = resetOtpExpires;
    user.resetOtpAttempts = 0;

    const emailResult = await sendOtpEmail(req, normalizedEmail, resetOtp, 'reset-password', user.name);
    await saveUserToStore(req, user);
    logAuditEvent(normalizedEmail, 'PASSWORD_RESET_EMAIL_DISPATCHED', 'Security', `Dispatched recovery code to ${normalizedEmail} via ${emailResult.channel}`);

    return res.json({
      success: true,
      message: `Password recovery email dispatched to ${normalizedEmail}. Please check your inbox.`,
      emailDispatched: emailResult.dispatched,
      deliveryChannel: emailResult.channel,
      recipient: normalizedEmail,
      resetOtp,
      expiresInMinutes: 15,
      emailPreview: {
        subject: emailResult.subject,
        html: emailResult.html,
        text: emailResult.text
      }
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ success: false, error: 'Failed to process password reset request.' });
  }
});

// POST /api/auth/reset-password - Verify OTP and set new password
router.post('/api/auth/reset-password', rateLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many reset attempts.' }), async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email, 6-digit OTP code, and new password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await getUserFromStore(req, normalizedEmail);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Account not found.' });
    }

    const security = (user.settings && user.settings.security) || {};
    const activeOtp = user.resetOtp || security.resetOtp;
    const activeExpires = user.resetOtpExpires || security.resetOtpExpires;

    if (!activeOtp || !activeExpires) {
      return res.status(400).json({ success: false, error: 'No active password reset code found. Please request a new code.' });
    }

    if (new Date() > new Date(activeExpires)) {
      delete user.resetOtp;
      delete user.resetOtpExpires;
      if (user.settings?.security) {
        delete user.settings.security.resetOtp;
        delete user.settings.security.resetOtpExpires;
      }
      await saveUserToStore(req, user);
      return res.status(400).json({ success: false, error: 'Verification code has expired. Please request a new code.' });
    }

    const currentAttempts = (security.resetOtpAttempts || user.resetOtpAttempts || 0) + 1;
    const expectedBuf = Buffer.from(String(activeOtp).trim().padEnd(6, ' '));
    const submittedBuf = Buffer.from(String(otp).trim().padEnd(6, ' '));
    const isMatch = crypto.timingSafeEqual(expectedBuf, submittedBuf);

    if (!isMatch) {
      if (currentAttempts >= 3) {
        delete user.resetOtp;
        delete user.resetOtpExpires;
        delete user.resetOtpAttempts;
        if (user.settings?.security) {
          delete user.settings.security.resetOtp;
          delete user.settings.security.resetOtpExpires;
          delete user.settings.security.resetOtpAttempts;
        }
        await saveUserToStore(req, user);
        logAuditEvent(normalizedEmail, 'PASSWORD_RESET_OTP_LOCKOUT', 'Security', 'Password reset recovery code terminated after 3 failed attempts');
        return res.status(429).json({
          success: false,
          code: 'OTP_LOCKOUT',
          error: 'Too many incorrect verification attempts. For your security, this recovery code has been terminated. Please request a new code.'
        });
      }

      user.resetOtpAttempts = currentAttempts;
      user.settings = user.settings || {};
      user.settings.security = user.settings.security || {};
      user.settings.security.resetOtpAttempts = currentAttempts;
      await saveUserToStore(req, user);

      logAuditEvent(normalizedEmail, 'PASSWORD_RESET_OTP_MISMATCH', 'Security', `Invalid OTP submitted for password reset (attempt ${currentAttempts}/3)`);
      return res.status(400).json({
        success: false,
        error: `Invalid 6-digit verification code. (${3 - currentAttempts} attempts remaining)`
      });
    }

    const pwCheck = validatePasswordStrength(newPassword);
    if (!pwCheck.valid) {
      return res.status(400).json({ success: false, error: pwCheck.message });
    }

    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    delete user.resetOtp;
    delete user.resetOtpExpires;
    delete user.resetOtpAttempts;
    if (user.settings?.security) {
      delete user.settings.security.resetOtp;
      delete user.settings.security.resetOtpExpires;
      delete user.settings.security.resetOtpAttempts;
    }
    await saveUserToStore(req, user);

    logAuditEvent(normalizedEmail, 'PASSWORD_RESET_SUCCESS', 'Security', 'User updated password via 6-digit OTP verification');

    return res.json({
      success: true,
      message: 'Password successfully reset! You can now sign in with your new password.'
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ success: false, error: 'Failed to reset password.' });
  }
});

// POST /api/auth/logout - Revoke active tokens
router.post('/api/auth/logout', authenticateToken, (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && (authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader);
  if (token) {
    revokeToken(token, req.user && req.user.tokenExp ? req.user.tokenExp * 1000 : null);
  }
  if (req.user && req.user.jti) {
    revokeToken(req.user.jti);
  }
  const { refreshToken } = req.body || {};
  if (refreshToken) {
    try {
      const decodedRef = jwt.verify(refreshToken, JWT_SECRET);
      if (decodedRef && decodedRef.jti) {
        revokeToken(decodedRef.jti);
        if (decodedRef.familyId) {
          revokeToken(decodedRef.familyId);
        }
      }
    } catch {}
  }
  logAuditEvent(req.user.email, 'USER_LOGOUT', 'Authentication', 'Session revoked and terminated');
  return res.json({
    success: true,
    message: 'Session revoked and logged out successfully.'
  });
});

// POST /api/auth/refresh - Refresh token with single-use rotation
router.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body || {};
  let targetUser = null;
  let familyId = null;

  if (refreshToken) {
    try {
      const decodedRef = jwt.verify(refreshToken, JWT_SECRET);
      if (decodedRef.type !== 'refresh' || !decodedRef.jti) {
        return res.status(400).json({ success: false, error: 'Invalid refresh token structure' });
      }

      if (isTokenRevoked(decodedRef.jti)) {
        if (decodedRef.familyId) {
          revokeToken(decodedRef.familyId);
        }
        logAuditEvent(decodedRef.email, 'REFRESH_TOKEN_REUSE_DETECTED', 'Security', 'Revoked refresh token re-submitted. Terminated session family.');
        return res.status(401).json({
          success: false,
          error: 'Refresh token reuse detected. All sessions terminated for security.'
        });
      }

      if (decodedRef.familyId && isTokenRevoked(decodedRef.familyId)) {
        return res.status(401).json({ success: false, error: 'Session family revoked.' });
      }

      revokeToken(decodedRef.jti, decodedRef.exp ? decodedRef.exp * 1000 : null);
      familyId = decodedRef.familyId;

      targetUser = await getUserFromStore(req, decodedRef.email);
      if (!targetUser) {
        targetUser = { id: decodedRef.id, email: decodedRef.email, role: 'builder' };
      }
    } catch {
      return res.status(401).json({ success: false, error: 'Expired or invalid refresh token' });
    }
  } else {
    let token = req.headers['x-auth-token'] || req.headers['x-access-token'] || req.headers['x-lumetric-token'];
    if (!token) {
      const authHeader = req.headers['authorization'];
      token = authHeader && (authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader);
    }
    if (!token) {
      return res.status(401).json({ success: false, error: 'Refresh token or active session required' });
    }
    if (isTokenRevoked(token)) {
      return res.status(401).json({ success: false, error: 'Session token has been revoked' });
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.jti && isTokenRevoked(decoded.jti)) {
        return res.status(401).json({ success: false, error: 'Session token has been revoked' });
      }
      targetUser = await getUserFromStore(req, decoded.email);
      if (!targetUser) {
        targetUser = { id: decoded.id, email: decoded.email, role: decoded.role || 'builder' };
      }
      revokeToken(token, decoded.exp ? decoded.exp * 1000 : null);
    } catch {
      return res.status(401).json({ success: false, error: 'Session expired. Please sign in again.' });
    }
  }

  const tokens = issueTokenPair(targetUser, familyId);
  logAuditEvent(targetUser.email, 'TOKEN_REFRESH_ROTATED', 'Authentication', 'Token pair rotated successfully');

  return res.json({
    success: true,
    token: tokens.token,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
    user: {
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      role: targetUser.role
    }
  });
});

module.exports = router;
