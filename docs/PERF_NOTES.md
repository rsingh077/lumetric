# Lumatric UI Smoothness & Performance Audit (W0)

**Date**: November 2026  
**Auditor**: Godwin, Senior Software Architect & Engineering Agent  
**Scope**: Frontend Core (`lumetric/src/`), Layout Shell, Context Tree, Data Workspace, Executive Dashboards, and Mobile Hybrid Shell.  
**Target Quality Bar**: ≥ 9.5 / 10 (Production Grade)

---

## 1. Executive Summary

This smoothness audit evaluates frame stability, re-render amplification, layout shifts (CLS), parsing latency, and visual transition fidelity across Lumatric's Next.js 16 / React 19 application. 

While the core functionality (Catalyst DataStore persistence, multi-tenant isolation, SHA-256 integrity, Web Worker parsing) is solid, the application exhibits several subtle performance bottlenecks and perceived-jank vectors:
1. **Context-Wide Re-render Cascades**: The root `AppContext.Provider` supplies ~45 properties in an unmemoized object literal, triggering re-render chains across all consumer components whenever non-critical transient states update (e.g., server heartbeat latency checks, notification reads).
2. **Unstable Dependency References**: Key views (notably `dashboards/page.tsx` and `Header.tsx`) instantiate fallback objects and filtered arrays inline within render bodies (`activeDataset || { ... }`, `projects.filter(...)`), instantly busting downstream `useMemo` hooks.
3. **Cumulative Layout Shift (CLS)**: Dynamic chart cards, geographical map visualizations, and file intake dropzones lack fixed min-height constraints during asynchronous loading, resulting in content jumps.
4. **Hardcoded Visual Themes**: Multiple data sub-components use hardcoded Tailwind classes (`bg-white`, `border-slate-200`, `text-slate-900`) bypassing CSS custom property tokens, which produces flash-of-white surfaces in Dark Mode and compromises contrast ratios.
5. **Absence of Unified Skeleton Loaders**: Table views and dashboard cards previously displayed bare spinners or generic "Loading..." text rather than proportional skeleton frames.

---

## 2. Top Re-render Hotspots

### 2.1 `AppContext.tsx` — Unmemoized Provider Object
* **Location**: `lumetric/src/contexts/AppContext.tsx` (lines 1285–1358)
* **Problem**: 
  - `AppContext.Provider value={{ ... }}` allocates a new object reference on every state transition.
  - Periodic background operations—such as the server health latency ping (`reconnectServer`), active subscription checks, or notification dismissal—trigger render passes across `Header`, `Sidebar`, `AppShell`, `DataWorkspacePage`, and `DashboardPage`.
  - Callback functions (`switchWorkspace`, `createProject`, `updateUserProfile`, etc.) are declared inline without `useCallback`.
* **Impact**: Subscribed views re-render even when their specific domain state has not changed.
* **Remediation**:
  - Wrap provider value in `useMemo` with granular, structured dependencies.
  - Memoize high-frequency action callbacks using `useCallback`.
  - Decouple heartbeat ping re-renders from data workspace context.

### 2.2 `Header.tsx` — Unmemoized Project Filters & Cascading Search Index
* **Location**: `lumetric/src/components/layout/Header.tsx` (lines 91, 150–185)
* **Problem**:
  - `const workspaceProjects = projects.filter((p) => p.workspaceId === currentWorkspace.id);` runs unmemoized on every render.
  - `allSearchItems` declares `workspaceProjects` as a dependency. Because `workspaceProjects` receives a new array reference every pass, `allSearchItems` and `searchResults` recalculate continuously.
* **Impact**: Input latency during search dialog toggling (`⌘K`) and unnecessary GC pressure.
* **Remediation**:
  - Memoize `workspaceProjects` with `useMemo(() => projects.filter(...), [projects, currentWorkspace.id])`.
  - Stabilize `allSearchItems` dependency list.

### 2.3 `dashboards/page.tsx` — Fallback Object Allocation in Render Body
* **Location**: `lumetric/src/app/dashboards/page.tsx` (lines 78–112, 127–274)
* **Problem**:
  - When no active dataset is loaded, `const currentDataset: DatasetProfile = activeDataset || { ... };` and `const rawRows = activeRows || [];` create new references on every render.
  - These variables serve as dependencies for 7 major `useMemo` hooks (e.g., `numericColumns`, `dimensionColumns`, `metricMoments`, `frequencyHistogram`, `distributionMatrix`).
  - ESLint reports 14 `react-hooks/exhaustive-deps` warnings specifically due to this anti-pattern.
