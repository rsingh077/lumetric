# ADR 0003: Dual-Target Deployment: Antigravity Web & Capacitor Mobile

**Status**: Accepted  
**Date**: 2026-11-01  
**Deciders**: Godwin (Senior Software Architect), Core Engineering Team  

---

## Context

Lumetric is distributed both as a high-performance cloud web application (hosted on Antigravity / Zoho Catalyst Web Hosting) and as a standalone mobile application (compiled via Capacitor 8 for Android and iOS).

Next.js App Router static exports (`output: 'export'`) generate static HTML files. However:
1. **Zoho Catalyst Web Hosting** serves static files rooted under an `/app/` prefix and requires strict page naming with separate `homepage: index.html` and `404: 404.html` configurations.
2. **Capacitor Mobile WebViews** require local filesystem asset resolution (`capacitor://localhost` or `http://localhost`) with clean relative asset references and no reliance on server-side Next.js Node middleware.

## Decision

We enforce a **Dual-Target Postbuild Pipeline** (`scripts/postbuild.js`):
1. **Asset Mirroring**: The build step exports static HTML to `lumetric/out/`. The postbuild script mirrors assets to `out/app/` to ensure Catalyst web clients resolve static chunks seamlessly.
2. **Distinct Homepage and 404 Pages**: The postbuild script produces both `index.html` and a distinct `404.html` to fulfill Catalyst web client validation constraints.
3. **Capacitor Compatibility**:
   - Inlined asset references are patched to support relative root resolution in mobile WebViews.
   - History navigation automatically distinguishes between Catalyst web routing (`/app/{route}.html`) and Capacitor native routing (`/{route}`).
   - Viewport constraints are pinned to 16px minimum font size for form controls to prevent involuntary zoom on mobile touchscreens.

## Consequences

- **Positive**: A single unified Next.js 16 / React 19 codebase powers both web and native mobile platforms with zero code divergence.
- **Positive**: Eliminates 404 routing anomalies on both platforms.
- **Trade-off**: Requires running `node scripts/postbuild.js` after every `next build` command (automated via `npm run build`).
