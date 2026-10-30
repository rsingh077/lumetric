# AgentShield Zero-Trust Security Rules (Adapted from ECC)

These security rules enforce zero-trust identity verification, anti-bypass cryptographic integrity, and secure credential isolation across Lumetric.

## 1. Authentication & OTP Verification
- **Mandatory OTP Gating**: Every user login, even with correct password verification, MUST require single-use 6-digit OTP verification. Passwords alone must NEVER issue an access token.
- **Anti-Bypass Signatures**: OTP verification requests MUST contain cryptographic HMAC challenge signatures (`challenge_sig`) validated using constant-time comparison (`crypto.timingSafeEqual`) to prevent side-channel timing attacks and client tampering.
- **3-Strike Lockout Policy**: OTP challenges expire strictly after 10 minutes or 3 failed attempts, automatically purging cached records from the datastore.

## 2. Real-Time Account Differentiation
- **Non-Enumeration Protection**: The `/api/auth/check-email` endpoint must cleanly distinguish existing vs new accounts for UX routing while rate-limiting IP requests to prevent bulk email scraping.

## 3. Secret & Credential Isolation
- **No Hardcoded Secrets**: Production SMTP credentials (Zoho Enterprise security keys), JWT signing secrets, and Catalyst App passwords must NEVER be committed to Git or hardcoded in client bundles. Always resolve via environment variables (`process.env.SMTP_PASSWORD`).
- **Sanitized Error Logs**: Authentication failure logs must redact raw passwords, OTP codes, and personal identifiers before writing to system logs.
