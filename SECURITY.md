# Security Policy & Data Governance

## 1. Overview
Lumetric is an enterprise-grade AI Data & Document Intelligence Studio built on Zoho Catalyst Serverless Architecture. Data security, privacy, and prevention of credential leakage are fundamental pillars of the Lumetric engineering platform.

---

## 2. Supported Versions

| Version | Supported          | Security Patches |
| ------- | ------------------ | ---------------- |
| 2.2.x   | :white_check_mark: | Active           |
| 2.1.x   | :white_check_mark: | Critical Only    |
| < 2.0   | :x:                | Deprecated       |

---

## 3. Cryptographic Standards & Authentication Architecture

### 3.1. Password Hashing & Key Derivation
- Passwords are never stored in plaintext or reversible formats.
- All account registrations and password updates use **Bcrypt with 12 salt rounds** (`bcrypt.genSalt(12)`).
- Strict complexity policies: minimum 8 characters, requiring at least one letter and at least one number or special symbol.

### 3.2. Session Security (JWT)
- Authenticated sessions are issued as signed JSON Web Tokens (JWT) using high-entropy secrets (`LUMETRIC_JWT_SECRET`).
- Tokens expire within 7 days and can be revoked upon sign-out.
- Tokens are transmitted via `Authorization: Bearer <token>` HTTP headers.

### 3.3. Database Persistence (Zoho Catalyst DataStore)
- User profiles, role assignments, and security preferences are persisted in the encrypted Zoho Catalyst DataStore (`Users` table).
- Single-quote escaping and parameterization are enforced across all Zoho Catalyst Query Language (ZCQL) expressions to prevent injection attacks.
- Profile updates utilize row identity lookups (`ROWID`) to prevent duplicate entry generation.

### 3.4. Two-Factor Authentication (2FA / TOTP)
- Time-based One-Time Password (TOTP) RFC 6238 compliance via Authenticator apps (Google Authenticator, Microsoft Authenticator, 1Password).
- Secure secret keys with QR code provisioning and server-side cryptographic challenge verification.

### 3.5. HTTP Security Headers
All API responses enforce enterprise security headers:
- `X-Content-Type-Options: nosniff` (prevents MIME-sniffing)
- `X-Frame-Options: DENY` (clickjacking prevention)
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS)
- `Cache-Control: no-store, no-cache, must-revalidate, private` on authentication and profile endpoints

### 3.6. Rate Limiting & Brute Force Prevention
- IP sliding-window rate limiters on registration (`max: 20 per 15 min`) and login (`max: 15 per 5 min`).
- Automatic `Retry-After` HTTP 429 backoff headers.

### 3.7. SOC-2 Tamper-Evident Audit Ledger
- All authentication events, role elevations, connector synchronizations, and profile changes are logged to an immutable cryptographic ledger.
- Each audit log entry includes an actor email, timestamp, action category, and a **SHA-256 integrity hash**.

---

## 4. Codebase & Repository Leak Prevention

1. **Zero Secrets in Repository**: No `.env` files, private keys, certificates (`.pem`, `.key`, `.keystore`, `.jks`), or access tokens are tracked in git.
2. **Exclusion Enforcement**: Strict `.gitignore` rules prevent accidental staging of credentials, local Catalyst configurations, or build artifacts.
3. **No Hardcoded Passwords**: All default demo passwords and testing autofill shortcuts have been excised from both backend services and frontend user interfaces.

---

## 5. Reporting a Vulnerability

If you discover a security vulnerability within the Lumetric codebase or infrastructure:
1. **Do NOT open a public GitHub issue.**
2. Email details directly to the security operations team at `security@lumetric.dev` or `singhrajveer077@gmail.com`.
3. Include:
   - Description of the vulnerability and affected component.
   - Proof-of-concept steps or payload.
   - Potential impact assessment.
4. The security response team will acknowledge receipt within 24 hours and provide an estimated remediation timeline.
