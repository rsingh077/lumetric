# React & Next.js High-Performance Rules (Adapted from ECC)

These rules govern client-side computational efficiency, memory hygiene, and rendering performance across Lumetric.

## 1. High-Throughput & Analytical Computations
- **Strict Memoization**: All analytical modeling, Monte Carlo runs, sensitivity tornados, and D3 SVG geometry generators MUST be wrapped in `useMemo` with explicit, primitive-checked dependencies.
- **Controlled Iterations**: Simulation loops (like Monte Carlo Box-Muller Gaussian generators) must run with bounded iteration caps (e.g., 1,000 runs) and execute within `< 250ms` on client threads.
- **Growth Bounds & S-Curves**: Never apply flat unconstrained exponential multipliers (`Math.pow(1 + rate, m)`). Always enforce geometric growth decay (`0.985^m` taper) and realistic OPEX reinvestment scaling to prevent numerical overflow.

## 2. Browser Memory Hygiene & Resource Cleanup
- **Timer & Listener Teardown**: Every `useEffect` that instantiates `setTimeout`, `setInterval`, WebSocket streams, or window event listeners (`resize`, `keydown`) MUST return a clean teardown function.
- **Large Dataset Disposal**: In-memory tabular datasets (500k rows) in DuckDB/Excel Automator must release column buffers when switching workspaces to prevent memory leakage in long-running tabs.

## 3. Rendering Integrity
- **Predictable Dynamic Classes**: Avoid runtime string concatenations of dynamic Tailwind classes that can fail build-time purge.
- **SVG ViewBox Responsiveness**: Charts and cartographic maps must use fluid vector coordinates with normalized aspect ratios (`viewBox="0 0 W H"`) rather than fixed pixel dimensions.
