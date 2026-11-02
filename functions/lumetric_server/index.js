'use strict';

/**
 * Lumetric Enterprise Decision Studio Server
 * Advanced I/O Serverless Function for Zoho Catalyst
 */

// Load local .env if present (strictly gitignored, dev/local fallback)
try {
  const fs = require('fs');
  const path = require('path');
  const envFile = path.join(__dirname, '.env');
  if (fs.existsSync(envFile)) {
    const envLines = fs.readFileSync(envFile, 'utf8').split('\n');
    for (const line of envLines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
} catch {
  // Silent in cloud serverless container
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const catalyst = require('zcatalyst-sdk-node');

const { issueTokenPair, revokeToken, isTokenRevoked } = require('./services/auth.service');
const { globalLimiter } = require('./middleware/rateLimiter');
const { requestTracingMiddleware, errorHandlerMiddleware } = require('./middleware/observability');

// Import modular domain routers
const telemetryRoutes = require('./routes/telemetry.routes');
const authRoutes = require('./routes/auth.routes');
const auth2faRoutes = require('./routes/auth-2fa.routes');
const authRecoveryRoutes = require('./routes/auth-recovery.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');
const auditRoutes = require('./routes/audit.routes');
const dataRoutes = require('./routes/data.routes');
const billingRoutes = require('./routes/billing.routes');

const app = express();

app.use(cors({ origin: true, credentials: true }));

// -----------------------------------------------------------------------------
// Security Headers via Helmet (CSP, HSTS, X-Content-Type-Options, Referrer-Policy)
// -----------------------------------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "*"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "data:", "https:"],
      frameAncestors: ["'self'"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  xContentTypeOptions: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request tracing and structured telemetry
app.use(requestTracingMiddleware);

// Handle Zoho Catalyst gateway path prefix if present
app.use((req, res, next) => {
  if (req.url.startsWith('/server/lumetric_server')) {
    req.url = req.url.slice('/server/lumetric_server'.length) || '/';
  }
  next();
});

// Initialize Catalyst SDK per request
app.use((req, res, next) => {
  try {
    res.locals.catalyst = catalyst.initialize(req, { scope: 'admin' });
  } catch {
    try {
      res.locals.catalyst = catalyst.initialize(req);
    } catch {
      res.locals.catalyst = null;
    }
  }
  next();
});

// Cache control for sensitive authentication and user profile data
app.use((req, res, next) => {
  if (req.url.startsWith('/api/auth') || req.url.startsWith('/api/user')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
  }
  next();
});

// Global rate limiter fallback (150 req/min/IP with telemetry bypass)
app.use((req, res, next) => {
  if (
    req.path === '/api/health' ||
    req.path === '/health' ||
    req.path === '/api/ping' ||
    req.path === '/ping' ||
    req.path === '/' ||
    req.path === '/api/status' ||
    req.path === '/status' ||
    req.path === '/api/version' ||
    req.path === '/api/metrics' ||
    req.path === '/api/mail/diagnostics' ||
    req.path === '/api/datastore/status'
  ) {
    return next();
  }
  return globalLimiter(req, res, next);
});

// Mount domain routes
app.use(telemetryRoutes);
app.use(authRoutes);
app.use(auth2faRoutes);
app.use(authRecoveryRoutes);
app.use(userRoutes);
app.use(adminRoutes);
app.use(auditRoutes);
app.use(dataRoutes);
app.use(billingRoutes);

// Catch-all route for unmatched paths
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.url}`,
    reqId: req.id || undefined
  });
});

// Global error catcher (observability middleware)
app.use(errorHandlerMiddleware);

// Catalyst Entry Export
app.issueTokenPair = issueTokenPair;
app.revokeToken = revokeToken;
app.isTokenRevoked = isTokenRevoked;
module.exports = app;
