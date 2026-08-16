# AGENTS.md — NextTransit AI Development Contract
### v5.2 — Security / Multi-Tenant / Provider-Agnostic / Sovereign Architecture

---

# 0. MISSION DU DOCUMENT

Ce fichier est le contrat architectural et de développement de NextTransit.

Tout agent AI, développeur ou automatisation intervenant sur le projet DOIT lire ce fichier avant toute modification.

Ce document définit :

- les invariants de sécurité ;
- les frontières de confiance ;
- les règles multi-tenant ;
- les contrats télématiques ;
- les règles du Decision Engine R1-R7 ;
- les exigences de qualité ;
- les règles de migration ;
- les règles de souveraineté ;
- les critères permettant de déclarer une fonctionnalité terminée.

Ce document NE remplace PAS les migrations SQL, les types TypeScript, les tests ou le code réel.

Le code réel et la base de données sont la source de vérité pour l'état d'implémentation.

---

# 1. PROJECT IDENTITY

NextTransit is a mission-critical multi-tenant SaaS platform for:

- Fleet Operations
- Fleet Maintenance
- Maintenance Decision Support
- Telemetry Reconciliation
- Predictive Maintenance
- Cost Control
- Budget Arbitration
- Asset Monitoring
- IoT Data Integration

NextTransit is NOT fundamentally a GPS tracking product.

The defensible product is the decision layer:

Telemetry / Manual Data
        ↓
Canonical Data
        ↓
Rules / Reconciliation
        ↓
Anomaly
        ↓
AI Analysis
        ↓
Validated Decision
        ↓
Maintenance / Operations / Cost Action

Telemetry is an input.

The Decision Engine is the product.

---

# 2. NON-NEGOTIABLE PRINCIPLES

All development MUST respect:

- SECURITY FIRST
- MULTI-TENANT FIRST
- RLS FIRST
- SERVER AUTHORITY
- ZERO TRUST
- FAIL CLOSED
- NO MOCK DATABASE
- NO SECURITY BYPASS
- NO FALSE COMPLETION
- PROVIDER AGNOSTIC TELEMETRY
- PROVIDER LOCK-IN PROHIBITION
- BACKEND-OWNED DECISION ENGINE
- AUDITABILITY
- DEFENSE IN DEPTH
- DATA MINIMIZATION
- SOVEREIGN DEPLOYMENT COMPATIBILITY

A feature is NOT complete merely because:

- the UI works;
- TypeScript compiles;
- a migration file exists;
- a test file exists;
- a Supabase query executes;
- a webhook receives a payload.

Security, tenant isolation, database integrity and runtime behavior must also be verified.

---

# 3. IMPLEMENTATION STATUS MODEL

AGENTS.md MUST distinguish architectural requirements from verified implementation.

Allowed statuses:

## CONTRACT

The architecture requires this behavior.

It does not imply implementation exists.

## IMPLEMENTED

Code or database structures implementing the requirement exist.

It does not imply that production behavior has been verified.

## VERIFIED

The implementation has been demonstrated using executable evidence.

Examples:

- passing automated tests;
- successful migration application;
- database schema inspection;
- RLS isolation test;
- HTTP integration test;
- security test;
- actual webhook test;
- production-like integration test.

## PARTIAL

Only part of the requirement is implemented.

## REQUIRED

The requirement is defined but implementation is missing.

## BLOCKED

Implementation cannot safely continue because a dependency, database structure, credential, environment or prerequisite is missing.

### RULE

Never convert:

IMPLEMENTED → VERIFIED

without evidence.

Never claim:

secure / production-ready / isolated / migrated / compliant

without executable evidence.

---

# 4. SOURCE OF TRUTH HIERARCHY

When contradictions exist, use this hierarchy:

1. Production database schema
2. Applied Supabase migrations
3. Backend security logic
4. Backend domain logic
5. Generated database types
6. Automated tests
7. AGENTS.md
8. Frontend assumptions / UI state

AGENTS.md defines the intended architecture.

It MUST NOT be used to invent database tables, columns, relationships or permissions that do not exist.

Before changing code:

1. Read AGENTS.md.
2. Inspect the actual code.
3. Inspect relevant migrations.
4. Inspect generated database types.
5. Inspect existing tests.
6. Determine the actual implementation status.
7. Only then modify the system.

---

# 5. AUTHENTICATION — ZERO TRUST

Supabase Auth is the identity authority.

