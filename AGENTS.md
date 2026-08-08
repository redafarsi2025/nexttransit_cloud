# AGENTS.md — Custom System Instructions for NextTransit AI Studio
### v2.0 — aligné sur le Blueprint Stratégique FlotteAkram/NextTransit

## Project Overview
NextTransit is a mission-critical Fleet Operations, Telemetry Reconciliation, and Maintenance Decision Engine. It provides role-based access control (RBAC), real-time OBD-II diagnostic fault tracking, automated work order lifecycle management, inventory reservation, and strategic cost variance modeling.

**Strategic framing (do not lose this when generating code):** the defensible product is the R1-R7 decision engine, not the telematics layer. Every new feature must strengthen the chain alert → work order → parts → real cost → budget arbitration → SCF compliance. Telemetry ingestion is a pluggable input to that chain, never a hard dependency — the engine must keep working on declarative/manual data entry when no live feed is connected (this is what makes the Numilog pilot possible before Phase 2 IoT streaming ships).

---

## Core Domain Rules & Business Logic

### 1. Decision Engine Rules (R1 – R7) — unchanged, immutable
* **Rule R1 (Emergency Stop / Red Alert):** Any active OBD fault categorized as `Critical` must immediately mark the vehicle status as `Unsafe / Red`, issue an emergency maintenance dispatch, and remove the vehicle from dispatch assignment.
* **Rule R2 (Schedule Conflict Prevention):** A vehicle scheduled for route departure within `3 days` that has open maintenance work orders triggers an operational conflict warning.
* **Rule R3 (Inventory Reservation System):** Creating a Work Order automatically reserves linked parts from inventory. Closing a Work Order permanently deducts stock. Low-stock thresholds trigger automated purchase order requisitions.
* **Rule R4 (Total Cost of Repair Formula):** `Total Work Order Cost = (Labor Hours × Hourly Rate) + SUM(Part Quantity × Part Unit Cost)`.
* **Rule R5 (CAE Budget Prioritization Metric):** `Priority Score = (Critical Severity Factor × 40%) + (Days Until Route × 30%) + (ROI / Cost Ratio × 30%)`.
* **Rule R6 (Telemetry Reconciliation / Driver Incident Audit):** Any driver-reported incident without a matching electronic OBD-II fault code automatically generates an **R6 Investigation Work Order** to catch non-electronic mechanical issues.
* **Rule R7 (Strategic Fleet Health Variance Analysis):** Compare actual maintenance expenditure against projected budget across engine, electrical, brake, and chassis systems. Variance > 10% triggers an accounting audit flag.

### 2. New domain modules to add (Blueprint gap analysis — priority order)
* **Warranty module (R1 extension):** vehicles carry a `warranty_status` (manufacturer, expiry date/mileage, covered systems). R1 must check warranty status when raising an alert and flag any maintenance action that risks voiding it — this is the primary Numilog pilot selling point, build it before anything else new.
* **Fuel module:** fuel logs (liters, cost, odometer), consumption per vehicle/route, anomaly detection (sudden consumption spike vs. fleet baseline). Feeds R7 variance analysis as a new cost category.
* **Tenant-scoped audit trail:** every mutation to a vehicle, work order, R1-R7 rule override, or CAE budget approval must write an immutable audit record (`actor`, `tenant_id`, `action`, `before/after`, `timestamp`). No UI deletes of audit records, ever.

---

## Technical Stack & Architecture Guidelines
* **Frontend Framework:** React 18+ with Vite and TypeScript (strict typing required).
* **Styling:** Tailwind CSS with modern neutral palettes, high-contrast dark and light surface layouts, generous spacing, and refined typography pairings.
* **Backend & Persistence:** Supabase (`@supabase/supabase-js`) for cloud synchronization, along with client-side reactive React context (`FleetContext`).
* **Multi-tenancy (Phase 1 — non-negotiable before any external demo):** every table (`vehicles`, `work_orders`, `inventory_items`, `alerts`, `warranties`, `fuel_logs`) must carry `tenant_id` and be protected by a Supabase Row-Level Security policy scoped to the `tenant_id` encoded in the user's JWT. No query path may bypass RLS, including admin tooling.
* **Telemetry ingestion abstraction:** define a single `TelematicsProvider` interface (`getFaultCodes`, `getPosition`, `subscribe`) with concrete adapters for Teltonika, Flespi/Wialon, and a `ManualEntryProvider` fallback. R1-R7 logic must consume this interface only, never a vendor-specific payload directly — this is what lets a pilot run on a client's existing GPS boxes without a new hardware rollout.
* **Iconography:** Strictly use `lucide-react` icons.
* **i18n:** French is default; English and Arabic (with native RTL layout, not a mirrored CSS hack) must remain fully supported for every new screen — this is a stated market differentiator, do not ship a feature in French-only.

---

## User Roles & Navigation Controls (RBAC)
Ensure that all UI elements respect the following role permissions:
1. **SUPER_ADMIN:** Administrateur plateforme SaaS.
2. **DIRECTOR:** Direction générale & arbitrage budgétaire.
3. **FLEET_MANAGER:** Supervision opérationnelle de la flotte.
4. **MAINTENANCE_MANAGER:** Direction technique & dispatch atelier.
5. **FINANCE:** Contrôle de gestion & conformité comptable SCF.
6. **OPERATIONS:** Gestionnaire logistique & approvisionnement stock R3.
7. **MECHANIC:** Technicien d'intervention atelier.
8. **DRIVER:** Chauffeur & inspections pré-trajet DVIR.

---

## Demo / Pilot Data Requirements (new)
When asked to generate seed or demo data, default to a realistic large-fleet scenario (hundreds of heavy trucks, tri-temperature logistics, several regional platforms) instead of a small generic fleet — the product must always demo convincingly at the scale of a target enterprise client, not a toy dataset. Vehicle records should support a warranty window and at least one linked fuel log so the Warranty and Fuel modules are always demonstrable end-to-end.

---

## Developer Principles
* **RBAC Source of Truth:** RBAC role names are the single source of truth in the RLS policies under supabase/migrations — if this file and the database disagree, the database wins; update this file, never assume this file is current.
* **No Unsolicited Features:** Build precisely what is requested. Keep the layout focused, clean, and scannable.
* **Zero Broken Handlers:** Ensure all interactive elements, modal toggles, and form actions are fully wired with active state logic.
* **Type Safety:** Always run linter checks and ensure zero TypeScript errors (`tsc --noEmit`).
* **RLS-first:** any new table or query added while building a feature must ship with its RLS policy in the same change — never as a follow-up.
* **Roadmap tagging:** when a request maps to a Blueprint phase beyond Phase 1-2 (EDI, RFID, SCF/CNAS accounting export, offline-first PWA), say so explicitly instead of silently building a partial version — flag it as "Phase 3+ — confirm before building" rather than shipping a half feature.