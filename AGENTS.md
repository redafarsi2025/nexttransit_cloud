# AGENTS.md — NextTransit AI Development Contract
### v4.0

---

# 1. PROJECT IDENTITY & TELEMATICS PROVIDER AGNOSTIC PRINCIPLE

NextTransit is a multi-tenant SaaS platform for fleet operations, maintenance decision support, telemetry reconciliation, predictive maintenance and cost control.

The core business value is the decision engine:

Telemetry / Manual Input
        ↓
Detection
        ↓
Alert
        ↓
Work Order
        ↓
Parts / Labor
        ↓
Actual Cost
        ↓
Budget
        ↓
Management Arbitration
        ↓
SCF / Financial Traceability

**NON-NEGOTIABLE RULE: Telemetry Provider ≠ Business Logic.**
NEXTTRANSIT NE DOIT JAMAIS ÊTRE DÉPENDANT D'UN FOURNISSEUR TÉLÉMATIQUE PARTICULIER.

Flespi, Traccar, Teltonika, Wialon or any other provider must be considered as INTERCHANGEABLE TELEMETRY SOURCES.

The NextTransit business engine must operate:
1. without telematics,
2. with declarative telematics,
3. with Traccar,
4. with Flespi,
5. with Teltonika directly,
6. with Wialon,
7. with a future provider,
8. with an in-house IoT connector.

No R1-R7 business logic shall depend directly on a proprietary payload or API.

The mandatory pipeline must follow:
DEVICE
→ PROVIDER / GATEWAY
→ PROVIDER ADAPTER
→ CANONICAL TELEMETRY EVENT
→ TELEMETRY INGESTION
→ RULE ENGINE
→ DECISION ENGINE R1-R7
→ ALERT / WORK ORDER / INVENTORY / COST / BUDGET
→ UI

Business components must never directly import:
- Flespi SDK/API
- Traccar API
- Teltonika payload structures
- Wialon payload structures
- MQTT vendor-specific payloads
- TCP AVL frames
- GPS tracker proprietary formats

They must only consume `CanonicalTelemetryEvent`.

---

# 2. CURRENT DEVELOPMENT PRIORITY

The active engineering roadmap is:

PHASE 0: Architecture and schema audit
PHASE 1: Production SaaS / authentication / multi-tenancy / RBAC
PHASE SUPER_ADMIN: Platform administration
PHASE 2A: Telemetry backend foundation
PHASE 2B: Provider integrations
PHASE 2C: Predictive decision engine

Future phases may include advanced BI, offline-first PWA, EDI, RFID, SCF/CNAS exports, advanced integrations.

Do NOT interrupt the active roadmap to implement unrelated roadmap features unless explicitly requested.

---

# 3. NON-NEGOTIABLE ARCHITECTURE

NextTransit is:
- multi-tenant;
- backend-driven for privileged operations;
- vehicle-agnostic;
- telemetry-provider-agnostic;
- PostgreSQL/Supabase backed;
- TypeScript strict;
- React/Vite frontend;
- Express backend.

The database is the source of truth.
Never create fake persistence layers or mock databases in production execution paths.

---

# 4. PROVIDER ABSTRACTION

AGENTS.md defines a standard abstraction:
`TelematicsProviderAdapter`

Each provider must implement an interface equivalent to:
- `canHandle()`
- `validate()`
- `parse()`
- `normalize()`
- `healthCheck()`

Possible providers include:
- `ManualEntryProvider`
- `TraccarAdapter`
- `FlespiAdapter`
- `TeltonikaAdapter`
- `WialonAdapter`
- `FutureProviderAdapter`

It must be possible to swap Flespi → Traccar, or Traccar → Teltonika direct, without modifying:
R1-R7, Work Orders, Inventory, Warranty, Fuel, Cost Engine, Budget Engine, SCF, or business dashboards.
Only the adapter/provider should change.

---

# 5. TRACCAR