The frontend is UNTRUSTED.

Never trust:

- React Context;
- hidden UI controls;
- localStorage;
- sessionStorage;
- frontend role;
- frontend tenant_id;
- frontend user_id;
- query-string identity;
- arbitrary HTTP headers;
- client-provided authorization claims.

The backend MUST determine:

IDENTITY
+
ROLE
+
TENANT
+
RESOURCE
+
ACTION

before executing a sensitive operation.

Forbidden in production:

- dev bypass;
- fake tokens;
- mock authentication;
- hardcoded admin emails;
- bypass headers;
- client-side admin secrets;
- client-provided identity as authorization evidence.

---

# 6. SUPER_ADMIN SECURITY

SUPER_ADMIN is a platform-level privileged identity.

Frontend visibility is NOT authorization.

Every SUPER_ADMIN operation MUST execute:

JWT validation
    ↓
Authenticated user resolution
    ↓
platform_admins verification
    ↓
Action authorization
    ↓
Resource validation
    ↓
Server-side operation
    ↓
Audit log

Service Role may be used only server-side and only when justified.

SUPER_ADMIN operations MUST be auditable.

Cross-tenant data MUST be minimized.

The frontend MUST NEVER receive:

- SUPABASE_SERVICE_ROLE_KEY;
- database credentials;
- internal service credentials;
- private provider secrets;
- unnecessary cross-tenant information.

---

# 7. SERVICE ROLE SECURITY

SUPABASE_SERVICE_ROLE_KEY is BACKEND ONLY.

Forbidden in:

- React;
- Vite client code;
- VITE_* variables;
- localStorage;
- sessionStorage;
- JavaScript-accessible cookies;
- logs;
- API responses;
- Git;
- public fixtures.

Service Role bypasses RLS technically.

It MUST NOT bypass application authorization conceptually.

Every Service Role operation MUST explicitly establish:

1. caller/system identity;
2. tenant context;
3. authorization;
4. resource ownership;
5. query scope;
6. audit requirements.

For tenant-scoped queries:

.eq('tenant_id', authorizedTenantId)

or an equivalent database-enforced constraint MUST be used.

Never use Service Role as a shortcut to avoid implementing authorization.

---

# 8. MULTI-TENANT SECURITY

tenant_id is a security boundary.

Never trust tenant_id supplied by:

- browser;
- webhook;
- external provider;
- query parameter;
- URL;
- arbitrary request body.

Tenant context MUST be derived from trusted authentication or trusted device resolution.

Every tenant-scoped table SHOULD contain:

- tenant_id;
- appropriate FK;
- RLS;
- tenant isolation policies.

Required policies when applicable:

- SELECT;
- INSERT;
- UPDATE;
- DELETE.

Tests MUST verify that:

Tenant A cannot:

- read Tenant B;
- modify Tenant B;
- delete Tenant B;
- create resources for Tenant B;
- associate devices with Tenant B.

---

# 9. CRITICAL TENANT INVARIANT

For all identity-bearing relationships:

DEVICE
    ↓
VEHICLE
    ↓
TENANT

the following invariant MUST hold:

device_mappings.tenant_id
==
vehicles.tenant_id

for the referenced vehicle.

Application checks alone are insufficient for security-critical identity relationships whenever the database can enforce the invariant.

Prefer database constraints, composite foreign keys or equivalent mechanisms where technically appropriate.

A mapping that violates this invariant MUST be rejected.

---

# 10. DEVICE REGISTRY

device_mappings is the trusted registry for external device identity.

The registry MUST define, at minimum:

- device mapping identity;
- provider;
- external device identifier;
- vehicle;
- tenant;
- active/inactive state.

A webhook MUST NOT create implicit device identity.

Unknown device:

REJECT.

Inactive device:

REJECT.

Cross-tenant device:

REJECT.

Unknown provider:

REJECT.

Ambiguous mapping:

REJECT.

The system MUST NOT guess device ownership.

---

# 11. PROVIDER IDENTIFIER NAMESPACE

External device identifiers are provider-scoped identifiers.

Never assume:

(provider, external_device_id)

is globally unique unless that property is verified from the provider's actual specification.

Uniqueness constraints MUST reflect the real provider namespace.

The architecture MUST remain compatible with providers where:

- device IDs are globally unique;
- device IDs are account-scoped;
- device IDs are tenant-scoped;
- device IDs can be reused;
- device IDs are numeric;
- device IDs are strings.

