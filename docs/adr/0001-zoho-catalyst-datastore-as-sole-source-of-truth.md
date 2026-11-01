# ADR 0001: Zoho Catalyst DataStore as Sole Source of Truth

**Status**: Accepted  
**Date**: 2026-11-01  
**Deciders**: Godwin (Senior Software Architect), Core Engineering Team  

---

## Context

Lumetric initially relied on an in-memory `memoryStore` object within the serverless Express function to hold user profiles, workspace state, and billing records. Because serverless containers recycle and scale horizontally, relying on in-memory state caused data loss across function cold starts and multi-instance concurrency bugs.

## Decision

We have established **Zoho Catalyst DataStore** (Project "Project-Rainfall", table `Lumi`) as the sole authoritative source of truth for:
1. Registered user accounts and credential hashes (`passwordHash`, `email`, `role`, `mfaSecret`).
2. Workspace configurations, projects, ingested dataset schemas, and document dossiers.
3. Billing subscriptions, invoice records, and verified transaction receipts.

The in-memory storage (`memoryCache`) is demoted to a short-lived (60-second TTL) LRU read-cache.
- All writes (`saveUserToStore`, billing updates) write synchronously to Catalyst DataStore first before updating the cache.
- Read operations query Catalyst DataStore whenever the cache has expired or on `forceFresh=true`.
- Automated cache hit and miss counters are instrumented and exposed via `/api/metrics`.

## Consequences

- **Positive**: Data persists reliably across container recycles, cold starts, and deployments. Multi-instance scaling is safe.
- **Positive**: Observable cache hit rates (~95%) maintain low-latency response times without overloading database quotas.
- **Trade-off**: Requires valid Catalyst SDK credentials in local development; mock/offline fallbacks are provided when running tests without cloud credentials.