Traccar is considered a STRATEGIC OPTION.

Traccar is considered as:
OPEN-SOURCE TELEMATICS PLATFORM / DEVICE MANAGEMENT & INGESTION LAYER

NextTransit can use:
Teltonika GPS → Traccar → TraccarAdapter → CanonicalTelemetryEvent → NextTransit

Traccar must however NEVER become a business dependency.
It must be possible to remove Traccar and connect Flespi or a Teltonika TCP server without rewriting the NextTransit engine.

---

# 6. FLESPI

Flespi must remain supported as an OPTIONAL provider/middleware.

Architecture:
Teltonika → Flespi → FlespiAdapter → CanonicalTelemetryEvent → NextTransit
OR:
Teltonika → Traccar → TraccarAdapter → CanonicalTelemetryEvent → NextTransit
OR FUTURE:
Teltonika → NextTransit TCP Gateway → TeltonikaAdapter → CanonicalTelemetryEvent → NextTransit

No implementation must assume that Flespi is mandatory.

---

# 7. CANONICAL TELEMETRY EVENT

`CanonicalTelemetryEvent` becomes the central contract.
It must be provider-agnostic.

It must be able to represent notably:
tenantId, vehicleId, deviceId, provider, eventId, timestamp, latitude, longitude, speed, heading, odometer, engineHours, ignition, fuelLevel, engineTemperature, batteryVoltage, diagnosticCodes, harshEvents, inputs, outputs, rawMetadata, receivedAt.

Fields must remain generic.
NEVER add to the business model fields exclusively linked to Flespi, Traccar, Teltonika, or Wialon.
Proprietary data must remain in an adapter/raw metadata layer.

---

# 8. DEVICE REGISTRY & MULTI-TENANCY

The `device_mappings` registry is the source of truth for:
provider + external_device_id → vehicle → tenant

An incoming webhook must NEVER freely provide the tenantId as a trusted source.
The backend must resolve:
external device identity → device mapping → vehicle → tenant
before any business writing.

Unknown devices MUST be rejected.
Inactive mappings MUST be rejected.
Cross-tenant mappings MUST be impossible.

Every tenant-owned business record must have either an explicit `tenant_id` or a secure and unambiguous tenant relationship through trusted foreign keys.
Tenant resolution must happen server-side.

---

# 9. SECURITY & RLS POLICY

Mandatory rules:
- `service_role` ONLY backend side
- never in React
- never in Vite
- never in logs
- never in Git
- never in frontend payloads

Webhooks must use:
- secret/token/signature
- provider validation
- device validation
- tenant validation
- idempotency
- replay protection if possible
- rate limiting

No dev bypass, mock authentication, fake token, or hardcoded provider identity must be accepted in production.

RLS is mandatory for tenant-facing database access. Service Role does NOT remove authorization requirements.

---

# 10. IDEMPOTENCE

Any external telemetry must be treated as potentially duplicated.
Each event must have an idempotency strategy based on:
provider + external_device_id + external_event_id / timestamp / hash

The same event must not generate multiple positions, alerts, work orders, AI calls, or notifications.

---

# 11. REAL-TIME

Never use PostgreSQL Realtime to naively broadcast every high-frequency GPS point.

Preferred architecture:
Telemetry ingestion → latest vehicle state → live transport channel

Historical positions must be persisted according to an adapted strategy.
Real-time should favor SSE, WebSocket, Supabase Broadcast, or another appropriate real-time channel depending on the deployment context.
Consolidated business alerts and changes can use Supabase Realtime.

---

# 12. AI ARCHITECTURE

Predictive AI must NEVER depend on the frontend.
FORBIDDEN: React → Gemini → Work Order

Mandatory architecture:
Telemetry → Rule Engine → anomaly → predictive AI service → validated decision → Work Order / Alert

The frontend only presents the result.
Gemini/AI must be considered as an analysis engine and not as the source of business truth.
Critical decisions must be validated by NextTransit business rules.

