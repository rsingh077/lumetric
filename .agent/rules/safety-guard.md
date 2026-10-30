# Safety Guard & Pre-Flight Quality Standards (Adapted from ECC)

These guidelines prevent regressions, safeguard production builds, and guarantee zero-error deployments across Lumetric.

## 1. Safety Guard Modes
- **Careful Mode**: Before modifying existing production features (e.g. Auth pipelines, Geographic Projections, Financial Engines), inspect existing test coverage and verify API contracts.
- **Freeze Mode**: Never drop database tables, delete user storage, or bypass verification scripts (`audit_live.js`) during automated tasks.
- **Pre-Flight Verification**: Every code modification must satisfy three mandatory gates before pushing to production:
  1. **Compiler Gate**: `npx tsc --noEmit` must pass with 0 TypeScript errors.
  2. **Build Gate**: `npm run build` must compile static pages and execute `postbuild.js` without asset path broken links.
  3. **Cloud Gate**: `node lumetric/scripts/audit_live.js` must verify all 32 production endpoints return HTTP 200 OK.

## 2. Platform Parity
- **Web & Mobile Sync**: Any update to web assets in `lumetric/out/` must be synchronized to mobile shells via `npx cap sync` so Android and iOS APK distributions stay 100% in sync with the web portal.
- **Catalyst Path Reconciliation**: Dynamic Next.js chunks must maintain dual-path resolution for both native root `/` and Zoho Catalyst hosted prefix `/app/_next/`.