* **Impact**: Recalculation of complex statistical distributions on every tick, introducing 30–70ms CPU spikes.
* **Remediation**:
  - Hoist `EMPTY_DATASET` and `EMPTY_ROWS` constants outside the component scope.
  - Wrap `currentDataset` and `rawRows` in their own `useMemo` hooks.

### 2.4 `data/page.tsx` & `DataInspectSection.tsx` — Unvirtualized Tabular Rows
* **Location**: `lumetric/src/components/data/DataInspectSection.tsx` (lines 23–38)
* **Problem**:
  - Hardcoded pagination at 50 rows without dynamic page-size selection (25 / 50 / 100).
  - Lack of sorting and filtering state preservation across pagination changes.
* **Remediation**:
  - Implement full-featured pagination controls: customizable page size, item range indicators, jump-to-page, and stable column sort.

---

## 3. Layout Shift (CLS) Analysis

| Component | Trigger | Root Cause | Target Fix |
| :--- | :--- | :--- | :--- |
| `dashboards/page.tsx` | Chart hydration | Container height expands from 0px to chart SVG height (280px–360px) | Enforce explicit `min-h-[280px]` and `min-h-[360px]` on chart card wrappers |
| `LandingGeoMapDemo.tsx` | GeoJSON map render | Map SVG container jumps on dynamic path calculation | Wrap in fixed aspect-ratio container (`aspect-[16/9]` or `min-h-[340px]`) with skeleton placeholder |
| `DataIntakeSection.tsx` | Drag-and-drop hover | Border dashed changes and dropzone expands abruptly | Use stable min-height (`min-h-[220px]`) and `transition-all duration-200` |
| `Header.tsx` Notifications | Notification modal open | Dropdown pops without enter animation | Add subtle `animate-fade-in` with `scale-[0.98]` origin-top |

---

## 4. Perceived Latency & File Parsing Flow

1. **Worker Offloading**:
   - `workerProfiler.ts` successfully offloads CSV, JSON, and Excel parsing to a dedicated Web Worker (`dataProfiler.worker.js`).
   - A 2000ms safety timeout fallback ensures UI never hangs if worker thread is constrained.
2. **Visual Feedback Gap**:
   - During worker execution (typically 80–250ms for 1,000–50,000 cells), the UI displays a simple spinner button.
   - Replacing this with an animated skeleton progress state significantly improves perceived fluidity.

---

## 5. Theme Token & Accessibility AA Audit

1. **CSS Variables vs Hardcoded Tailwind**:
   - High-contrast CSS tokens are declared in `globals.css`:
     - `--lm-bg-primary`, `--lm-bg-secondary`, `--lm-bg-elevated`
     - `--lm-border-default`, `--lm-border-subtle`
     - `--lm-text-primary`, `--lm-text-secondary`, `--lm-text-tertiary`
   - Hardcoded `bg-white`, `border-slate-200`, and `text-slate-900` remain in `DataInspectSection.tsx`, `DataIntakeSection.tsx`, and `DataWizardSection.tsx`.
   - In dark mode, these components create visual glare and fail WCAG AA contrast criteria.
2. **System Preference Initialization**:
   - `AppContext` checks `localStorage` for `lumetric_theme` but does not fall back to `window.matchMedia('(prefers-color-scheme: dark)')` when first loaded.
   - Initializing from system preference improves first-time user experience.

---

## 6. Prioritized Action Plan

| ID | Workstream | Specific Task | Target Impact |
| :--- | :--- | :--- | :--- |
| **W1** | Documentation & Visibility | Write `CONTRIBUTING.md`, `CHANGELOG.md`, update `README.md` with status badges | Complete developer onboarding & release transparency |
| **W2** | Dark Mode & i18n | Refactor hardcoded CSS to `--lm-*` tokens; add `en`/`es`/`fr`/`de` locale dictionaries & switcher; support `prefers-color-scheme` | WCAG AA contrast compliance & internationalization |
| **W3** | Interaction & Motion Polish | Memoize `AppContext`, `Header`, and `DashboardPage`; create `SkeletonTable`, `SkeletonCard`, `SkeletonChart`; enforce min-heights; add `prefers-reduced-motion` | 0ms CLS, silky 60fps transitions, zero re-render cascade |
| **W4** | Data Pagination | Dynamic page size (25/50/100), sort preservation, and range display for tabular inspector & audit ledger | Smooth handling of large datasets up to 100,000 rows |
| **W5** | Lint & Quality Cleanup | Eliminate all 264 ESLint warnings (replace `any`, prefix unused vars with `_`, fix hooks) | Strict **0 errors, 0 warnings** gate |
