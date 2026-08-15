# AGENTS.md — NextTransit Engineering Rules
## v3.0 — Production SaaS + Vehicle-Agnostic Telematics

---

# 1. PROJECT IDENTITY

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

Telemetry is an input source.

Telemetry MUST NEVER become a hard dependency of the business engine.

The platform must continue to operate when:

- no GPS device is connected;
- no telemetry provider is configured;
- telemetry is temporarily unavailable;
- a customer uses manual declarations.

---

# 2. CURRENT DEVELOPMENT PRIORITY

The active engineering roadmap is:

PHASE 0
Architecture and schema audit

PHASE 1
Production SaaS / authentication / multi-tenancy / RBAC

PHASE SUPER_ADMIN
Platform administration

PHASE 2A
Telemetry backend foundation

PHASE 2B
Provider integrations

PHASE 2C
Predictive decision engine

Future phases may include:

- advanced BI
- offline-first PWA
- EDI
- RFID
- SCF/CNAS exports
- advanced integrations

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

Never create fake persistence layers.

Never create JSON files pretending to be a database.

Never introduce mock data into production execution paths.

---

# 4. MULTI-TENANCY

Tenant isolation is mandatory.

Every tenant-owned business record must have either:

1. an explicit tenant_id;

OR

2. a secure and unambiguous tenant relationship through trusted foreign keys.

Example:

device_mapping
    ↓
vehicle
    ↓
tenant

The system MUST NEVER trust tenant_id coming directly from an untrusted telemetry payload.

Tenant resolution must happen server-side.

Typical trusted chain:

provider
    ↓
external device
    ↓
device_mapping
    ↓
vehicle
    ↓
tenant

---

# 5. RLS POLICY

RLS is mandatory for tenant-facing database access.

Frontend Supabase access MUST remain RLS-protected.

However, privileged backend operations MAY use:

SUPABASE_SERVICE_ROLE_KEY

under the following conditions:

- backend only;
- never imported by React;
- never included in Vite bundles;
- never exposed to browser;
- never stored in localStorage/sessionStorage;
- never logged;
- only used by explicitly authorized server-side services.

Service Role does NOT remove authorization requirements.

Before executing privileged queries, backend code must verify:

- authenticated user;
- required role;
- platform authorization;
- tenant authorization where applicable.

---

# 6. SUPER_ADMIN ARCHITECTURE

SUPER_ADMIN operations use:

Browser
 ↓ JWT
Express API
 ↓
platform authorization
 ↓
platform_admins
 ↓
supabaseAdmin
 ↓
PostgreSQL

Never expose Service Role to the frontend.

Never implement development bypasses.

Never accept:

x-dev-bypass
mock admin tokens
hardcoded admin emails

in production code.

---

# 7. TELEMETRY ARCHITECTURE

Telemetry is provider-agnostic.

The business engine MUST NOT consume:

Teltonika payloads
Flespi payloads
Wialon payloads
vendor-specific CAN payloads

directly.

All providers must normalize into:

CanonicalTelemetryEvent

Architecture:

Provider
 ↓
Adapter
 ↓
parse
 ↓
validate
 ↓
normalize
 ↓
CanonicalTelemetryEvent
 ↓
TelemetryIngestionService
 ↓
Rule Engine
 ↓
Persistence / Decision Engine

---

# 8. TELEMETRY PROVIDER ADAPTER

The canonical provider interface is:

TelemetryProviderAdapter

It must support:

canHandle()
parse()
validate()
normalize()

Provider-specific implementations may include:

TeltonikaAdapter
FlespiAdapter
WialonAdapter
ManualEntryAdapter

Do NOT put provider-specific logic inside:

- Rule Engine
- Work Order logic
- FleetContext
- React components
- business domain services

---

# 9. CANONICAL TELEMETRY EVENT

The internal telemetry contract must be provider-independent.

Conceptually:

CanonicalTelemetryEvent {

  eventId
  tenantId
  vehicleId
  deviceId
  provider
  timestamp

  position {
    latitude
    longitude
    altitude
    speed
    heading
  }

  engine {
    rpm
    coolantTemperature
    oilTemperature
    oilPressure
    fuelLevel
    batteryVoltage
  }

  diagnostics {
    dtcCodes
  }

  rawMetadata
}

Do not add vendor-specific fields to the canonical contract.

Vendor-specific information belongs in:

rawMetadata

or provider-specific structures.

---

# 10. DEVICE REGISTRY

Device resolution is a trust boundary.

A telemetry event must resolve:

device
 ↓
device_mapping
 ↓
vehicle
 ↓
tenant