Provide: cooldown, deduplication, confidence threshold, audit trail, explainability, failure fallback.
If Gemini is unavailable, NextTransit must continue to function with deterministic rules.

---

# 13. R1-R7

R1-R7 remain totally independent of the telematics provider.

Example:
Teltonika → Traccar → CanonicalTelemetryEvent
and
Teltonika → Flespi → CanonicalTelemetryEvent
must produce exactly the same business behavior if the canonical data is equivalent.

R1-R7 rules must never contain `if provider === "flespi"` or `if provider === "traccar"` or `if teltonika_payload...`

R1: Critical fault → Unsafe/Red → emergency maintenance → remove from dispatch.
R2: Vehicle departure within 3 days + open maintenance WO → operational conflict.
R3: WO creation → reserve parts. WO closure → consume stock. Low stock → purchase requisition.
R4: Total Work Order Cost = Labor Hours × Hourly Rate + SUM(Part Quantity × Part Unit Cost)
R5: Priority Score = Critical Severity Factor × 40% + Days Until Route × 30% + ROI / Cost Ratio × 30%
R6: Driver incident without matching electronic fault → investigation WO.
R7: Actual maintenance expenditure vs projected budget. Variance > 10% → accounting audit flag.

Do not silently alter these rules. If business rules need to change, explicitly identify the change.

---

# 14. TELEMATICS IS NOT A HARD DEPENDENCY

NextTransit must remain fully functional without IoT.

Supported modes:
MODE 1 — MANUAL: ManualEntryProvider
MODE 2 — DECLARATIVE: User input / inspections / incidents
MODE 3 — TELEMATICS: Traccar / Flespi / Teltonika / Wialon
MODE 4 — HYBRID: Manual + IoT

This allows deploying NextTransit at a client before hardware installation or integration.

---

# 15. FUTURE IoT VISION

AGENTS.md must integrate the following strategic vision:
NextTransit must not limit IoT to GPS.

The architecture must progressively allow:
GPS, OBD-II, CAN Bus, J1939, J1708, FMS, TPMS, temperature, pressure, fuel sensors, tachograph, camera/ADAS, driver behavior, door sensors, reefer sensors, asset sensors, workshop IoT, industrial equipment, construction equipment, generators, forklifts, trailers, containers.

The goal is to transform NextTransit into a:
FLEET + ASSET + INDUSTRIAL IoT DECISION PLATFORM
and not simply a GPS TRACKING SOFTWARE.

---

# 16. OTHER BUSINESS VERTICALS

The IoT layer must be generic.
It must eventually be able to feed:
Transport / Fleet, Construction / BTP, Logistics, Warehousing, Cold Chain, Industry, Mining, Agriculture, Energy, Municipal fleets, Equipment rental.

Example:
CAN Bus excavator → IoT Adapter → Canonical Event → Maintenance Rule Engine → Work Order

Same architecture for: truck, bus, excavator, generator, forklift, reefer, trailer.
The business engine must not depend on the hardware type.

---

# 17. SOVEREIGNTY / DEPLOYMENT

NextTransit must be designed to support multiple models:
A. Supabase Cloud
B. Self-hosted Supabase
C. Algeria / On-Premise
D. Sovereign/local cloud
E. Hybrid

No external SaaS dependency must be structurally mandatory.

The architecture must allow:
Frontend + Node/Express + PostgreSQL/Supabase + Telemetry Gateway + AI services in a local infrastructure.
Flespi can remain used in a hybrid architecture, but must not be mandatory if a client requires total sovereignty.

---

# 18. OFFLINE / RESILIENCE

The temporary loss of:
Internet, telematics provider, Gemini, Realtime, external cloud
must not render the business engine unusable.

Provide progressively:
queue, retry, dead-letter handling, local buffering, event replay, idempotent ingestion.

---

# 19. OBSERVABILITY

