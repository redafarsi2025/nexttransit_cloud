# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

NextTransit is a mission-critical multi-tenant SaaS for fleet maintenance decision support, telematics
reconciliation (OBD-II/CAN/J1939) and maintenance budget control (transport, BTP, logistics, industry).
The product is the **Decision Engine (R1-R7)**, not GPS tracking — telemetry is just one of several input
channels (manual, declarative, telematics, hybrid).

**Read [AGENTS.md](./AGENTS.md) before touching anything security-, tenant-, or telemetry-related.** It is
the binding architectural contract (auth, RLS, provider-agnostic telemetry, R1-R7, audit, sovereignty) and
takes precedence over convenience. Highest-signal rules from it, condensed:

- **tenant_id is a security boundary.** Never trust it from the browser, a webhook, or a query param —
  derive it server-side from authenticated context. Every tenant-scoped query needs `.eq('tenant_id', ...)`
  or an equivalent DB-enforced constraint, even when using the Service Role key (which bypasses RLS but
  must never bypass authorization logic).
- **`SUPABASE_SERVICE_ROLE_KEY` is backend-only.** Never in React/Vite client code, `VITE_*` vars, logs, or
  API responses.
- **Provider-agnostic telemetry.** No business logic may branch on `provider === "flespi"` or similar.
  Provider-specific code stays under `src/services/telemetry/providers/`; everything else consumes
  `CanonicalTelemetryEvent`. Swapping Flespi ↔ Traccar ↔ local gateway must not require touching R1-R7.
- **R1-R7 are immutable without explicit sign-off** — see `src/services/decisionEngine.ts` and section 25
  of AGENTS.md.
- **AI is advisory, never authoritative.** Gemini calls cannot directly create work orders, change safety
  status, or touch permissions — they must flow through rule validation first, and AI failures must not
  disable deterministic R1-R7.
- **No mock data in production code paths.** Fixtures only in tests; demo data must be clearly isolated
  (see `demoSeedService.ts` / `src/api/demoSeeder.ts`).
- **TypeScript quality:** don't silence errors with `as any` / `@ts-ignore` — fix the underlying type.
- **No false completion.** "Migration file exists" ≠ applied. "Compiles" ≠ secure. "RLS policy exists" ≠
  tenant isolation verified. State the actual verification level, don't claim more than you checked.

