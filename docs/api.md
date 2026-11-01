# Lumetric Enterprise Serverless API Reference

**Version**: `2.3.4`  
**Base URL**: `https://project-rainfall-60092395179.development.catalystserverless.in/server/lumetric_server`  
**Runtime**: Node.js 18 / Express 4 Serverless Function on Zoho Catalyst  
**Authentication**: Bearer JWT (`Authorization: Bearer <token>`) & Refresh Token Rotation

---

## Architecture Overview

All requests are subject to:
1. **Security Headers**: HSTS, CSP, X-Content-Type-Options via Helmet.
2. **Request Tracing**: `X-Request-Id` generated or forwarded, included in all responses and structured JSON logs.
3. **Sliding-Window Rate Limiting**: 150 req/min/IP global fallback; sensitive endpoints (auth/OTP) have dedicated tighter quotas.
4. **Authoritative Persistence**: Zoho Catalyst DataStore is the authoritative single source of truth. In-memory `memoryCache` acts purely as an LRU/TTL read-through cache.

---

## Endpoint Domain Catalog

| Domain | Method | Path | Auth Required | Purpose |
|---|---|---|---|---|
| **Telemetry** | `GET` | `/` | No | Root Gateway online probe & SOC-2 compliance |
| **Telemetry** | `GET` | `/api/health` | No | Node.js memory footprint, uptime, active connectors |
| **Telemetry** | `GET` | `/api/status` | No | Heartbeat status check |
| **Telemetry** | `GET` | `/api/ping` | No | Low-overhead network latency probe |
| **Telemetry** | `GET` | `/api/version` | No | Returns engine semantic version |
| **Telemetry** | `GET` | `/api/metrics` | No | Runtime latency p50/p95, requests, errors, cache hit rate |
| **Telemetry** | `GET` | `/api/geo/summary` | No | Sovereign GIS territorial boundaries (India, US, World) |
| **Telemetry** | `GET` | `/api/diagnostics/system` | No | Cloud compute environment & rate-limiter diagnostics |
| **Telemetry** | `GET` | `/api/datastore/status` | No | Zoho Catalyst DataStore table and column health check |
| **Telemetry** | `GET` | `/api/mail/diagnostics` | No | Zoho SMTP connectivity & credentials check |
| **Auth** | `POST` | `/api/auth/check-email` | No | Real-time email validation and Old/New user detection |
| **Auth** | `POST` | `/api/auth/send-otp` | No | Dispatch 6-digit verification code via Zoho SMTP |
| **Auth** | `POST` | `/api/auth/verify-otp` | No | Complete signup, OTP login, or password reset verification |
| **Auth** | `POST` | `/api/auth/login` | No | Password authentication with optional 2FA challenge |
| **Auth** | `POST` | `/api/auth/refresh` | No (Refresh Token) | Rotate refresh token and issue fresh short-lived access JWT |
| **Auth** | `POST` | `/api/auth/logout` | Yes | Revoke active access and refresh token pair |
| **Auth 2FA** | `POST` | `/api/auth/2fa/setup` | Yes | Generate TOTP secret and QR code URI |
| **Auth 2FA** | `POST` | `/api/auth/2fa/verify` | Yes | Activate and enforce TOTP multi-factor authentication |
| **Auth 2FA** | `POST` | `/api/auth/2fa/disable` | Yes | Disable TOTP multi-factor authentication |
| **User** | `GET` | `/api/user/profile` | Yes | Retrieve authenticated user profile and workspaces |
| **User** | `PUT` | `/api/user/profile` | Yes | Update user display name and organization |
| **User** | `POST` | `/api/user/workspace-data` | Yes | Synchronize isolated workspace database to DataStore |
| **Admin** | `GET` | `/api/admin/users` | Yes (Owner/Admin) | List all registered tenant users across the platform |
| **Admin** | `PUT` | `/api/admin/user-role` | Yes (Owner) | Modify role for tenant user (Owner, Admin, Builder, Reviewer, Viewer) |
| **Admin** | `GET` | `/api/admin/connectors` | Yes | Retrieve cloud data lake and ingestion connectors |
| **Audit** | `GET` | `/api/audit/logs` | Yes | Retrieve cryptographically signed SOC-2 audit ledger entries |
| **Audit** | `POST` | `/api/audit/log` | Yes | Record tamper-evident audit event with SHA-256 block hash |
| **Data** | `GET` | `/api/data/intelligence/live` | No | Streaming analytical KPIs and data lake ingestion metrics |
| **Data** | `GET` | `/api/data/records` | No | Tabular dataset sample records with RBAC column masking |
| **Billing** | `GET` | `/api/billing/plans` | No | Subscription tiers catalog (Free, Pro Studio, Enterprise) |
| **Billing** | `GET` | `/api/billing/subscription` | Yes | Active user subscription limits, invoices, and SLA level |
| **Billing** | `POST` | `/api/billing/create-order` | No | Generate merchant UPI QR intent string and order record |
| **Billing** | `POST` | `/api/billing/verify-upi` | No | Verify bank UTR transaction receipt and provision Pro plan |
| **Billing** | `POST` | `/api/billing/webhook/bank-credit` | No (HMAC Secret) | Webhook callback for real-time bank credit confirmation |