Each provider must be able to be diagnosed independently.

Provide:
provider health, device connectivity, last event, last successful ingestion, ingestion latency, parse errors, authentication failures, unknown devices, duplicate events, dropped events.

The system must allow answering: "Is the problem coming from the hardware, provider, adapter, ingestion, Supabase, or business engine?"

---

# 20. NO MOCK TELEMATICS & NO DEV BYPASSES

Permanently forbid in production:
Math.random(), simulated GPS, setInterval simulating a vehicle, fake telemetry, fake device IDs, fake GPS stream, fake AI alerts, fake work orders.

Tests must explicitly use:
fixtures, deterministic test payloads, simulators identified as such, test providers.
A simulator must never be confused with a production provider.

Never introduce mock authentication, hardcoded users, development JWT bypass unless explicitly isolated inside a test-only environment.

---

# 21. TESTABILITY

Each provider must be able to be tested with the same canonical fixtures.

Example:
Flespi payload → expected CanonicalTelemetryEvent
Traccar payload → expected CanonicalTelemetryEvent
Teltonika payload → expected CanonicalTelemetryEvent

Then verify:
CanonicalTelemetryEvent → R1-R7

Business tests must not depend on Flespi or Traccar.

---

# 22. NO VENDOR LOCK-IN

**NO VENDOR LOCK-IN**

No architectural decision must make mandatory:
Flespi, Traccar, Teltonika, Wialon, Supabase Cloud, Gemini.
Each is replaceable.

---

# 23. SUPER_ADMIN

The SUPER_ADMIN module must remain totally separated from the telematics pipeline.

It must manage:
tenants, users, subscriptions, platform audit, platform health, provider configuration, device registry, telemetry provider status.

Cross-tenant SUPER_ADMIN operations pass exclusively through the secure backend.
No service_role on the frontend side.

---

# 24. AUDIT

Trace critical operations:
device mapping creation/modification, device activation/deactivation, provider configuration, tenant suspension, AI decision, predictive work order, R1 override, manual telemetry correction.

Immutable audit.

---

# 25. WARRANTY

Warranty is a domain extension of R1.
Warranty-aware maintenance must consider: manufacturer, expiry date, mileage limit, covered systems, potentially warranty-invalidating actions.
Do not implement warranty logic inside telemetry adapters.

---

# 26. DATABASE MIGRATIONS & DATA INTEGRITY

Never solve migration problems by silently deleting data.
Before destructive migration: inspect, report, backup/archive where appropriate, obtain explicit approval.
Every schema change must be represented by a migration.
Migrations must be ordered, preserve existing data, maintain RLS, maintain tenant isolation.

---

# 27. DEVELOPMENT RULE

Before any code modification:
1. inspect real repo
2. inspect migrations
3. inspect Supabase types
4. inspect existing services
5. identify dependencies
6. do not invent tables or columns
7. do not assume a provider is available
8. do not create a mock to hide a missing feature

After modification:
npm test
npm run build
tsc --noEmit

Errors must be fixed at the source.
No `any`, `@ts-ignore`, or `@ts-expect-error` must be introduced to hide an architectural or typing error.

---

# 28. NO FALSE COMPLETION

A task must NEVER be declared "completed", "production-ready", "100% functional" or "secure" if:
tests fail, tsc fails, build fails, migration not applied, endpoint not tested, provider not tested, credentials missing, or functionality only simulated.

Final report must distinguish:
IMPLEMENTED, VERIFIED, NOT VERIFIED, BLOCKED, MOCK / SIMULATION.

---

# 29. PRIORITY

Architectural priority order:
1. Data integrity
2. Multi-tenancy
3. Security
4. Provider abstraction
5. Canonical telemetry
6. Deterministic rule engine
7. Work order / maintenance decision
8. AI augmentation
9. Real-time
10. UX / visual polish

Telematics is a data source.
The real NextTransit product remains the operational and financial decision engine.