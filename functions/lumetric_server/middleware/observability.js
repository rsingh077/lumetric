'use strict';

const crypto = require('crypto');
const { getCacheStats } = require('../services/datastore.service');

// In-memory rolling metrics store
const MAX_LATENCY_SAMPLES = 500;
const latencySamples = [];
let totalRequests = 0;
let errorCount = 0;

/**
 * Structured JSON Logger
 */
const logger = {
  info: (msg, meta = {}) => {
    const entry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: msg,
      ...meta
    };
    process.stdout.write(JSON.stringify(entry) + '\n');
  },
  warn: (msg, meta = {}) => {
    const entry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: msg,
      ...meta
    };
    process.stdout.write(JSON.stringify(entry) + '\n');
  },
  error: (msg, meta = {}) => {
    const entry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message: msg,
      ...meta
    };
    process.stderr.write(JSON.stringify(entry) + '\n');
  }
};

/**
 * Request Tracing & Structured Telemetry Middleware
 */
function requestTracingMiddleware(req, res, next) {
  const reqId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);

  totalRequests++;
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const durationMs = Number((endTime - startTime) / 1000000n);

    // Keep rolling latency buffer
    if (latencySamples.length >= MAX_LATENCY_SAMPLES) {
      latencySamples.shift();
    }
    latencySamples.push(durationMs);

    const isError = res.statusCode >= 500;
    if (res.statusCode >= 400) {
      errorCount++;
    }

    const clientIp = (
      req.headers['x-forwarded-for'] ||
      req.socket?.remoteAddress ||
      '127.0.0.1'
    ).split(',')[0].trim();

    const logPayload = {
      reqId,
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      clientIp
    };

    if (isError) {
      logger.error('Request failed with server error', logPayload);
    } else if (process.env.NODE_ENV !== 'test' || res.statusCode >= 400) {
      logger.info('Request completed', logPayload);
    }
  });

  next();
}

/**
 * Calculate p50 and p95 latencies
 */
function calculatePercentiles() {
  if (latencySamples.length === 0) {
    return { p50: 0, p95: 0 };
  }
  const sorted = [...latencySamples].sort((a, b) => a - b);
  const p50Index = Math.floor(sorted.length * 0.5);
  const p95Index = Math.min(Math.floor(sorted.length * 0.95), sorted.length - 1);
  return {
    p50: Number(sorted[p50Index].toFixed(2)),
    p95: Number(sorted[p95Index].toFixed(2))
  };
}

/**
 * Get aggregated runtime metrics
 */
function getMetrics() {
  const percentiles = calculatePercentiles();
  const cacheStats = getCacheStats();

  return {
    uptimeSec: Math.floor(process.uptime()),
    memoryStoreSize: cacheStats.totalMemoryKeys,
    totalRequests,
    errorCount,
    p50LatencyMs: percentiles.p50,
    p95LatencyMs: percentiles.p95,
    cacheHitRate: `${cacheStats.hitRatePercent}%`,
    cacheStats: {
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      hitRatePercent: cacheStats.hitRatePercent,
      memoryCacheEntries: cacheStats.memoryCacheSize,
      ordersEntries: cacheStats.ordersStoreSize
    },
    nodeVersion: process.version,
    memoryUsage: process.memoryUsage()
  };
}

/**
 * Centralized Error-Handling Middleware
 */
function errorHandlerMiddleware(err, req, res, _next) {
  const reqId = req.id || 'unknown';
  logger.error('Centralized error handler caught unhandled exception', {
    reqId,
    method: req.method,
    path: req.originalUrl || req.url,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error',
    reqId
  });
}

module.exports = {
  logger,
  requestTracingMiddleware,
  errorHandlerMiddleware,
  getMetrics,
  calculatePercentiles
};