Provider identity MUST therefore be part of the canonical device resolution model.

---

# 12. TELEMETRY PROVIDER-AGNOSTIC ARCHITECTURE

NextTransit MUST NOT depend on a specific telematics provider.

Supported or future sources may include:

- Flespi;
- Traccar;
- Teltonika;
- Wialon;
- direct Teltonika TCP/UDP ingestion;
- local NextTransit Gateway;
- customer-owned gateways;
- manual entry;
- declarative data;
- future IoT providers.

These are INPUT CHANNELS.

They are NOT business dependencies.

Required abstraction:

PROVIDER
    ↓
TelematicsProviderAdapter
    ↓
CanonicalTelemetryEvent
    ↓
TelemetryRuleEngine
    ↓
Decision Engine R1-R7
    ↓
Business Action

No business rule may contain:

if provider === "flespi"

or:

if teltonika_payload

or any equivalent provider-specific business logic.

---

# 13. PROVIDER LOCK-IN PROHIBITION

Provider-specific SDKs, payload models, database structures and proprietary concepts MUST NOT leak outside the provider adapter boundary.

Provider-specific code SHOULD remain under:

src/services/telemetry/providers/

The rest of the system MUST consume provider-neutral contracts.

Replacing:

Flespi → Traccar

or:

Traccar → Flespi

or:

Flespi → Local Gateway

MUST NOT require modifications to R1-R7.

---

# 14. TELEMATICS MODES

NextTransit MUST support four operating modes:

MODE 1 — MANUAL
MODE 2 — DECLARATIVE
MODE 3 — TELEMATICS
MODE 4 — HYBRID

Telemetry is optional.

The SaaS MUST remain operational if no telematics provider is connected.

The Decision Engine MUST continue working with:

- manual incidents;
- maintenance records;
- inspections;
- work orders;
- inventory;
- costs;
- schedules;
- declarative vehicle state.

---

# 15. CANONICAL TELEMETRY EVENT

CanonicalTelemetryEvent is the internal telemetry contract.

Provider adapters MUST transform provider-specific payloads into this canonical structure.

The canonical event MUST contain only provider-neutral information.

Potential domains include:

- device identity;
- vehicle identity;
- tenant context;
- timestamp;
- GPS;
- speed;
- odometer;
- engine state;
- diagnostic faults;
- fuel;
- temperature;
- pressure;
- CAN/J1939/FMS-derived data;
- driver/asset signals;
- source metadata.

Provider-specific raw payloads MUST NOT become business-domain contracts.

Raw payloads SHOULD be retained separately only when required for diagnostics, compliance or reconciliation, with appropriate retention and security controls.

---

# 16. TELEMETRY TRUST BOUNDARY

All IoT/webhook payloads are UNTRUSTED.

Mandatory pipeline:

RAW PAYLOAD
↓
AUTHENTICATION
↓
PROVIDER VALIDATION
↓
DEVICE RESOLUTION
↓
TENANT RESOLUTION
↓
VEHICLE RESOLUTION
↓
SCHEMA VALIDATION
↓
NORMALIZATION
↓
TIMESTAMP VALIDATION
↓
GPS / VALUE VALIDATION
↓
REPLAY PROTECTION
↓
IDEMPOTENCY
↓
RULE ENGINE
↓
PERSISTENCE
↓
EVENT PUBLICATION

No step may be skipped to make ingestion succeed.

---

# 17. WEBHOOK AUTHENTICATION

When supported by the provider, use:

- HMAC;
- signature validation;
- secret tokens;
- mTLS where appropriate;
- trusted network restrictions;
- replay protection.

A payload containing:

provider = "flespi"

is NOT authentication.

Authentication must prove that the request is genuinely authorized to enter the provider boundary.

---

# 18. WEBHOOK SECURITY

Webhook endpoints MUST implement:

- authentication;
- provider validation;
- strict schema validation;
- maximum body size;
- request timeout;
- rate limiting;
- replay protection;
- idempotency;
- device resolution;
- tenant resolution;
- timestamp validation;
- GPS validation;
- safe error handling.

Never return:

- stack traces;
- secrets;
- database errors;
- SQL;
- internal paths;
- tenant data;
- provider credentials.

---

# 19. REPLAY PROTECTION

Telemetry events may be:

- duplicated;
- retried;
- delayed;
- maliciously replayed.

The system MUST prevent replayed events from generating duplicate business actions.

Use where available:

