# Migration & One-off Patch Scripts Archive

This directory contains historical, one-off node maintenance/refactoring scripts (`.cjs`) used during development of the NextTransit platform. All of these scripts have been successfully executed and applied to the core codebase.

## Archived Scripts Summary

| Script Name | Summary of Operation | Status | Target Files |
| :--- | :--- | :--- | :--- |
| `append_fuel_costs.cjs` | Included `fuelLogs` data into total cost calculations in strategic and variance dashboards. | **Applied** | `StrategicDashboard.tsx`, `VarianceDashboard.tsx` |
| `fix_ts.cjs` | Added required `work_order_id: undefined` property to dynamic fuel cost objects for strict TypeScript safety. | **Applied** | `StrategicDashboard.tsx`, `VarianceDashboard.tsx` |
| `refactor_contexts.cjs` | Refactored UI components to import granular `useAuth()` and `useTenant()` context hooks instead of monolithic `useFleet()`. | **Applied** | All screen components in `src/components/` & `App.tsx` |
| `rewrite_fleet_context.cjs` | Extracted auth and tenant state variables from `FleetContext.tsx` into standalone context providers. | **Applied** | `src/context/FleetContext.tsx` |
| `update_audit_log.cjs` | Added `fuel_log` and `incident` entity categories to the filter dropdown in Audit Log UI. | **Applied** | `src/components/screens/AuditLog.tsx` |
| `update_audit_log_2.cjs` | Configured visual icon mappings (`⛽` fuel log, `⚠️` incident) in the Audit Log list renderer. | **Applied** | `src/components/screens/AuditLog.tsx` |
| `update_audits.cjs` | Injected `recordAudit` events for OBD faults, work order creation, work order closure, and driver incidents. | **Applied** | `src/context/FleetContext.tsx` |
| `update_audits_2.cjs` | Injected `recordAudit` event triggers when creating new fuel entries (`addFuelLog`). | **Applied** | `src/context/FleetContext.tsx` |

All changes from these scripts are permanently reflected in `src/` files and version control.
