# ADR 0002: Fail-Closed Secrets Hygiene

**Status**: Accepted  
**Date**: 2026-11-01  
**Deciders**: Godwin (Senior Software Architect), Core Engineering Team  

---

## Context

In early iterations of the backend codebase, fallback default credentials and secrets (such as fallback JWT secrets or test webhook secrets) were present in the source files to facilitate frictionless local development. Additionally, an SMTP password had been committed to `catalyst-config.json`. 

In a production banking and data studio application, hardcoded fallback secrets pose severe security risks: if an environment variable fails to load, the server continues running in an insecure state with predictable credentials (fail-open).

## Decision

We adopt a strict **Fail-Closed Secrets Hygiene** policy:
1. **Zero Hardcoded Secrets**: No secret literals may exist in the codebase.
2. **Fail-Closed Boot**: Critical secrets (`LUMETRIC_JWT_SECRET`, `BANK_WEBHOOK_SECRET`, `SMTP_PASS`) must be supplied via environment variables. If any required secret is missing or empty, the application throws an immediate, fatal error and refuses to start:
   ```js
   const JWT_SECRET = process.env.LUMETRIC_JWT_SECRET;
   if (!JWT_SECRET) {
     throw new Error('FATAL: LUMETRIC_JWT_SECRET environment variable is missing.');
   }
   ```
3. **Environment Separation**: Local overrides reside exclusively in gitignored `.env` files. In production, variables are configured via Zoho Catalyst Application Environment Variables.
4. **Credential Rotation**: All previously exposed credentials (including Zoho SMTP App Passwords) were rotated, and git history was scanned to verify zero tracked secrets.

## Consequences

- **Positive**: Eliminates credential leakage risks and prevents silent fallback to compromised development keys.
- **Positive**: Satisfies enterprise SOC-2 Type II audit readiness criteria.
- **Trade-off**: Requires test runners and CI pipelines to explicitly inject test environment variables (`NODE_ENV=test`).