- event_id;
- nonce;
- provider sequence number;
- timestamp window;
- cryptographic signature;
- database uniqueness.

Old or suspicious events MAY be quarantined instead of silently discarded when forensic investigation is useful.

---

# 20. IDEMPOTENCY

Idempotency MUST be enforced at database level whenever technically possible.

Preferred identity:

provider
+
external_device_id
+
event_id

If event_id is unavailable, use a deterministic fallback based on verified provider/device/timestamp/data characteristics.

Idempotency MUST protect against:

- duplicate webhooks;
- provider retries;
- concurrent workers;
- network timeouts;
- job retries;
- duplicate queue deliveries.

One telemetry event MUST NOT create multiple:

- alerts;
- work orders;
- AI calls;
- notifications;
- accounting actions.

---

# 21. RATE LIMITING & ABUSE PROTECTION

Rate limiting MUST be granular.

Protect:

- authentication endpoints;
- password/reset endpoints;
- webhook endpoints;
- telemetry ingestion;
- AI endpoints;
- SUPER_ADMIN APIs;
- exports;
- bulk operations.

Telemetry rate limiting SHOULD consider:

provider
+
device
+
endpoint
+
IP

Payload limits MUST prevent:

- oversized bodies;
- payload bombing;
- memory exhaustion;
- recursive JSON abuse;
- excessive array sizes.

---

# 22. INPUT VALIDATION

All external inputs MUST be validated.

Preferred:

Zod or equivalent strict schemas.

Reject:

- unknown dangerous structures;
- invalid enums;
- malformed UUIDs;
- invalid timestamps;
- NaN;
- Infinity;
- impossible numeric values;
- unexpected arrays;
- excessive strings;
- oversized payloads.

Do not use permissive:

Record<string, any>

as an external API contract.

---

# 23. TIMESTAMP / GPS VALIDATION

Reject or quarantine:

- impossible timestamps;
- timestamps excessively in the future;
- timestamps outside accepted historical windows;
- invalid latitude;
- invalid longitude;
- NaN;
- Infinity;
- impossible speed;
- impossible odometer transitions.

GPS coordinates MUST be validated before business processing.

---

# 24. REAL-TIME ARCHITECTURE

Do NOT use PostgreSQL/Supabase Realtime to broadcast every high-frequency GPS point.

Preferred architecture:

Telemetry
↓
Latest Vehicle State
↓
SSE / WebSocket / Live Transport Channel

Supabase Realtime MAY be used for:

- alerts;
- fleet state changes;
- work order changes;
- business events;
- consolidated vehicle state.

High-frequency raw telemetry MUST NOT become a database broadcast storm.

---

# 25. DECISION ENGINE R1-R7

R1-R7 are provider-independent.

### R1 — Critical Safety

Critical active fault:

Vehicle → Unsafe/Red
+
Emergency Maintenance Dispatch
+
Remove from dispatch

### R2 — Schedule Conflict

Vehicle departing within 3 days with open maintenance:

Operational Conflict Warning.

### R3 — Inventory Reservation

Work Order creation:

Reserve parts.

Work Order closure:

Deduct stock.

Low stock:

Purchase requisition.

### R4 — Total Repair Cost

Total Cost:

Labor Hours × Hourly Rate
+
Σ(Part Quantity × Unit Cost)

### R5 — Budget Prioritization

Priority Score:

Critical Severity Factor × 40%
+
Days Until Route × 30%
+
ROI / Cost Ratio × 30%

### R6 — Telemetry Reconciliation

Driver-reported incident without matching electronic fault:

Generate R6 Investigation Work Order.

### R7 — Strategic Variance

Compare actual maintenance expenditure with projected budget.

Variance > 10%:

Accounting Audit Flag.

No provider may modify R1-R7.

---

# 26. WARRANTY

Warranty is a first-class domain capability.

Vehicles SHOULD support:

- manufacturer;
- warranty start;
- warranty expiration;
- mileage limit;
- covered systems;
- warranty status.

R1 and maintenance workflows MUST consider warranty constraints where applicable.

Maintenance actions that may compromise warranty coverage SHOULD trigger explicit warnings.

---

# 27. FUEL / ENERGY

Fuel data SHOULD support:

- liters;
- cost;
- odometer;
- vehicle;
- route;
- timestamp;
- provider/source.

Fuel analytics SHOULD feed:

- consumption;
- anomaly detection;
- cost variance;
- R7.

Future support may include:

