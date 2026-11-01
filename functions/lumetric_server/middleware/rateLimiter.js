'use strict';

/**
 * Lumetric Sliding-Window IP Rate Limiter Middleware
 */

const rateLimitMap = new Map();

function rateLimiter(options = { windowMs: 60 * 1000, max: 200, message: 'Too many requests, please try again later.' }) {
  return (req, res, next) => {
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'global-client';
    const emailKey = req.body && req.body.email ? String(req.body.email).toLowerCase().trim() : '';
    const ip = `${rawIp}:${emailKey}`;
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

const globalLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 150,
  message: 'Global rate limit reached: Max 150 requests per minute per IP. Please slow down.'
});

module.exports = {
  rateLimiter,
  globalLimiter,
  rateLimitMap
};
