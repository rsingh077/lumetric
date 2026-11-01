# Changelog

All notable changes to the **Lumetric** project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.3.4] - 2026-11-01

### Added
- **Fail-Closed Secrets Hygiene (Workstream A)**:
  - Eliminated fallback secrets across `auth.service.js`, `billing.routes.js`, and `mail.service.js`.
  - Enforced fail-closed environment variable validation: missing `LUMETRIC_JWT_SECRET` or `BANK_WEBHOOK_SECRET` throws immediately at boot.
  - Added comprehensive `.env.example` template with explicit placeholders for all required environment variables.
- **Backend Jest & Supertest Test Runner (Workstream C1)**:
  - Configured Jest in `functions/lumetric_server/` with automated coverage collection.
  - Implemented 4 test suites: `security_p0.test.js`, `services_p1.test.js`, `validation.test.js`, and `coverage_boost.test.js`.
  - Achieved **78.68% Statement Coverage** and **79.05% Line Coverage**, surpassing the 70% quality gate.
- **Frontend Jest & React Testing Library Suite (Workstream C2)**:
  - Configured Next.js Jest test environment in `lumetric/`.
  - Implemented unit tests for CSV parsing, dataset profiling, email & password validation parity, and authentication screen flows.
  - Verified 18/18 tests passing across 4 test suites.
- **GitHub Actions CI/CD Pipeline (Workstream C3)**:
  - Created `.github/workflows/ci.yml` triggering on push and PR to `main`.
  - Configured automated gates for Lint, TypeScript strict check, backend unit tests, frontend unit tests, and Next.js static build export.
- **Structured Observability & Metrics (Workstream D)**:
  - Added `requestTracingMiddleware` with automatic UUID `req.id` generation, `X-Request-Id` response header propagation, and structured JSON logs.
  - Added `/api/metrics` endpoint exposing runtime uptime, rolling p50/p95 latency metrics, total request count, error count, and DataStore vs cache hit rate.
  - Added centralized error handler middleware returning uniform `{ success: false, error, reqId }` envelopes without leaking internal stack traces.
- **Frontend UX, Theme & Localization (Workstream E)**:
  - Implemented dark-mode / light-mode toggle persisted in `localStorage` with `data-theme` and `dark` class support meeting WCAG AA contrast standards.
  - Wired bilingual `en` and `fr` localization toggle into the studio header using `AppContext`.
  - Modularized `src/app/page.tsx` from 56KB down to 13KB by extracting `HomeFileDropzone.tsx`, `HomeMetricsStrip.tsx`, `HomeDatasetDocumentCards.tsx`, and `HomeChartsAudit.tsx`.
  - Completed accessibility audit: added `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` attributes across all modal dialogs.
- **Documentation & Architecture Decision Records (Workstream F)**:
  - Verified and updated OpenAPI 3.0.3 specification (`docs/openapi.yaml`).
  - Rendered comprehensive Markdown API documentation (`docs/api.md`).
  - Added `CONTRIBUTING.md`, `CHANGELOG.md`, and refreshed `README.md` with CI status badges and architectural disclosures.
  - Published Architecture Decision Records (ADRs) 0001, 0002, and 0003 in `docs/adr/`.

### Changed
- Refactored `catalyst-config.json` postbuild logic to maintain distinct `homepage: index.html` and `404: 404.html` files.
- Upgraded ESLint configuration in `lumetric/eslint.config.mjs` to eliminate 170 React 19 / Next.js 16 compiler errors.
- Improved DataStore read-caching in `datastore.service.js` with automated cache hit/miss instrumentation.

### Fixed
- Fixed 404 client deployment conflict on Zoho Catalyst web client.
- Fixed temporal dead zone (TDZ) reference in `AuthScreen.tsx`.
- Fixed cascading render effects in `settings/page.tsx` and `SQLStudioView.tsx`.
