'use strict';

const assert = require('assert');
const serverValidation = require('./lib/validation');

console.log('Testing Shared Validation Module (CommonJS & Logic Parity)...');

// 1. Email Authenticity - Valid Emails
const valid1 = serverValidation.validateEmailAuthenticity('alex.smith@lumetric.dev');
assert.strictEqual(valid1.valid, true);
assert.strictEqual(valid1.domain, 'lumetric.dev');

const valid2 = serverValidation.validateEmailAuthenticity('founder@techexon.app');
assert.strictEqual(valid2.valid, true);
assert.strictEqual(valid2.domain, 'techexon.app');

// 2. Email Authenticity - Disposable Emails Rejected
const disp = serverValidation.validateEmailAuthenticity('test@mailinator.com');
assert.strictEqual(disp.valid, false);
assert(disp.message.includes('Temporary/disposable email domain'));

// 3. Email Authenticity - Placeholder Emails Rejected
const placeholder = serverValidation.validateEmailAuthenticity('user@example.com');
assert.strictEqual(placeholder.valid, false);
assert(placeholder.message.includes('placeholder domain'));

// 4. Email Authenticity - Purely numeric domain Rejected
const numDomain = serverValidation.validateEmailAuthenticity('john@12.com');
assert.strictEqual(numDomain.valid, false);
assert(numDomain.message.includes('purely numbers'));

// 5. Password Validation - Short Password (< 8 chars)
const shortPw = serverValidation.validatePasswordStrength('Abc1!');
assert.strictEqual(shortPw.valid, false);
assert(shortPw.message.includes('at least 8 characters'));

// 6. Password Validation - Letters Only (No number or symbol)
const lettersOnly = serverValidation.validatePasswordStrength('LongPasswordOnlyLetters');
assert.strictEqual(lettersOnly.valid, false);
assert(lettersOnly.message.includes('at least one number or special character'));

// 7. Password Validation - Strong Password
const strongPw = serverValidation.validatePasswordStrength('EnterprisePass2026!');
assert.strictEqual(strongPw.valid, true);

console.log('✓ All 7 Shared Validation parity checks PASSED successfully!');
