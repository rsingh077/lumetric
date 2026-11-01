'use strict';

/**
 * Lumetric Authentication & Token Service
 * Manages JWT access/refresh token rotation, token revocation list,
 * password hashing/verification, TOTP 2FA, and OTP challenges.
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');

const JWT_SECRET = process.env.LUMETRIC_JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('LUMETRIC_JWT_SECRET not set');
}
const JWT_EXPIRES_IN = '7d';

const tokenRevocationList = new Map(); // token / jti -> expiresAt
const refreshTokenRegistry = new Map(); // refreshJti -> { userId, email, familyId, expiresAt, isRevoked }
const otpStore = new Map(); // email -> challenge data

function revokeToken(tokenOrJti, expiresAt) {
  if (!tokenOrJti) return;
  const exp = expiresAt || Date.now() + 7 * 24 * 60 * 60 * 1000;
  tokenRevocationList.set(tokenOrJti, exp);
}

function isTokenRevoked(tokenOrJti) {
  if (!tokenOrJti) return false;
  const exp = tokenRevocationList.get(tokenOrJti);
  if (!exp) return false;
  if (Date.now() > exp) {
    tokenRevocationList.delete(tokenOrJti);
    return false;
  }
  return true;
}

function issueTokenPair(user, existingFamilyId = null) {
  const jti = `acc_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  const refreshJti = `ref_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  const familyId = existingFamilyId || `fam_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

  // Access token: 1 hour
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role || 'builder',
      name: user.name || '',
      jti
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Refresh token: 7 days
  const refreshToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      familyId,
      jti: refreshJti,
      type: 'refresh'
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  refreshTokenRegistry.set(refreshJti, {
    userId: user.id,
    email: user.email,
    familyId,
    expiresAt,
    isRevoked: false
  });

  return {
    token: accessToken,
    accessToken,
    refreshToken,
    expiresIn: 3600
  };
}

async function hashPassword(plainPassword) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
}

async function verifyPassword(plainPassword, hashedPassword) {
  if (!plainPassword || !hashedPassword) return false;
  return bcrypt.compare(plainPassword, hashedPassword);
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  tokenRevocationList,
  refreshTokenRegistry,
  otpStore,
  revokeToken,
  isTokenRevoked,
  issueTokenPair,
  hashPassword,
  verifyPassword,
  generateOtp,
  authenticator,
  qrcode
};
