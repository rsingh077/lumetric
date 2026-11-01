/**
 * Lumetric Unified Validation Engine
 * Shared client/server validation rules for email authenticity,
 * disposable domain detection, and password policy enforcement.
 */

export interface EmailValidationResult {
  valid: boolean;
  message?: string;
  domain?: string;
  email?: string;
}

export interface PasswordValidationResult {
  valid: boolean;
  message?: string;
}

export const DISPOSABLE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  'mailinator.com', 'tempmail.com', 'temp-mail.org', '10minutemail.com',
  'guerrillamail.com', 'throwawaymail.com', 'yopmail.com', 'sharklasers.com',
  'dispostable.com', 'getairmail.com', 'trashmail.com', 'fakeinbox.com',
  'maildrop.cc', 'inboxkitten.com', 'nada.ltd', 'mohmal.com', 'mytemp.email',
  'burnermail.io', 'crazymailing.com', 'tempail.com', 'emailondeck.com',
  'fakemailgenerator.com', 'dropmail.me', 'disposablemail.com', 'trashmail.net'
]);

export const PLACEHOLDER_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  'test.com', 'example.com', 'sample.com', 'demo.com', 'fake.com', 'dummy.com', 'asdf.com'
]);

/**
 * Validates genuine email authenticity, domain structure, and rejects vague/numeric domains (e.g. 12.com)
 */
export function validateEmailAuthenticity(email: string): EmailValidationResult {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'Work email address is required.' };
  }

  const trimmed = email.trim().toLowerCase();
  if (trimmed.length === 0) {
    return { valid: false, message: 'Work email address is required.' };
  }
  if (trimmed.length > 254) {
    return { valid: false, message: 'Email address exceeds maximum permitted length (254 characters).' };
  }

  // Exactly one @ separator
  const parts = trimmed.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, message: 'Email must follow the format name@domain.com with a valid username and domain.' };
  }

  const [localPart, domainPart] = parts;

  // Local part syntax
  if (localPart.length > 64) {
    return { valid: false, message: 'Email username cannot exceed 64 characters.' };
  }
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return { valid: false, message: 'Email username cannot start or end with a period.' };
  }
  if (localPart.includes('..')) {
    return { valid: false, message: 'Email username cannot contain consecutive periods.' };
  }
  const localRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
  if (!localRegex.test(localPart)) {
    return { valid: false, message: 'Email username contains invalid characters.' };
  }

  // Domain syntax
  if (!domainPart.includes('.')) {
    return { valid: false, message: 'Email domain must include a top-level extension (e.g. .com, .org, .io).' };
  }
  if (domainPart.startsWith('.') || domainPart.endsWith('.')) {
    return { valid: false, message: 'Email domain cannot start or end with a period.' };
  }
  if (domainPart.includes('..')) {
    return { valid: false, message: 'Email domain cannot contain consecutive periods.' };
  }

  const labels = domainPart.split('.');
  const tld = labels[labels.length - 1];

  // Top-Level Domain (TLD) must be strictly letters and at least 2 chars
  if (!/^[a-zA-Z]{2,24}$/.test(tld)) {
    return {
      valid: false,
      message: `Invalid domain extension ".${tld}". Top-level domain must contain at least 2 letters and no numbers.`
    };
  }

  const reservedTlds = new Set(['test', 'example', 'invalid', 'localhost']);
  if (reservedTlds.has(tld)) {
    return { valid: false, message: `".${tld}" is a reserved non-routable extension. Please use an active email provider.` };
  }

  // Validate each domain segment
  for (let i = 0; i < labels.length - 1; i++) {
    const label = labels[i];
    if (!label) {
      return { valid: false, message: 'Email domain contains an empty segment.' };
    }
    if (label.startsWith('-') || label.endsWith('-')) {
      return { valid: false, message: `Domain label "${label}" cannot start or end with a hyphen.` };
    }
    if (!/^[a-zA-Z0-9-]+$/.test(label)) {
      return { valid: false, message: `Domain label "${label}" contains invalid characters.` };
    }
  }

  // Reject purely numeric domain names (e.g., 12.com or 123.456)
  const nonTldLabels = labels.slice(0, -1);
  const mainDomain = nonTldLabels[nonTldLabels.length - 1];
  if (/^\d+$/.test(mainDomain)) {
    return {
      valid: false,
      message: `Invalid domain "${domainPart}". Email domain cannot be purely numbers (e.g. 12.com is not allowed). Please use your genuine work or personal email.`
    };
  }

  if (!/[a-zA-Z]/.test(nonTldLabels.join(''))) {
    return {
      valid: false,
      message: `Invalid domain "${domainPart}". Email domain name must contain letters.`
    };
  }

  // Disposable email check
  if (DISPOSABLE_EMAIL_DOMAINS.has(domainPart)) {
    return {
      valid: false,
      message: `Temporary/disposable email domain "${domainPart}" is not permitted. Please use your genuine work or personal email address.`
    };
  }

  // Placeholder check
  if (PLACEHOLDER_EMAIL_DOMAINS.has(domainPart)) {
    return {
      valid: false,
      message: `"${domainPart}" is a placeholder domain. Please enter a genuine active email address.`
    };
  }

  return { valid: true, domain: domainPart, email: trimmed };
}

/**
 * Validates password complexity policy: minimum 8 characters, alphanumeric + symbols.
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required.' };
  }
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters in length.' };
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
  if (!hasLetter || !hasNumberOrSymbol) {
    return { valid: false, message: 'Password must contain at least one letter and at least one number or special character.' };
  }
  return { valid: true };
}