Other docs worth knowing about (don't duplicate their content into memory, just know where they live):
[developer_guide.md](./developer_guide.md) (telematics onboarding, J1939 fault table, auth/provisioning
flow — has a "known issues" table at the top that goes stale fast, verify against current code before
relying on it) and [GUIDE_UTILISATION_ET_ROADMAP_SAAS.md](./GUIDE_UTILISATION_ET_ROADMAP_SAAS.md) (RBAC
roles, the 13 screens, roadmap).

## Commands

```bash
npm run dev          # API server (server.ts) via tsx, loads .env — this also serves the Vite frontend
npm run dev:worker    # Telemetry queue worker (worker.ts) — separate process, needed for telemetry E2E
npm run build          # vite build (frontend) + esbuild bundle of server.ts and worker.ts -> dist/*.cjs
npm start / start:worker   # Run the built dist/server.cjs / dist/worker.cjs (production mode)
npm run typecheck      # tsc --noEmit
npm run lint           # eslint . --ext .ts,.tsx
npm test               # vitest run (all tests)
npx vitest run path/to/file.test.ts        # single test file
npx vitest run -t "test name substring"    # single test by name
npm run smoke:docker   # full docker smoke suite (health, api, telemetry, idempotency, worker restart, redis recovery)
```

Local infra: `docker-compose.yml` starts Redis (required for BullMQ queue + rate limiting/replay
protection), plus optional Prometheus. The API and worker are two independent Node processes that both
call `registerTelematicsAdapters()` at startup — the provider registry is in-memory per-process, so a
missing registration in one of the two entrypoints causes "Unknown or unregistered provider" only in that
process.

Supabase is the database/auth backend. Migrations live in `supabase/migrations/`; `supabase/schema.sql` is
a generated snapshot, not a source of truth for what's applied — treat the actual database as authoritative
over any file (see AGENTS.md §4 source-of-truth hierarchy). Security/RLS SQL tests live in
`supabase/tests/`.

## Architecture

**Two backend processes sharing one codebase.** `server.ts` is the Express API (webhooks, REST routers
under `src/api/*`, Gemini calls, serves the Vite-built frontend). `worker.ts` is a separate BullMQ consumer
process (`src/services/telemetry/queue/TelemetryWorker.ts`) that does the actual telemetry processing.
Webhook handlers in `server.ts` validate + rate-limit + enqueue and return `202` immediately — they must
never do heavy AI/business work inline. The worker resolves tenant/vehicle from `device_mappings`,
normalizes via the adapter, checks idempotency, persists, and runs the rule engine.

**Telemetry pipeline (provider → decision):**
```
Provider webhook / manual entry
  → src/services/security/WebhookSecurityService.ts (auth, replay, rate limit — Redis-backed)
  → src/services/telemetry/queue/TelemetryQueue.ts (BullMQ enqueue, server.ts side)
  → TelemetryWorker.ts (worker.ts side, consumes queue)
  → src/services/telemetry/DeviceResolver.ts (device_mappings → tenant_id + vehicle_id, REJECT if unknown/inactive/cross-tenant)
  → src/services/telemetry/providers/{FlespiAdapter,TraccarAdapter,ManualEntryAdapter}.ts (raw payload → CanonicalTelemetryEvent)
  → src/services/telemetry/TelemetryNormalizer.ts
  → src/services/decisionEngine.ts (R1-R7)
  → work orders / alerts / vehicle status mutations
```
`TelematicsProviderRegistry.ts` + `registerAdapters.ts` wire adapters in; new providers implement
`TelematicsProviderAdapter.ts` and must not leak provider-specific shapes past that boundary.

**Frontend state layering** (`src/context/`): `AuthContext` (Supabase session/identity) wraps
`TenantContext` (resolves the active tenant) wraps `FleetContext` (the big reactive store — vehicles,
inventory, work orders, incidents, cost records, alerts, fuel logs, tires, PM schedules; see
`developer_guide.md` for the schema mapping). `FleetContext_old.tsx` is legacy, being phased out — check
before extending it further. `src/components/screens/` holds the ~13 top-level screens (fleet map,
strategic dashboard, work order queue, budget/variance dashboards, driver mobile view, mechanic queue,
platform admin, etc.), each generally tenant-scoped and RBAC-gated via `src/components/guards/`.

**API routers** (`src/api/*.ts`) are mounted individually in `server.ts` — vehicles, maintenance, work
orders, fuel, inventory, incidents, PM schedules/subscriptions, tenant users, vehicle assignments, platform
admin (separately authorized via `platformAuthCheck` / `platform_admins` table, not the regular RBAC role
field), demo seeding. `src/api/middleware.ts` holds shared request auth/validation.

**RBAC roles:** `SUPER_ADMIN` (platform operator, via `platform_admins` table, never assigned through
signup/invitation flows), `TENANT_ADMIN` (default role on tenant signup — full rights scoped to own
tenant), `DIRECTOR`, `FLEET_MANAGER`, `MAINTENANCE_MANAGER`, `FINANCE`, `OPERATIONS`, `MECHANIC`, `DRIVER`.
Enforcement is server-side / RLS; frontend role checks are UX-only.

**Decision Engine (R1-R7)** in `src/services/decisionEngine.ts`, tested in `decisionEngine.test.ts`:
R1 critical-fault emergency stop, R2 schedule-conflict detection, R3 inventory reservation on work order
lifecycle, R4 total repair cost formula, R5 CAE budget-priority scoring, R6 telemetry/driver-incident
reconciliation, R7 SCF budget variance analysis. These must stay provider-independent — see the "provider
replacement test" in AGENTS.md §45.

**Preventive maintenance** subsystem (`src/services/maintenance/`: `pmEngine`, `pmRuleResolver`,
`pmTriggerService`, `pmWorkOrderGenerator`, `pmSubscriptionService`) is a distinct pipeline from R1-R7 that
generates scheduled PM work orders; exposed via `src/api/pmSchedules.ts` and `pmSubscriptions.ts`.

**Path alias:** `@/*` maps to the repo root (see `tsconfig.json` / `vite.config.ts`), not `src/`.
