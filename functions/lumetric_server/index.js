'use strict';

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

let catalyst = null;
try {
  catalyst = require('zcatalyst-sdk-node');
} catch (e) {
  console.log('Catalyst SDK load note:', e.message);
}

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const JWT_SECRET = process.env.LUMETRIC_JWT_SECRET || 'lumetric-production-hyper-secure-secret-key-2026';
const JWT_EXPIRES_IN = '7d';

// Rate Limiting Bucket Map
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

// -----------------------------------------------------------------------------
// CRYSTAL / CATALYST DATA STORE HELPER
// -----------------------------------------------------------------------------
const memoryStore = new Map();

async function initCatalystApp(req) {
  if (!catalyst) return null;
  try {
    return catalyst.initialize(req);
  } catch (err) {
    return null;
  }
}

async function getUserFromStore(req, email) {
  const normEmail = email.toLowerCase().trim();
  // 1. Try Catalyst Data Store
  const catApp = await initCatalystApp(req);
  if (catApp && catApp.zcql) {
    try {
      const zcqlRes = await catApp.zcql().executeZCQLExpression(
        `SELECT * FROM Users WHERE email = '${normEmail}'`
      );
      if (zcqlRes && zcqlRes.length > 0) {
        const u = zcqlRes[0].Users;
        return {
          id: u.ROWID ? String(u.ROWID) : u.id,
          email: u.email,
          passwordHash: u.passwordHash,
          name: u.name,
          role: u.role,
          organization: u.organization,
          avatarUrl: u.avatarUrl || '',
          createdAt: u.CREATEDTIME || u.createdAt,
          lastLoginAt: u.lastLoginAt || new Date().toISOString(),
          settings: typeof u.settings === 'string' ? JSON.parse(u.settings || '{}') : (u.settings || {})
        };
      }
    } catch (e) {
      // Data Store table Users might not be created yet, fallback gracefully
    }
  }

  // 2. Return from Fast In-Memory Store
  return memoryStore.get(normEmail) || null;
}

async function saveUserToStore(req, user) {
  const normEmail = user.email.toLowerCase().trim();
  memoryStore.set(normEmail, user);

  // Try persist into Catalyst Data Store
  const catApp = await initCatalystApp(req);
  if (catApp && catApp.datastore) {
    try {
      const table = catApp.datastore().table('Users');
      await table.insertRow({
        email: normEmail,
        passwordHash: user.passwordHash,
        name: user.name,
        role: user.role,
        organization: user.organization || '',
        avatarUrl: user.avatarUrl || '',
        lastLoginAt: user.lastLoginAt || new Date().toISOString(),
        settings: JSON.stringify(user.settings || {})
      });
    } catch (e) {
      // In case table isn't created on Catalyst Console yet, memoryStore preserves state
    }
  }
}

async function getAllUsersFromStore(req) {
  const catApp = await initCatalystApp(req);
  if (catApp && catApp.zcql) {
    try {
      const zcqlRes = await catApp.zcql().executeZCQLExpression(`SELECT * FROM Users`);
      if (zcqlRes && zcqlRes.length > 0) {
        return zcqlRes.map(r => {
          const u = r.Users;
          return {
            id: u.ROWID ? String(u.ROWID) : u.id,
            email: u.email,
            name: u.name,
            role: u.role,
            organization: u.organization,
            avatarUrl: u.avatarUrl || '',
            createdAt: u.CREATEDTIME || u.createdAt,
            lastLoginAt: u.lastLoginAt
          };
        });
      }
    } catch (e) {}
  }

  const list = [];
  for (const [, user] of memoryStore.entries()) {
    const { passwordHash: _, ...safe } = user;
    list.push(safe);
  }
  return list;
}

// Seed Initial Admin & Demo Accounts
(async () => {
  const adminSalt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash('LumetricAdmin2026!', adminSalt);
  memoryStore.set('admin@lumetric.dev', {
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
  memoryStore.set('demo@lumetric.dev', {
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
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication token required'
    });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired authentication session'
      });
    }

    const user = await getUserFromStore(req, decoded.email);
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

// 1. Health
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Lumetric Engine API Server with Crystal Data Store',
    cloudProvider: 'Zoho Catalyst Serverless',
    region: 'India (.in)',
    version: '1.2.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    healthy: true,
    totalRegisteredUsers: memoryStore.size,
    rateLimiterActiveIPs: rateLimitMap.size,
    memoryUsage: process.memoryUsage(),
    catalystTimestamp: Date.now()
  });
});

// 2. Authentication: Register / Create Account
app.post('/api/auth/register', rateLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: 'Rate limit reached: Max 10 account creations per 15 minutes.' }), async (req, res) => {
  try {
    const { email, password, name, organization, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and full name are required.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address format.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters in length.'
      });
    }

    const existingUser = await getUserFromStore(req, normalizedEmail);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      email: normalizedEmail,
      passwordHash,
      name: name.trim(),
      role: role && ['owner', 'administrator', 'builder', 'reviewer', 'viewer'].includes(role) ? role : 'builder',
      organization: organization ? organization.trim() : 'Workspace Team',
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

    await saveUserToStore(req, newUser);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const { passwordHash: _, ...userSafe } = newUser;

    return res.status(201).json({
      success: true,
      message: 'Account successfully registered and saved to database.',
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
app.post('/api/auth/login', rateLimiter({ windowMs: 5 * 60 * 1000, max: 20, message: 'Rate limit reached: Max 20 login attempts per 5 minutes.' }), async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both email and password.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await getUserFromStore(req, normalizedEmail);

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
    await saveUserToStore(req, user);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

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
app.patch('/api/user/profile', authenticateToken, async (req, res) => {
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

    const { passwordHash: _, ...userSafe } = user;

    return res.json({
      success: true,
      message: 'User profile updated in database.',
      user: userSafe
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update user profile.'
    });
  }
});

// 7. Admin Profile & Role Dashboard Route: List All Workspace Users
app.get('/api/admin/users', authenticateToken, async (req, res) => {
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

// 8. Admin Profile Dashboard: Update Any User's Role & Governance Grants
app.patch('/api/admin/users/:userId/role', authenticateToken, async (req, res) => {
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

  targetUser.role = newRole;
  await saveUserToStore(req, targetUser);

  const { passwordHash: _, ...userSafe } = targetUser;
  return res.json({
    success: true,
    message: `User role successfully elevated to ${newRole.toUpperCase()} in database.`,
    user: userSafe
  });
});

// Catalyst Entry Export
module.exports = app;