'use strict';

const validation = require('../lib/validation');

describe('Shared Validation Logic & Security Parity', () => {
  test('Valid enterprise and standard emails pass', () => {
    const res1 = validation.validateEmailAuthenticity('founder@techexon.app');
    expect(res1.valid).toBe(true);
    expect(res1.domain).toBe('techexon.app');

    const res2 = validation.validateEmailAuthenticity('alex.smith@lumetric.dev');
    expect(res2.valid).toBe(true);
  });

  test('Disposable and temporary email domains are rejected', () => {
    const res = validation.validateEmailAuthenticity('scammer@mailinator.com');
    expect(res.valid).toBe(false);
    expect(res.message).toMatch(/disposable/i);
  });

  test('Placeholder and template email domains are rejected', () => {
    const res = validation.validateEmailAuthenticity('demo@example.com');
    expect(res.valid).toBe(false);
    expect(res.message).toMatch(/placeholder/i);
  });

  test('Malformed emails are rejected', () => {
    expect(validation.validateEmailAuthenticity('').valid).toBe(false);
    expect(validation.validateEmailAuthenticity('no-at-sign.com').valid).toBe(false);
    expect(validation.validateEmailAuthenticity('@nodomain.com').valid).toBe(false);
  });
});