- fuel sensors;
- CAN/FMS fuel data;
- fuel cards;
- manual entries.

---

# 28. FUTURE IoT EXPANSION

NextTransit is designed as a multi-domain IoT decision platform.

The canonical architecture MUST support future signals including:

Vehicles:
- GPS;
- OBD-II;
- CAN Bus;
- J1939;
- J1708;
- FMS;
- TPMS;
- fuel;
- temperature;
- tachograph;
- ADAS;
- camera events.

Other assets:
- trailers;
- containers;
- refrigerated units;
- forklifts;
- construction equipment;
- generators;
- industrial machinery;
- workshop sensors;
- stationary assets.

Adding a new sensor category MUST NOT require rewriting R1-R7.

---

# 29. AI SECURITY & DECISION AUTHORITY

AI is advisory.

Forbidden:

React
→
Gemini
→
Work Order

Required:

Telemetry
↓
Rule Engine
↓
Anomaly
↓
Predictive AI
↓
Validation
↓
Decision
↓
Work Order / Alert

AI MUST NOT directly:

- modify tenant identity;
- change permissions;
- create privileged users;
- bypass RLS;
- approve financial actions;
- close work orders;
- change safety status without deterministic validation.

AI failures MUST NOT disable deterministic R1-R7.

Required controls:

- timeout;
- retry limit;
- cooldown;
- deduplication;
- confidence threshold;
- explainability;
- audit;
- circuit breaker;
- deterministic fallback.

---

# 30. WEB APPLICATION SECURITY

All web endpoints MUST consider:

- XSS;
- CSRF;
- SQL injection;
- command injection;
- path traversal;
- prototype pollution;
- SSRF;
- open redirects;
- insecure file uploads;
- CORS misconfiguration;
- session fixation;
- brute force;
- broken access control.

Never interpolate SQL.

Never execute shell commands using untrusted input.

Uploaded files MUST NOT be trusted solely by MIME type.

Security headers SHOULD include, where appropriate:

- Content-Security-Policy;
- X-Content-Type-Options;
- Referrer-Policy;
- frame protection;
- secure cookie attributes.

---

# 31. SSRF PROTECTION

Any server-side HTTP request influenced by tenant/user input MUST be protected.

Block by default:

- localhost;
- 127.0.0.0/8;
- ::1;
- RFC1918 private ranges;
- link-local ranges;
- cloud metadata endpoints;
- internal infrastructure addresses.

Use:

- protocol allowlist;
- hostname validation;
- IP validation;
- redirect validation;
- timeout;
- response size limit.

Only explicitly authorized destinations may be accessed.

---

# 32. AUDIT LOGGING

Critical mutations MUST be auditable.

Audit records SHOULD contain:

- actor;
- tenant_id;
- action;
- resource;
- before;
- after;
- timestamp;
- correlation_id;
- source;
- authorization context.

Audit logs are immutable from the normal UI.

No UI deletion.

Secrets MUST NOT be written into audit records.

Security events SHOULD include:

- failed authentication;
- failed authorization;
- rejected webhook;
- invalid signature;
- unknown device;
- cross-tenant attempt;
- duplicate event;
- replay;
- provider failure;
- AI failure;
- database failure.

---

# 33. OBSERVABILITY

Production MUST provide sufficient observability to diagnose:

- request failures;
- webhook rejection;
- device resolution failure;
- tenant resolution failure;
- provider failure;
- duplicate telemetry;
- rule execution failure;
- AI failure;
- database failure;
- authentication failure.

Use:

- request_id;
- correlation_id;
- structured logs;
- metrics;
- health checks.

Never log secrets.

---

# 34. DATABASE MIGRATION SECURITY

Every migration MUST:

- be versioned;
- be reviewed;
- be idempotent where appropriate;
- preserve existing data;
- avoid arbitrary tenant defaults;
- avoid destructive DELETE;
- create required FK;
- activate RLS;
- create policies;
- avoid silent privilege escalation;
- document destructive operations;
- be tested before production.

NEVER assume:

migration file exists
=
migration applied.

A destructive migration requires explicit evidence and approval.

---

# 35. BACKUP & DISASTER RECOVERY

Production architecture MUST define:

- RPO;
- RTO;
- backup frequency;
- backup retention;
- backup encryption;
- offsite backup;
- restore procedure;
- restore testing.

A backup is NOT considered operationally validated until a restore has been successfully tested.

