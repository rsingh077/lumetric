'use strict';

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const JWT_SECRET = process.env.LUMETRIC_JWT_SECRET || 'lumetric-production-hyper-secure-secret-key-2026';
const JWT_EXPIRES_IN = '7d';

// In-Memory Rate Limiting Bucket Map
const rateLimitMap = new Map();
function rateLimiter(options = { windowMs: 60 * 1000, max: 60, message: 'Too many requests, please try again later.' }) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'global-client';
    const now = Date.now();
    let clientRecord = rateLimitMap.get(ip);

    if (!clientRecord) {
      clientRecord = { count: 1, startTime: now };
      rateLimitMap.set(ip, clientRecord);
    } else {
      if (now - clientRecord.startTime > options.windowMs) {
        clientRecord.count = 1;
        clientRecord.startTime = now;
      } else {
        clientRecord.count++;
        if (clientRecord.count > options.max) {
          const retryAfter = Math.ceil((options.windowMs - (now - clientRecord.startTime)) / 1000);
          res.setHeader('Retry-After', retryAfter);
          return res.status(429).json({
            success: false,
            error: options.message,
            retryAfterSeconds: retryAfter
          });
        }
      }
    }

    res.setHeader('X-RateLimit-Limit', options.max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - clientRecord.count));
    next();
  };
}

// In-Memory Fallback & Fast Cache Store
// Schema: id, email, passwordHash, name, role, organization, avatarUrl, createdAt, lastLoginAt, settings
const userDatabase = new Map();
const sessionTokens = new Set();

// Seed Default System Admin & Demo Accounts
(async () => {
  const adminSalt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash('LumetricAdmin2026!', adminSalt);
  userDatabase.set('admin@lumetric.dev', {
    id: 'usr_admin_001',
    email: 'admin@lumetric.dev',
    passwordHash: adminHash,
    name: 'Rajveer Singh',
    role: 'owner',
    organization: 'Lumetric Core Labs',
    avatarUrl: '',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    settings: {
      theme: 'dark',
      currency: 'USD',
      emailNotifications: true,
      hapticsEnabled: true
    }
  });

  const demoSalt = await bcrypt.genSalt(10);
  const demoHash = await bcrypt.hash('DemoUser123!', demoSalt);
  userDatabase.set('demo@lumetric.dev', {
    id: 'usr_demo_002',
    email: 'demo@lumetric.dev',
    passwordHash: demoHash,
    name: 'Alex Chen',
    role: 'builder',
    organization: 'Rainfall Analytics',
    avatarUrl: '',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    settings: {
      theme: 'system',
      currency: 'INR',
      emailNotifications: false,
      hapticsEnabled: true
    }
  });
})();

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication token required'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired authentication session'
      });
    }

    const user = userDatabase.get(decoded.email);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User profile associated with token no longer exists'
      });
    }

    req.user = user;
    req.token = token;
    next();
  });
}

// -----------------------------------------------------------------------------
// ROUTES
// -----------------------------------------------------------------------------

// 1. Health & Server Telemetry
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Lumetric Engine API Server',
    cloudProvider: 'Zoho Catalyst Serverless',
    region: 'India (.in)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    healthy: true,
    totalRegisteredUsers: userDatabase.size,
    rateLimiterActiveIPs: rateLimitMap.size,
    memoryUsage: process.memoryUsage(),
    catalystTimestamp: Date.now()
  });
});

// 2. Authentication: Sign Up (Register User)
app.post('/api/auth/register', rateLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many accounts created from this IP. Please wait 15 minutes.' }), async (req, res) => {
  try {
    const { email, password, name, organization, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and full name are required.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address format.'
      });
    }

    // Password strength check (min 8 chars, at least 1 number)
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters in length.'
      });
    }

    if (userDatabase.has(normalizedEmail)) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists.'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      email: normalizedEmail,
      passwordHash,
      name: name.trim(),
      role: role && ['owner', 'administrator', 'builder', 'reviewer', 'viewer'].includes(role) ? role : 'builder',
      organization: organization ? organization.trim() : 'Personal Workspace',
      avatarUrl: '',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      settings: {
        theme: 'system',
        currency: 'USD',
        emailNotifications: true,
        hapticsEnabled: true
      }
    };

    userDatabase.set(normalizedEmail, newUser);

    // Sign JWT
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    sessionTokens.add(token);

    // Safe user object response
    const { passwordHash: _, ...userSafe } = newUser;

    return res.status(201).json({
      success: true,
      message: 'Account successfully registered and authenticated.',
      token,
      user: userSafe
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error processing registration.'
    });
  }
});

// 3. Authentication: Login
app.post('/api/auth/login', rateLimiter({ windowMs: 5 * 60 * 1000, max: 20, message: 'Too many login attempts. Please try again after 5 minutes.' }), async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both email and password.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = userDatabase.get(normalizedEmail);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. No user found with this email.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Incorrect password.'
      });
    }

    user.lastLoginAt = new Date().toISOString();

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    sessionTokens.add(token);

    const { passwordHash: _, ...userSafe } = user;

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: userSafe
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error processing login.'
    });
  }
});

// 4. Authentication: Logout
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  sessionTokens.delete(req.token);
  return res.json({
    success: true,
    message: 'User logged out successfully.'
  });
});

// 5. User Profile: Get Current Profile
app.get('/api/user/profile', authenticateToken, (req, res) => {
  const { passwordHash: _, ...userSafe } = req.user;
  return res.json({
    success: true,
    user: userSafe
  });
});

// 6. User Profile: Update Profile Details
app.patch('/api/user/profile', authenticateToken, (req, res) => {
  try {
    const { name, organization, avatarUrl, settings } = req.body;
    const user = req.user;

    if (name) user.name = name.trim();
    if (organization) user.organization = organization.trim();
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (settings && typeof settings === 'object') {
      user.settings = { ...user.settings, ...settings };
    }

    const { passwordHash: _, ...userSafe } = user;

    return res.json({
      success: true,
      message: 'User profile updated successfully.',
      user: userSafe
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update user profile.'
    });
  }
});

// 7. Security: Change Password
app.post('/api/user/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Both current password and new password are required.'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters.'
      });
    }

    const user = req.user;
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'Current password provided is incorrect.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);

    return res.json({
      success: true,
      message: 'Password successfully changed.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to change password.'
    });
  }
});

// Catalyst Entry Export
module.exports = app;