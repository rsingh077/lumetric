'use strict';

process.env.NODE_ENV = 'test';
process.env.LUMETRIC_JWT_SECRET = 'test-jwt-secret-for-jest-testing-32chars';
process.env.BANK_WEBHOOK_SECRET = 'test-bank-webhook-secret-key-2026';
process.env.MERCHANT_UPI_VPA = 'lumetric@upi';
process.env.MERCHANT_PAYEE_NAME = 'Lumetric Studio';
process.env.SMTP_USER = 'security@test.lumetric.dev';
process.env.SMTP_PASS = 'mock-smtp-password';
