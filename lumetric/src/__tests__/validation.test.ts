import {
  validateEmailAuthenticity,
  validatePasswordStrength,
  DISPOSABLE_EMAIL_DOMAINS,
  PLACEHOLDER_EMAIL_DOMAINS,
} from '@/lib/validation';

describe('Frontend Validation Engine Parity', () => {
  describe('validateEmailAuthenticity', () => {
    test('accepts valid corporate and personal emails', () => {
      const validEmails = [
        'user@example-company.com',
        'first.last@sub.domain.co.uk',
        'dev+tag@google.org',
        'architect@lumetric.io',
      ];
      for (const email of validEmails) {
        const res = validateEmailAuthenticity(email);
        expect(res.valid).toBe(true);
        expect(res.email).toBe(email.toLowerCase());
      }
    });

    test('rejects empty, non-string, or oversized emails', () => {
      expect(validateEmailAuthenticity('').valid).toBe(false);
      expect(validateEmailAuthenticity(null as unknown as string).valid).toBe(false);
      expect(validateEmailAuthenticity('a'.repeat(250) + '@example.com').valid).toBe(false);
    });

    test('rejects missing or malformed @ symbol and parts', () => {
      expect(validateEmailAuthenticity('plainaddress').valid).toBe(false);
      expect(validateEmailAuthenticity('@domain.com').valid).toBe(false);
      expect(validateEmailAuthenticity('user@').valid).toBe(false);
      expect(validateEmailAuthenticity('user@domain@domain.com').valid).toBe(false);
    });

    test('rejects invalid local parts with double dots or boundary dots', () => {
      expect(validateEmailAuthenticity('.user@domain.com').valid).toBe(false);
      expect(validateEmailAuthenticity('user.@domain.com').valid).toBe(false);
      expect(validateEmailAuthenticity('user..name@domain.com').valid).toBe(false);
      expect(validateEmailAuthenticity('a'.repeat(65) + '@domain.com').valid).toBe(false);
    });

    test('rejects numeric and invalid domain extensions', () => {
      expect(validateEmailAuthenticity('user@12.com').valid).toBe(false);
      expect(validateEmailAuthenticity('user@domain.123').valid).toBe(false);
      expect(validateEmailAuthenticity('user@domain.c').valid).toBe(false);
      expect(validateEmailAuthenticity('user@domain.invalid').valid).toBe(false);
    });

    test('rejects known disposable and placeholder email domains', () => {
      for (const domain of Array.from(DISPOSABLE_EMAIL_DOMAINS).slice(0, 5)) {
        const res = validateEmailAuthenticity(`test@${domain}`);
        expect(res.valid).toBe(false);
        expect(res.message).toContain('disposable');
      }

      for (const domain of Array.from(PLACEHOLDER_EMAIL_DOMAINS).slice(0, 5)) {
        const res = validateEmailAuthenticity(`test@${domain}`);
        expect(res.valid).toBe(false);
        expect(res.message).toContain('placeholder');
      }
    });
  });

  describe('validatePasswordStrength', () => {
    test('accepts strong passwords meeting length and character requirements', () => {
      expect(validatePasswordStrength('SuperSecret1!').valid).toBe(true);
      expect(validatePasswordStrength('Password2026').valid).toBe(true);
      expect(validatePasswordStrength('abcde#fgh').valid).toBe(true);
    });

    test('rejects short passwords (< 8 chars)', () => {
      expect(validatePasswordStrength('Short1!').valid).toBe(false);
      expect(validatePasswordStrength('').valid).toBe(false);
      expect(validatePasswordStrength(null as unknown as string).valid).toBe(false);
    });

    test('rejects passwords missing either letters or symbols/digits', () => {
      expect(validatePasswordStrength('1234567890').valid).toBe(false);
      expect(validatePasswordStrength('abcdefghijk').valid).toBe(false);
    });
  });
});
