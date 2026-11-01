# Contributing to Lumetric

Welcome to the **Lumetric** engineering repository. This document provides setup guidelines, architectural standards, quality gates, and workflow conventions for contributing to the Lumetric platform.

---

## 1. Development Environment Setup

### Prerequisites
- **Node.js**: v18.x or v20.x
- **npm**: v9.x or higher
- **PowerShell** / Bash terminal
- **Zoho Catalyst CLI**: `npm install -g zcatalyst-cli` (for cloud serverless deployments)
- **Capacitor CLI**: `@capacitor/cli` (for mobile builds)

### Repository Structure
```
Lumatric/
├── lumetric/                  # Next.js 16 (App Router), React 19, Tailwind v4
│   ├── src/app/              # Application pages & static routes
│   ├── src/components/       # Modular UI components & design system
│   ├── src/contexts/         # Global AppContext (auth, workspace, theme, i18n)
│   ├── src/lib/              # Client services, validation, profiling, offline sync
│   └── src/__tests__/        # Jest & React Testing Library frontend tests
├── functions/lumetric_server/ # Express 4 serverless function (Zoho Catalyst)
│   ├── services/             # Core business logic (auth, datastore, billing, mail)
│   ├── routes/               # Modular Express domain route handlers
│   ├── middleware/           # Helmet, rateLimiter, observability, auth
│   └── __tests__/            # Jest & Supertest backend integration test suites
├── docs/                     # OpenAPI 3.0 spec, API docs, ADRs
└── .github/workflows/        # GitHub Actions CI/CD pipelines
```

### Installation
```bash
# Install frontend dependencies
npm --prefix lumetric install

# Install backend dependencies
npm --prefix functions/lumetric_server install
```

---

## 2. Quality Gates & Local Verification

Before opening a pull request or pushing to `main`, all five quality gates must pass locally:

| Gate | Command | Passing Bar |
|---|---|---|
| **1. Frontend Lint** | `npm --prefix lumetric run lint` | 0 errors |
| **2. Typecheck** | `node lumetric/node_modules/typescript/bin/tsc --project lumetric/tsconfig.json --noEmit` | 0 errors |
| **3. Backend Tests** | `npm --prefix functions/lumetric_server test` | 100% pass, ≥70% coverage |
| **4. Frontend Tests** | `npm --prefix lumetric test` | 100% pass |
| **5. Production Build** | `npm --prefix lumetric run build` | 17/17 static pages exported |

---

## 3. Branching Strategy & Git Workflow

- **Trunk Branch**: `main` — protected, production-ready at all times.
- **Feature Branches**: `feat/<feature-name>` or `fix/<bug-description>`.
- **Pull Requests**:
  - Every PR triggers the GitHub Actions CI pipeline (`.github/workflows/ci.yml`).
  - PRs are blocked from merging if any gate (lint, typecheck, tests, build) fails.
- **Commit Conventions**:
  Follow Conventional Commits:
  - `feat(scope): add new capability`
  - `fix(scope): resolve issue`
  - `test(scope): add or update unit tests`
  - `docs(scope): update documentation or ADRs`
  - `refactor(scope): code modularization without behavior change`

---

## 4. Architectural Rules

1. **Secrets Hygiene**:
   - Never commit API keys, passwords, or tokens to the repository.
   - All server credentials must be read from environment variables or Zoho Catalyst App config.
   - Fallback secrets in code are strictly forbidden (fail-closed).
2. **File Size Budget**:
   - Component and page files must be kept **strictly under 30KB**.
   - Split large monoliths into domain components under `components/{domain}/`.
3. **Data Integrity**:
   - Zoho Catalyst DataStore is the authoritative persistence layer.
   - In-memory data structures act solely as transient read-caches with TTL expiration.
4. **Accessibility (a11y)**:
   - All modal dialogs must specify `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.
   - Contrast ratios must satisfy WCAG AA (≥4.5:1 for standard body text).