Sovereign deployments MUST maintain backup residency according to the customer's requirements and applicable regulations.

---

# 36. SOVEREIGN DEPLOYMENT

NextTransit MUST support multiple deployment modes.

### MODE A — CLOUD

Supabase Cloud
+
Cloud application
+
External IoT provider

### MODE B — SELF-HOSTED

Docker
+
PostgreSQL
+
Supabase self-hosted
+
Node backend
+
Frontend

### MODE C — ALGERIAN SOVEREIGN

Algerian infrastructure
+
Self-hosted database
+
Self-hosted backend
+
Self-hosted frontend
+
Local IoT gateway where required

No business logic may require:

- Supabase Cloud;
- Vercel;
- Flespi;
- Traccar;
- Teltonika;
- any foreign cloud.

These are replaceable infrastructure/input components.

---

# 37. IOT SOVEREIGNTY ROADMAP

The architecture MUST support progressive sovereignty:

LEVEL 1

Supabase Cloud
+
Flespi / Traccar

LEVEL 2

Supabase Cloud
+
customer-owned telematics gateway

LEVEL 3

Self-hosted NextTransit
+
Traccar/Flespi

LEVEL 4

Algerian hosting
+
local telemetry gateway

LEVEL 5

Fully sovereign deployment:

Device
↓
Local Gateway
↓
NextTransit
↓
PostgreSQL
↓
Decision Engine

No mandatory foreign data processor.

---

# 38. DATA MINIMIZATION

Only collect and retain data necessary for:

- operation;
- maintenance;
- security;
- analytics;
- compliance;
- audit.

Raw telemetry retention MUST be configurable.

High-frequency GPS data SHOULD have retention policies separate from:

- maintenance history;
- financial data;
- audit logs;
- vehicle master data.

---

# 39. RBAC

Current roles:

1. SUPER_ADMIN
2. DIRECTOR
3. FLEET_MANAGER
4. MAINTENANCE_MANAGER
5. FINANCE
6. OPERATIONS
7. MECHANIC
8. DRIVER

RBAC MUST be enforced server-side.

The database/RLS permission model is the security authority.

Frontend RBAC exists only for UX.

Role names MUST NOT silently diverge between:

- database;
- migrations;
- backend;
- frontend;
- AGENTS.md.

---

# 40. NO MOCK DATABASE

Production code MUST use the real persistence layer.

Forbidden:

- mock JSON databases;
- fake counters;
- random production statistics;
- hardcoded tenants;
- fake subscriptions;
- simulated production records.

Fixtures are allowed ONLY in tests.

Demo data MUST be clearly isolated from production data.

---

# 41. TESTING REQUIREMENTS

Before declaring a security-sensitive feature VERIFIED:

Run where environment permits:

npm audit
tsc --noEmit
npm test
lint
secret scanning
security tests

Required security test categories:

- authentication;
- authorization;
- tenant isolation;
- RLS;
- malformed payload;
- unknown provider;
- unknown device;
- inactive device;
- cross-tenant device;
- replay;
- idempotency;
- rate limiting;
- oversized payload;
- invalid timestamp;
- invalid GPS;
- Service Role misuse;
- SUPER_ADMIN authorization.

---

# 42. TYPESCRIPT QUALITY

Do NOT solve type errors using:

- as any;
- @ts-ignore;
- @ts-expect-error;

unless there is an exceptional, documented architectural reason.

Preferred approach:

1. correct database types;
2. correct domain types;
3. correct interfaces;
4. correct nullability;
5. correct generics;
6. correct runtime validation.

A compilation error must be fixed at its source.

---

# 43. NO FALSE COMPLETION

An agent MUST NEVER claim:

- implemented;
- secure;
- production-ready;
- migrated;
- tested;
- isolated;
- compliant;
- sovereign;
- provider-agnostic

without evidence.

Examples:

"Migration created" ≠ "migration applied".

"Test exists" ≠ "test passes".

"TypeScript compiles" ≠ "security verified".

"RLS policy exists" ≠ "tenant isolation verified".

"Webhook returns 200" ≠ "webhook secure".

"Supabase query works" ≠ "authorization correct".

---

# 44. CHANGE MANAGEMENT

Before modifying an architectural component:

1. Identify affected modules.
2. Identify database dependencies.
3. Identify R1-R7 dependencies.
4. Identify security boundaries.
5. Identify tenant boundaries.
6. Identify provider boundaries.
7. Identify existing tests.
8. Make the smallest safe change.
9. Run relevant tests.
10. Report failures honestly.