---

## Key Request & Response Details

### 1. Observability: `GET /api/metrics`
```http
GET /api/metrics HTTP/1.1
Host: project-rainfall-60092395179.development.catalystserverless.in
```

**Response (`200 OK`)**:
```json
{
  "success": true,
  "code": 200,
  "metrics": {
    "uptimeSec": 4512,
    "memoryStoreSize": 14,
    "totalRequests": 1823,
    "errorCount": 0,
    "p50LatencyMs": 4.15,
    "p95LatencyMs": 17.82,
    "cacheHitRate": "95.42%",
    "cacheStats": {
      "hits": 187,
      "misses": 9,
      "hitRatePercent": 95.42,
      "memoryCacheEntries": 12,
      "ordersEntries": 2
    }
  }
}
```

### 2. Token Refresh: `POST /api/auth/refresh`
```http
POST /api/auth/refresh HTTP/1.1
Content-Type: application/json

{
  "refreshToken": "<current_refresh_token>"
}
```

**Response (`200 OK`)**:
```json
{
  "success": true,
  "token": "<new_jwt_access_token>",
  "refreshToken": "<new_rotated_refresh_token>",
  "expiresIn": 86400
}
```

### 3. Fail-Closed Error Envelope
When any request encounters a validation, authorization, or internal error, the response follows a uniform JSON structure:
```json
{
  "success": false,
  "error": "Descriptive message without leaking internal stack traces",
  "reqId": "5dfe9a72-dc8d-468e-ab1b-6a5e0493aa88"
}
```

---

## Environment Variables Specification

| Variable | Required | Description |
|---|---|---|
| `LUMETRIC_JWT_SECRET` | **Yes (P0 Fail-Closed)** | Minimum 32-byte secret key used to sign and verify JWT tokens |
| `BANK_WEBHOOK_SECRET` | **Yes (P0 Fail-Closed)** | Shared secret key for authenticating bank credit webhooks |
| `MERCHANT_UPI_VPA` | **Yes** | Official merchant UPI Virtual Payment Address (e.g. `billing@okaxis`) |
| `MERCHANT_PAYEE_NAME` | **Yes** | Legal payee company name for NPCI UPI intent strings |
| `SMTP_HOST` | **Yes** | Zoho Mail SMTP hostname (`smtp.zoho.in`) |
| `SMTP_PORT` | **Yes** | Zoho Mail SMTP port (`587`) |
| `SMTP_USER` | **Yes** | Authenticated Zoho email address (`admin@lumetric.in`) |
| `SMTP_PASS` | **Yes** | Zoho Mail App-Specific Password (never committed to git) |