Unknown devices MUST be rejected.

Inactive devices MUST be rejected.

Cross-tenant mappings MUST be rejected.

The system must never trust vehicle_id or tenant_id supplied by an external device.

---

# 11. TELEMETRY IDEMPOTENCE

Webhook ingestion MUST be idempotent.

Repeated delivery of the same event must NOT create:

- duplicate positions;
- duplicate alerts;
- duplicate AI analyses;
- duplicate work orders.

Preferred identity:

provider
device
external event/message ID

If no reliable event ID exists:

use a deterministic event fingerprint.

---

# 12. POSITION DATA

Separate:

1. historical positions;
2. latest vehicle telemetry state;
3. realtime delivery.

Historical telemetry may be stored in:

positions

Latest state may be stored on:

vehicles

Realtime delivery must NOT depend on querying the entire positions history.

Do NOT automatically enable:

REPLICA IDENTITY FULL

Do NOT automatically enable:

postgres_changes

for high-frequency GPS position streams.

---

# 13. REALTIME

The frontend is a consumer of NextTransit realtime events.

Architecture:

Telemetry ingestion
 ↓
Database/state update
 ↓
Realtime publication
 ↓
React

The browser MUST NOT directly depend on:

Teltonika TCP
Flespi protocol
Wialon IPS
CAN bus frames

For high-frequency telemetry, prefer:

Broadcast
WebSocket
SSE

over high-frequency postgres_changes.

Business events such as:

- fleet alerts;
- work orders;
- vehicle state changes

may use Supabase Realtime where appropriate.

---

# 14. TELEMETRY RULE ENGINE

TelemetryRuleEngine is deterministic.

It consumes:

CanonicalTelemetryEvent

It produces:

TelemetryAnomalyEvent

The Rule Engine must NOT directly call Gemini.

Examples:

- critical coolant temperature;
- abnormal oil pressure;
- abnormal battery voltage;
- critical DTC;
- persistent thermal anomaly.

---

# 15. PREDICTIVE AI

AI execution belongs to the backend.

React MUST NOT be the primary trigger for predictive AI.

Correct flow:

Telemetry
 ↓
Rule Engine
 ↓
Anomaly
 ↓
AI Decision Service
 ↓
PredictiveAiResult
 ↓
Business Decision
 ↓
Alert / Work Order

Gemini must not directly create Work Orders.

---

# 16. AI COOLDOWN

Never call Gemini for every telemetry packet.

AI execution requires:

- anomaly fingerprint;
- vehicle identity;
- cooldown;
- deduplication.

The cooldown must be configurable.

Repeated anomalies during the cooldown must not create duplicate AI analyses.

---

# 17. WORK ORDER GENERATION

AI proposes a decision.

Business logic validates it.

Correct flow:

AI
 ↓
PredictiveAiResult
 ↓
Decision Service
 ↓
Existing Work Order check
 ↓
Create Work Order if required

Never allow AI to bypass business rules.

Never create duplicate preventive Work Orders for the same active anomaly.

---

# 18. R1-R7 BUSINESS RULES

The existing R1-R7 decision engine remains authoritative.

R1:
Critical fault → Unsafe/Red → emergency maintenance → remove from dispatch.

R2:
Vehicle departure within 3 days + open maintenance WO → operational conflict.

R3:
WO creation → reserve parts.
WO closure → consume stock.
Low stock → purchase requisition.

R4:
Total Work Order Cost =
Labor Hours × Hourly Rate
+
SUM(Part Quantity × Part Unit Cost)

R5:
Priority Score =
Critical Severity Factor × 40%
+
Days Until Route × 30%
+
ROI / Cost Ratio × 30%

R6:
Driver incident without matching electronic fault → investigation WO.

R7:
Actual maintenance expenditure vs projected budget.
Variance > 10% → accounting audit flag.

Do not silently alter these rules.

If business rules need to change, explicitly identify the change.

---

# 19. WARRANTY

Warranty is a domain extension of R1.

Warranty-aware maintenance must consider:

- manufacturer;
- expiry date;
- mileage limit;
- covered systems;
- potentially warranty-invalidating actions.

Do not implement warranty logic inside telemetry adapters.

---

# 20. AUDIT TRAIL

Tenant-owned business mutations must be auditable.

Examples:

- vehicle mutation;
- work order mutation;
- R1-R7 override;
- budget approval;
- administrative action.

Audit records must include:

actor
tenant_id
action
before
after
timestamp

Audit records must not be deletable from normal UI.

---

# 21. RBAC

Canonical roles:

SUPER_ADMIN
DIRECTOR
FLEET_MANAGER
MAINTENANCE_MANAGER
FINANCE
OPERATIONS
MECHANIC
DRIVER

Database/RLS is authoritative if this document conflicts with the database.

Never invent additional roles without explicit approval.

---

# 22. FRONTEND

Frontend:

React + Vite + TypeScript.

Frontend responsibilities:

- presentation;
- user interaction;
- realtime consumption;
- user-scoped API requests.

Frontend MUST NOT contain:

- Service Role credentials;
- provider TCP parsing;
- provider-specific business logic;
- authoritative tenant resolution;
- authoritative predictive AI orchestration.

---

# 23. TELEMETRY UI

TelemetryStream and FleetContext must consume normalized application events.

They must NOT generate fake GPS data in production.

Forbidden production simulation:

Math.random()
setInterval() for fake GPS
fake coordinates
fake telemetry packets

Development test generators are allowed only if explicitly isolated from production execution.

---

# 24. DATA INTEGRITY

Never solve migration problems by silently deleting data.

Before destructive migration:

- inspect;
- report;
- backup/archive where appropriate;
- obtain explicit approval.

Never use:

DELETE

as a hidden migration repair mechanism.

Never use:

DROP TABLE
DROP COLUMN

unless explicitly approved.

---

# 25. DATABASE MIGRATIONS

Every schema change must be represented by a migration.

Migrations must:

- be ordered;
- preserve existing data;
- maintain RLS;
- maintain tenant isolation;
- avoid unsafe defaults;
- avoid hardcoded tenant IDs;
- avoid destructive cleanup without explicit approval.

Never create a database structure manually in a way that bypasses versioned migrations.

---

# 26. NO MOCK DATABASE

Never introduce:

platform_db.json
fake JSON persistence
local JSON database
fake subscription store
fake tenant store

Production data must come from PostgreSQL/Supabase.

---

# 27. NO DEV BYPASSES

Never introduce:

mock authentication
hardcoded users
hardcoded admin emails
development JWT bypass
custom bypass headers

unless explicitly isolated inside a test-only environment and impossible to execute in production.

---

# 28. TYPESCRIPT

Strict TypeScript is required.

Every change must aim for:

tsc --noEmit

with zero new errors.

Avoid:

any

unless technically justified.

---

# 29. TESTING

Before declaring a feature complete:

- typecheck;
- lint if available;
- relevant tests;
- integration test where applicable;
- security test for authorization-sensitive code.

Never report PASS for tests that were not executed.

Use:

PASS
FAIL
NOT TESTED

accurately.

---

# 30. NO FALSE COMPLETION

Never claim:

"production-ready"
"fully functional"
"secure"
"complete"

unless the relevant functionality has actually been tested.

If environment limitations prevent testing:

mark:

BLOCKED
or
NOT TESTED

and explain why.

---

# 31. I18N

French is the default language.

English and Arabic must remain supported.

Arabic must use proper RTL layout.

Do not implement RTL as a superficial CSS mirror.

New user-facing features must not be permanently French-only.

---

# 32. UI

Use:

Tailwind CSS
lucide-react

Maintain:

- accessibility;
- responsive layout;
- consistent spacing;
- readable typography;
- clear state feedback.

Do not introduce unnecessary visual redesigns while implementing backend functionality.

---

# 33. NO UNSOLICITED FEATURES

Implement precisely the requested scope.

Do not:

- redesign unrelated modules;
- change database architecture unnecessarily;
- replace Supabase;
- introduce new infrastructure;
- change R1-R7;
- add new providers without request.

If an architectural problem blocks the requested feature:

STOP
→ explain
→ propose the minimal safe solution.

---

# 34. ARCHITECTURAL STOP CONDITIONS

STOP and request approval if implementation requires:

- disabling RLS;
- exposing Service Role to frontend;
- trusting tenant_id from external payload;
- destructive migration;
- silent data deletion;
- bypassing RBAC;
- introducing vendor-specific business logic into the core;
- creating duplicate persistence systems;
- modifying core R1-R7 rules;
- changing authentication architecture.

---

# 35. DEVELOPMENT PRINCIPLE

Prefer:

simple
explicit
testable
secure
provider-agnostic
tenant-safe

over:

clever
implicit
mocked
vendor-specific
over-engineered

The objective is not to make the demo look complete.

The objective is to make NextTransit structurally capable of becoming a production SaaS platform.

"L'architecture actuelle est vehicle-agnostic (fournisseur). Une généralisation vers un modèle asset-agnostic (device→asset→tenant) pour des verticales hors flotte est une vision Phase 3+, non implémentée, à confirmer explicitement avant tout développement."