Do NOT rewrite unrelated components.

Do NOT introduce unsolicited features.

Do NOT modify R1-R7 silently.

---

# 45. PROVIDER REPLACEMENT TEST

The telemetry architecture should pass the following conceptual test:

Scenario A:

Teltonika
→
Flespi
→
CanonicalTelemetryEvent
→
R1-R7

Scenario B:

Teltonika
→
Traccar
→
CanonicalTelemetryEvent
→
R1-R7

Scenario C:

Teltonika
→
Local Gateway
→
CanonicalTelemetryEvent
→
R1-R7

Scenario D:

Manual Entry
→
CanonicalTelemetryEvent
→
R1-R7

The business behavior MUST remain equivalent for equivalent canonical events.

---

# 46. BUSINESS CONTINUITY

If the following services fail:

- Flespi;
- Traccar;
- Teltonika gateway;
- Gemini;
- Supabase Realtime;
- external IoT provider;

NextTransit MUST continue operating in the capabilities that do not depend on that service.

Examples:

Flespi unavailable:

Manual / Declarative mode continues.

Gemini unavailable:

R1-R7 deterministic rules continue.

Realtime unavailable:

Transactional database operations continue.

Telemetry unavailable:

Maintenance workflows continue.

---

# 47. PERFORMANCE & SCALABILITY

The architecture MUST be designed for:

- hundreds of vehicles;
- thousands of vehicles;
- multiple tenants;
- high-frequency telemetry;
- concurrent webhook delivery;
- asynchronous processing.

Do NOT synchronously perform expensive AI or business workflows directly inside high-frequency webhook handlers.

Prefer:

Webhook
→
Validate
→
Resolve
→
Persist/Queue
→
Async processing

where appropriate.

---

# 48. FUTURE MULTI-SECTOR ASSET PLATFORM

NextTransit MAY evolve beyond road fleet management.

The architecture SHOULD support:

- transport;
- logistics;
- BTP;
- construction;
- industrial equipment;
- generators;
- warehouses;
- refrigerated assets;
- agricultural machinery;
- containers;
- trailers.

This expansion MUST occur through domain-neutral telemetry and asset contracts.

Do NOT create provider-specific business logic for individual sectors.

---

# 49. DEMO / PILOT DATA

When explicitly requested to create demo data:

Use realistic enterprise-scale data.

Examples:

- hundreds of heavy trucks;
- multiple operational sites;
- regional platforms;
- maintenance workshops;
- warranty;
- fuel;
- work orders;
- inventory;
- costs;
- telemetry.

Demo data MUST remain clearly separated from production data.

Never use demo data to fake production metrics.

---

# 50. DEFINITION OF DONE

A feature is DONE only when:

- architecture is respected;
- backend behavior exists;
- database schema is correct;
- tenant isolation is verified;
- authentication is verified;
- authorization is verified;
- input validation exists;
- error handling is safe;
- audit requirements are satisfied;
- tests pass;
- TypeScript passes;
- migrations are applied where required;
- provider boundaries are respected;
- no mock production data exists;
- no security bypass was introduced.

For security-sensitive features, DONE means VERIFIED, not merely IMPLEMENTED.

---

# 51. FINAL AGENT RULE

When uncertain:

DO NOT GUESS.

DO NOT INFER IDENTITY.

DO NOT INFER TENANT.

DO NOT INFER DEVICE OWNERSHIP.

DO NOT INFER DATABASE STRUCTURE.

DO NOT BYPASS SECURITY.

DO NOT DECLARE SUCCESS WITHOUT EVIDENCE.

STOP and report the blocking condition.

The safest valid behavior is:

REJECT
+
LOG SAFELY
+
PRESERVE DATA
+
REPORT THE FAILURE

NextTransit must fail closed rather than silently becoming insecure.

AI AGENT GOVERNANCE

An AI coding agent is never an authority over:
- security
- tenant isolation
- RLS
- database integrity
- production readiness
- compliance
- business rules

The agent must provide executable evidence for every completion claim.

The agent MUST NOT:
- use `as any` to bypass a type error;
- disable RLS;
- bypass authentication;
- weaken validation;
- remove tests to obtain green CI;
- modify security controls merely to make a feature work;
- mark database changes VERIFIED without inspecting the real database.

When evidence is unavailable, the status MUST be:
NOT VERIFIED.