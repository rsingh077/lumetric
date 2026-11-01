'use strict';

/**
 * Lumetric Billing & Subscriptions Service
 * Manages tiers (Basic, Pro, Enterprise), UPI QR checkout, order tracking, and invoices.
 */

const BILLING_PLANS = {
  basic: {
    id: 'basic',
    name: 'Basic Free',
    badge: 'Standard',
    tagline: 'Essential data exploration & local analytics for individuals',
    priceINR: 0,
    priceUSD: 0,
    interval: 'forever',
    limits: {
      maxDatasets: 2,
      maxRows: 10000,
      aiTokensPerDay: 15,
      exportFormats: ['csv'],
      teamSeats: 1,
      supportSLA: 'Community Forum'
    },
    features: [
      'Up to 2 active tabular datasets',
      '10,000 rows max per workspace',
      'Interactive summary statistics & charts',
      'CSV data export',
      'Client-side IndexedDB local vault'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro Studio',
    badge: 'Popular',
    tagline: 'High-capacity predictive intelligence for data engineers & analysts',
    priceINR: 1,
    priceUSD: 1,
    interval: 'month',
    annualPriceINR: 1,
    annualPriceUSD: 1,
    limits: {
      maxDatasets: 999999,
      maxRows: 500000,
      aiTokensPerDay: 500,
      exportFormats: ['csv', 'pdf', 'excel', 'png'],
      teamSeats: 3,
      supportSLA: 'Priority Support (< 4h response)'
    },
    features: [
      'Unlimited datasets & workspaces',
      '500,000 rows high-capacity limit',
      'Catmull-Rom cubic spline trajectory forecasting',
      'White-label executive PDF exports',
      'Hardware 2FA / TOTP authentication',
      'Unlimited AI Copilot queries',
      'Priority compute pipeline'
    ]
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Scale',
    badge: 'All Inclusive',
    tagline: 'Full governance, custom connectors & dedicated security for organizations',
    priceINR: 2499,
    priceUSD: 39,
    interval: 'month',
    annualPriceINR: 24990,
    annualPriceUSD: 390,
    limits: {
      maxDatasets: 999999,
      maxRows: 10000000,
      aiTokensPerDay: 5000,
      exportFormats: ['csv', 'pdf', 'excel', 'png', 'audit_json'],
      teamSeats: 25,
      supportSLA: '24/7 Dedicated Support & SOC-2 SLA'
    },
    features: [
      'Everything in Pro Studio',
      'Multi-million row high-throughput processing',
      'Role-Based Access Control (Admin, Builder, Reviewer, Viewer)',
      'Immutable SHA-256 SOC-2 audit logging',
      'Dedicated Snowflake & AWS S3 KMS connector sync',
      'Custom invoice generation & GST billing',
      'Catalyst cloud high-concurrency dedicated tenant'
    ]
  }
};

const activeBillingOrders = new Map();
const redeemedUtrs = new Set();

module.exports = {
  BILLING_PLANS,
  activeBillingOrders,
  redeemedUtrs
};
