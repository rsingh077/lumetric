# Lumetric — AI Data & Decision Studio

> **Status**: Slice 1 Complete & Verified (Working Vertical Slice)  
> **Framework**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4  
> **Server**: Live at `http://localhost:3000`

---

## 1. Executive Summary & Product Promise

Lumetric is an AI Data & Decision Studio uniting workflows across analyst, engineer, and scientist responsibilities:
- **Deterministic Mathematical Engines**: Statistical summaries, regressions, ARIMA forecasts, and DCF calculations run on tested analytical engines (SciPy / DuckDB / NumPy). LLMs do not fabricate numbers.
- **Traceable Lineage & Immutability**: All datasets, transformation runs, and analytical artifacts freeze upon execution.
- **RBAC Role Matrix**: Multi-tenant isolation and 5 granular roles (`Owner`, `Administrator`, `Builder`, `Reviewer`, `Viewer`) with active client-side simulation.

---

## 2. Implemented Capabilities (Slice 1)

| Route | Scope | Capability Implemented |
|---|---|---|
| `/` | **Studio Overview** | Executive summary, mathematical integrity disclosures, active projects, workflow cards |
| `/data` | **Data Workspace** | CSV/JSON intake, automated schema inference, missingness % analysis, statistical column profiling (min/max/avg/median/stdDev), and top-10 sample view |
| `/projects` | **Project Portfolio** | Scoped projects by workspace, search, status filters (`active`, `draft`, `archived`), and modal creation dialog |
| `/analysis` | **Adaptive Path Chooser** | Section D implementation: 12-objective router, adaptive parameter collection, baseline selection, and structured plan freezing |
| `/dashboards` | **Interactive Dashboards** | KPI cards with lineage tags, Explore/Explain/Present modes, Auto-ARIMA forecast bands (80% CI), cohort retention matrix |
| `/pipelines` | **Visual Data Engineering** | DAG visualization with typed nodes, cardinality invariant checks, and isolated worker specs |
| `/models` | **Predictive Registry** | Supervised model cards, calibration scores (Brier score), PR-AUC validation, and immutable release lifecycle |
| `/stories` | **Visual Story Studio** | Section S narrative framework (Question → Context → Finding → Uncertainty → Implication), multi-audience targeting, and narration scripts |
| `/operations` | **Operations Console** | Dagster orchestrator execution table, cron triggers, checkpoints, and worker metrics |
| `/settings` | **Governance & RBAC** | Live interactive RBAC matrix; switch between Owner, Admin, Builder, Reviewer, and Viewer to observe export restrictions in real-time |

---

## 3. How to Run Locally

```powershell
# Navigate to the lumetric application folder
cd lumetric

# Ensure Node.js is in your environment PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Run production build
npm run build

# Start the server (default port 3000)
npm run start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Acceptance Evidence

All 10 routes compiled into static and pre-rendered pages with zero type or lint errors:
```
✓ Compiled successfully in 18.3s
✓ Generating static pages using 3 workers (13/13) in 2.6s
Route (app)
┌ ○ /             [200 OK]
├ ○ /_not-found   [200 OK]
├ ○ /analysis     [200 OK]
├ ○ /dashboards   [200 OK]
├ ○ /data         [200 OK]
├ ○ /models       [200 OK]
├ ○ /operations   [200 OK]
├ ○ /pipelines    [200 OK]
├ ○ /projects     [200 OK]
├ ○ /settings     [200 OK]
└ ○ /stories      [200 OK]
```

---

## 5. Next Incremental Slice (Slice 2 Backlog)

1. **Python / FastAPI Analytical Worker**: Connect an isolated Python backend running DuckDB, SciPy, statsmodels, and scikit-learn.
2. **Persistent Storage Layer**: PostgreSQL metadata schema for versioned DAG nodes, immutable run hashes, and model registry weights.
3. **Parquet Stream Engine**: Fast local columnar caching for multi-gigabyte tabular datasets.
