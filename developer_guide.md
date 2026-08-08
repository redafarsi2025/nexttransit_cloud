# NextTransit Developer Guide — Architecture & Role-Based Schema Mapping

Welcome to the **NextTransit Developer Guide**. This document provides a comprehensive technical architecture overview of the **NextTransit** Fleet Operations, Telemetry Reconciliation, and Maintenance Decision Engine applet.

---

## Table of Contents
1. [System Architecture Overview](#1-system-architecture-overview)
2. [FleetProvider & State Management Architecture](#2-fleetprovider--state-management-architecture)
3. [The 10 Screen Components: Technical Architecture](#3-the-10-screen-components-technical-architecture)
   - [1. StrategicDashboard (`STRATEGIC_DASHBOARD`)](#1-strategicdashboard-strategic_dashboard)
   - [2. VarianceDashboard (`VARIANCE_DASHBOARD`)](#2-variancedashboard-variance_dashboard)
   - [3. FleetHealthGrid (`FLEET_HEALTH_GRID`)](#3-fleethealthgrid-fleet_health_grid)
   - [4. InventoryDashboard (`INVENTORY_DASHBOARD`)](#4-inventorydashboard-inventory_dashboard)
   - [5. WorkOrderQueue (`WORK_ORDER_QUEUE`)](#5-workorderqueue-work_order_queue)
   - [6. ConflictAlerts (`CONFLICT_ALERTS`)](#6-conflictalerts-conflict_alerts)
   - [7. CaeBudgetPrioritization (`CAE_BUDGET_PRIORITIZATION`)](#7-caebudgetprioritization-cae_budget_prioritization)
   - [8. IncidentReports (`INCIDENT_REPORTS`)](#8-incidentreports-incident_reports)
   - [9. MechanicMobileQueue (`MECHANIC_MOBILE_QUEUE`)](#9-mechanicmobilequeue-mechanic_mobile_queue)
   - [10. DriverMobileView (`DRIVER_MOBILE_VIEW`)](#10-drivermobileview-driver_mobile_view)
   - [11. TenantConfig (`TENANT_CONFIG`)](#11-tenantconfig-tenant_config)
4. [Role-Based Access Control (RBAC) & Data View Schema Mapping](#4-role-based-access-control-rbac--data-view-schema-mapping)
5. [Domain Business Rules Reference (R1 – R7)](#5-domain-business-rules-reference-r1--r7)
6. [Golden Path Interactive Simulation Workflows](#6-golden-path-interactive-simulation-workflows)

---

## 1. System Architecture Overview

NextTransit is built as an enterprise-grade SPA using **React 18+**, **Vite**, **TypeScript**, and **Tailwind CSS**, with dual-layer storage support via **Supabase** (`@supabase/supabase-js`) and an in-memory reactive state engine (`FleetContext`).

```
+---------------------------------------------------------------------------------+
|                                    App.tsx                                      |
|  +---------------------------------------------------------------------------+  |
|  |                             FleetProvider                                 |  |
|  |  +-----------------------+  +------------------+  +--------------------+  |  |
|  |  |   TopBar (RBAC Switch |  |     Sidebar      |  | VehicleDetailModal |  |  |  |
|  |  +-----------------------+  +------------------+  +--------------------+  |  |
|  |                                                                           |  |
|  |  +---------------------------------------------------------------------+  |  |
|  |  |                         Screen Router                               |  |  |
|  |  |  [StrategicDashboard]   [VarianceDashboard]   [FleetHealthGrid]     |  |  |
|  |  |  [InventoryDashboard]   [WorkOrderQueue]      [ConflictAlerts]      |  |  |
|  |  |  [CaeBudgetPriority]    [IncidentReports]     [MechanicMobileQueue] |  |  |
|  |  |  [DriverMobileView]                                                 |  |  |
|  |  +---------------------------------------------------------------------+  |  |
|  +---------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------+
```

---

## 2. FleetProvider & State Management Architecture

The entire application state is centrally managed by the **`FleetProvider`** (`src/context/FleetContext.tsx`), which provides a reactive API surface to all 10 screen components via the **`useFleet()`** hook.

### Core State Slices
* **`vehicles: Vehicle[]`**: Real-time vehicle telemetry, OBD fault codes, classification (`Keystone` vs. `Standard`), health scores (`fault_score`, `compliance_score`, `freshness_score`), and schedule metadata.
* **`inventory: InventoryItem[]`**: Warehouse stock levels, SKU, reorder thresholds, compatible vehicle plates, unit costs, and lead times.
* **`workOrders: WorkOrder[]`**: Lifecycle tracked maintenance orders (`Open` -> `In Progress` -> `Pending Parts` -> `Closed`) with part consumption lists, labor rates, and mechanic assignments.
* **`incidents: Incident[]`**: Driver-reported symptoms (`Noise`, `Warning Light`, `Damage`) linked to OBD faults or flagged for **Rule R6** investigation.
* **`costRecords: CostRecord[]`**: Budget vs. Actual cost records categorized by quarterly period and maintenance system (`Preventive Maintenance`, `Corrective Repair`, `Parts & Consumables`, `Emergency Diagnostics`).
* **`alerts: FleetAlert[]`**: Rule violation alerts (`R1`–`R7`) with severity levels (`critical`, `warning`, `info`) and interactive resolution actions.
* **`caeAvailableBudget: number`**: Adjustable CAE maintenance capital allocation pool.
* **`caeDelayMultipliers: Record<VehicleClassification, number>`**: Configurable delay cost multipliers (`Keystone`: `2.2x`, `Standard`: `1.4x`).
* **`currentRole: Role`**: Active RBAC role controlling navigation and view permissions.
* **`currentScreen: ScreenId`**: Currently active screen view.

### Primary Action Handlers
1. **`logOBDFault(vehicleId, fault)`**:
   * Appends an `ActiveFaultCode` to the target vehicle.
   * **Rule R1 Check**: If severity is `'Critical'`, immediately marks vehicle status as `'Critical'` (`Unsafe / Red`) and issues an `R1 Emergency Alert`.
   * **Rule R4 Check**: Automatically creates a corrective `WorkOrder` and calculates total cost:  
     $$\text{Total Cost} = (\text{Labor Hours} \times \text{Hourly Rate}) + \sum (\text{Part Quantity} \times \text{Unit Cost})$$
   * **Rule R3 Check**: Deducts or reserves required warehouse parts from `inventory`.
2. **`createWorkOrder(order)`**:
   * Instantiates a new work order with automatic cost calculation (**Rule R4**).
   * Reserves linked inventory parts and triggers reorder alerts if stock drops below threshold (**Rule R3**).
3. **`closeWorkOrder(workOrderId, afterNotes)`**:
   * Updates work order status to `'Closed'` and permanently commits parts stock deduction.
   * Checks if all faults on the vehicle are resolved; if so, restores vehicle status to `'Healthy'`.
4. **`submitDriverIncident(vehicleId, category, description, driverName)`**:
   * Logs a driver symptom report.
   * **Rule R6 Check**: Automatically scans for corresponding active OBD fault codes on the vehicle. If none exist (`matched_to_fault === false`), it raises an `R6 Investigation Required` alert and enables one-click investigation work order dispatch.

---

## 3. The 10 Screen Components: Technical Architecture

### 1. StrategicDashboard (`STRATEGIC_DASHBOARD`)
* **Primary Role**: `DIRECTOR` (Full Access)
* **File Path**: `/src/components/screens/StrategicDashboard.tsx`
* **Purpose**: Executive overview presenting top-level fleet availability, budget variance summary, and high-priority critical alerts.
* **FleetContext Interactions**:
  * **Reads**: `vehicles`, `workOrders`, `inventory`, `costRecords`, `alerts`, `goldenPathAStatus`, `goldenPathBStatus`.
  * **Actions**: `changeScreen`, `setSelectedVehicleId`, `runGoldenPathA`, `runGoldenPathB`.
* **Business Logic Enforced**:
  * Calculates real-time **Fleet Availability Rate** (`Healthy Vehicles / Total Vehicles`).
  * Displays high-visibility **Rule R1 Critical Stop** banners if any vehicle has an active critical OBD fault.
  * Highlights **Rule R7 Budget Variance** across quarters.

---

### 2. VarianceDashboard (`VARIANCE_DASHBOARD`)
* **Primary Role**: `MGMT_CONTROLLER` (Full Access), `DIRECTOR` (View Only)
* **File Path**: `/src/components/screens/VarianceDashboard.tsx`
* **Purpose**: Granular financial analysis comparing projected budgets against actual expenditures across vehicle systems.
* **FleetContext Interactions**:
  * **Reads**: `costRecords`, `workOrders`, `vehicles`, `inventory`.
  * **Actions**: `setSelectedVehicleId`, filtering by period (`Q1 2026`, `Q2 2026`, `Q3 2026`, `Q4 2026`).
* **Business Logic Enforced**:
  * Enforces **Rule R7 (Strategic Fleet Health Variance Analysis)**.
  * Dynamically computes category variances:
    $$\text{Variance (\%)} = \frac{\text{Actual Spend} - \text{Budget}}{\text{Budget}} \times 100$$
  * Displays visual progress bars with threshold color coding (emerald for under-budget, rose for over-budget).

---

### 3. FleetHealthGrid (`FLEET_HEALTH_GRID`)
* **Primary Role**: `TECHNICAL_CONTROLLER` & `FLEET_MANAGER` (Full Access)
* **File Path**: `/src/components/screens/FleetHealthGrid.tsx`
* **Purpose**: Comprehensive telemetry matrix displaying every vehicle, active OBD trouble codes, classification tags, and real-time health sub-scores.
* **FleetContext Interactions**:
  * **Reads**: `vehicles`, `workOrders`, `inventory`.
  * **Actions**: `setSelectedVehicleId`, `logOBDFault`, filtering by status (`ALL`, `Critical`, `Attention`, `Healthy`) and classification (`ALL`, `Keystone`, `Standard`).
* **Business Logic Enforced**:
  * Displays three sub-scores per vehicle: **Fault Score** (0–100), **Compliance Score** (0–100), and **Freshness Score**.
  * Visualizes **Rule R1** critical status (`Red Alert`) and **Rule R2** departure date countdowns.

---

### 4. InventoryDashboard (`INVENTORY_DASHBOARD`)
* **Primary Role**: `LOGISTICS_CONTROLLER` (Full Access)
* **File Path**: `/src/components/screens/InventoryDashboard.tsx`
* **Purpose**: Warehouse logistics management, real-time stock monitoring, lead time tracking, and automated requisition alerts.
* **FleetContext Interactions**:
  * **Reads**: `inventory`, `workOrders`, `vehicles`.
  * **Actions**: Stock replenishment simulation, threshold alert acknowledgment.
* **Business Logic Enforced**:
  * Enforces **Rule R3 (Inventory Reservation System)**.
  * Automatically calculates **Reserved Quantity** based on open work orders and displays **Available Stock** (`Quantity - Reserved`).
  * Flags items where `Quantity <= Reorder Threshold` with low-stock warning banners.

---

### 5. WorkOrderQueue (`WORK_ORDER_QUEUE`)
* **Primary Role**: `TECHNICAL_CONTROLLER` & `FLEET_MANAGER` (Full Access), `MECHANIC` (Assigned Only), `LOGISTICS_CONTROLLER` (Parts Status)
* **File Path**: `/src/components/screens/WorkOrderQueue.tsx`
* **Purpose**: Centralized maintenance dispatch and lifecycle tracker for preventive, corrective, and investigation work orders.
* **FleetContext Interactions**:
  * **Reads**: `workOrders`, `vehicles`, `inventory`.
  * **Actions**: `createWorkOrder`, `closeWorkOrder`, filtering by status (`Open`, `In Progress`, `Pending Parts`, `Closed`).
* **Business Logic Enforced**:
  * Enforces **Rule R4 (Total Cost of Repair)** calculation on every work order card.
  * Tracks part allocation status and prevents closing work orders if parts are pending.

---

### 6. ConflictAlerts (`CONFLICT_ALERTS`)
* **Primary Role**: `FLEET_MANAGER` (Resolve Access), `TECHNICAL_CONTROLLER` (View)
* **File Path**: `/src/components/screens/ConflictAlerts.tsx`
* **Purpose**: Dedicated operational dashboard for detecting and resolving schedule-to-maintenance conflicts.
* **FleetContext Interactions**:
  * **Reads**: `vehicles`, `workOrders`, `alerts`.
  * **Actions**: `setSelectedVehicleId`, `createWorkOrder`, alert acknowledgment.
* **Business Logic Enforced**:
  * Enforces **Rule R2 (Schedule Conflict Prevention)**.
  * Flags any vehicle where `scheduled_use_days <= 3` that currently has active open work orders or critical OBD faults.
  * Provides one-click resolution options (e.g., reassigning route to a backup vehicle or expediting repair).

---

### 7. CaeBudgetPrioritization (`CAE_BUDGET_PRIORITIZATION`)
* **Primary Role**: `FLEET_MANAGER` (Full Access), `DIRECTOR` & `MGMT_CONTROLLER` (View)
* **File Path**: `/src/components/screens/CaeBudgetPrioritization.tsx`
* **Purpose**: Strategic Capital & Expense prioritization engine that ranks deferred maintenance tasks against an available budget pool.
* **FleetContext Interactions**:
  * **Reads**: `vehicles`, `caeAvailableBudget`, `caeDelayMultipliers`.
  * **Actions**: `setCaeAvailableBudget`, `updateCaeDelayMultiplier`, approval/deferral of CAE items.
* **Business Logic Enforced**:
  * Enforces **Rule R5 (CAE Budget Prioritization Metric)**:  
    $$\text{Priority Score} = (\text{Critical Severity} \times 0.40) + (\text{Days Until Route} \times 0.30) + \left(\frac{\text{Deferral Cost}}{\text{Repair Cost}} \times 0.30\right)$$
  * Computes statistical **Deferral Cost** using classification multipliers:
    $$\text{Deferral Cost} = \text{Repair Cost} \times \text{Delay Multiplier}$$

---

### 8. IncidentReports (`INCIDENT_REPORTS`)
* **Primary Role**: `TECHNICAL_CONTROLLER` & `FLEET_MANAGER` (View/Investigate), `DRIVER` (Submit)
* **File Path**: `/src/components/screens/IncidentReports.tsx`
* **Purpose**: Audit trail for driver-submitted symptom reports and automated telemetry reconciliation.
* **FleetContext Interactions**:
  * **Reads**: `incidents`, `vehicles`.
  * **Actions**: `createWorkOrder` (Investigation type), `setSelectedVehicleId`.
* **Business Logic Enforced**:
  * Enforces **Rule R6 (Telemetry Reconciliation / Driver Incident Audit)**.
  * Identifies unmatched driver reports (`matched_to_fault === false`) and highlights them with amber `R6 Investigation Needed` badges.
  * Allows technical controllers to launch a standardized **R6 Investigation Work Order** with one click.

---

### 9. MechanicMobileQueue (`MECHANIC_MOBILE_QUEUE`)
* **Primary Role**: `MECHANIC` (Full Access)
* **File Path**: `/src/components/screens/MechanicMobileQueue.tsx`
* **Purpose**: Mobile-optimized workshop terminal for technicians to scan vehicle OBD ports, view assigned tasks, and complete repairs.
* **FleetContext Interactions**:
  * **Reads**: `workOrders`, `vehicles`, `inventory`.
  * **Actions**: `logOBDFault` (Simulate OBD Scan), `closeWorkOrder`.
* **Business Logic Enforced**:
  * Acts as the primary trigger for **Golden Path A** (simulating a direct OBD scan of code `P0299` on `Transit-024`).
  * Enforces **Rule R1** emergency stop triggering and **Rule R3/R4** automated work order and part deduction upon completion.

---

### 10. DriverMobileView (`DRIVER_MOBILE_VIEW`)
* **Primary Role**: `DRIVER` (Submit Access)
* **File Path**: `/src/components/screens/DriverMobileView.tsx`
* **Purpose**: Mobile companion interface for transit drivers to check vehicle status and submit pre-trip or route incident logs.
* **FleetContext Interactions**:
  * **Reads**: `vehicles` (assigned vehicle status).
  * **Actions**: `submitDriverIncident`.
* **Business Logic Enforced**:
  * Acts as the primary trigger for **Golden Path B** (submitting a driver noise report without an OBD code).
  * Automatically checks telemetry linkage (**Rule R6**) upon submission and alerts the workshop if no matching DTC is found.

---

### 11. TenantConfig (`TENANT_CONFIG`)
* **Primary Roles**: `DIRECTOR` (Full Access), `MGMT_CONTROLLER` (Full Access)
* **File Path**: `/src/components/screens/TenantConfig.tsx`
* **Purpose**: Dedicated tenant and society configuration management console for saving tenant settings, society names, allocated budgets, money used, tax IDs, cost center codes, and currency rules.
* **FleetContext Interactions**:
  * **Reads**: `tenantConfigs`, `activeTenantId`, `activeTenant`, `costRecords`.
  * **Actions**: `updateTenantConfig`, `setActiveTenantId`, `addTenantConfig`.
* **Business Logic Enforced**:
  * **Multi-Tenant State & Persistence**: Stores tenant configurations in `localStorage` (`nexttransit_tenant_configs`, `nexttransit_active_tenant_id`) with automatic fallback to seed values.
  * **Money Used Auto-Sync**: Allows toggling automatic real-time calculation of `moneyUsed` from the sum of active fleet `costRecords`.
  * **Financial Parameter Customization**: Configures default workshop labor rates (used in **Rule R4** work order cost calculations) and emergency approval caps (used in **Rule R1** dispatches).
  * **Multi-Society Registration**: Provides an inline registration wizard for adding and instantly activating new tenant societies.

---

## 4. Role-Based Access Control (RBAC) & Data View Schema Mapping

NextTransit implements strict Role-Based Access Control across all 10 screens and within detailed modal dialogs. The **`RBAC_MATRIX`** in `src/data/seedData.ts` defines access levels for each role.

### RBAC Permission Matrix

| Screen ID | `DIRECTOR` | `MGMT_CONTROLLER` | `TECHNICAL_CONTROLLER` | `LOGISTICS_CONTROLLER` | `FLEET_MANAGER` | `MECHANIC` | `DRIVER` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`STRATEGIC_DASHBOARD`** | `full` | `view` | `none` | `none` | `none` | `none` | `none` |
| **`VARIANCE_DASHBOARD`** | `view` | `full` | `view` | `view` | `none` | `none` | `none` |
| **`FLEET_HEALTH_GRID`** | `view` | `view` | `full` | `none` | `full` | `none` | `none` |
| **`INVENTORY_DASHBOARD`** | `view` | `view` | `view` | `full` | `view` | `assigned_only` | `none` |
| **`WORK_ORDER_QUEUE`** | `none` | `none` | `full` | `parts_status` | `full` | `assigned_only` | `none` |
| **`CONFLICT_ALERTS`** | `none` | `none` | `view` | `none` | `resolve` | `none` | `none` |
| **`CAE_BUDGET_PRIORITIZATION`** | `view` | `view` | `view` | `none` | `full` | `none` | `none` |
| **`INCIDENT_REPORTS`** | `none` | `none` | `view` | `none` | `view` | `none` | `submit` |
| **`MECHANIC_MOBILE_QUEUE`** | `none` | `none` | `view` | `none` | `view` | `full` | `none` |
| **`DRIVER_MOBILE_VIEW`** | `none` | `none` | `none` | `none` | `view` | `none` | `submit` |
| **`TENANT_CONFIG`** | `full` | `full` | `view` | `view` | `view` | `none` | `none` |

### Permission Level Definitions
* **`full`**: Full read/write access; can trigger actions, create/close work orders, and modify configuration.
* **`view`**: Read-only access; action buttons and overrides are disabled or hidden.
* **`resolve`**: Ability to acknowledge and resolve conflict alerts (`Rule R2`).
* **`parts_status`**: Filtered view showing only part allocation, stock reservations, and warehouse status.
* **`assigned_only`**: Filtered view showing only work orders or tasks assigned to the logged-in mechanic (`M-01`).
* **`own_only`**: Filtered view showing only the vehicle assigned to the logged-in driver (`DRV-082`).
* **`submit`**: Permission to create and submit new driver incident logs.
* **`none`**: Screen is inaccessible; hidden from navigation sidebar.

### VehicleDetailModal (`src/components/vehicle/VehicleDetailModal.tsx`) Role Tab Schema
When a user clicks on a vehicle plate to inspect details, the modal dynamically filters visible tabs based on `currentRole`:
* **`DIRECTOR`**: Shows **`['summary']`** (High-level availability and executive status).
* **`MGMT_CONTROLLER`**: Shows **`['cost']`** (Quarterly cost breakdown and repair variance).
* **`LOGISTICS_CONTROLLER`**: Shows **`['parts']`** (Installed and required warehouse parts).
* **`TECHNICAL_CONTROLLER` / `FLEET_MANAGER`**: Shows **`['summary', 'diagnostics', 'history', 'cost', 'parts', 'work_orders']`** (Full technical & financial audit).
* **`MECHANIC`**: Shows **`['summary', 'diagnostics', 'history', 'parts', 'work_orders']`** (Technical execution without financial cost budgets).
* **`DRIVER`**: Shows **`['summary']`** (Vehicle status and pre-trip readiness).

---

## 5. Domain Business Rules Reference (R1 – R7)

```
        +-----------------------------------------------------------------+
        |                        OBD-II SCAN LOG                          |
        +-----------------------------------------------------------------+
                                         |
                                         v
                     [Rule R1: Critical Severity Check?]
                                /             \
                         (Yes) /               \ (No / Warning)
                              v                 v
                   +-------------------+   +--------------------+
                   | EMERGENCY RED     |   | LOG DIAGNOSTIC     |
                   | ALERT (R1)        |   | FAULT CODE         |
                   +-------------------+   +--------------------+
                              \                 /
                               v               v
                     [Rule R4: Auto-Create Work Order]
                     Cost = (Labor * Rate) + SUM(Parts)
                                         |
                                         v
                     [Rule R3: Reserve Inventory Stock]
                     If Stock <= Threshold -> Reorder Alert
                                         |
                                         v
                 [Rule R2: Schedule Conflict Check (<= 3 Days)?]
                                /             \
                         (Yes) /               \ (No)
                              v                 v
                   +-------------------+   +--------------------+
                   | RAISE R2 ROUTE    |   | STANDARD QUEUE     |
                   | CONFLICT ALERT    |   | DISPATCH           |
                   +-------------------+   +--------------------+
```

* **Rule R1 (Emergency Stop / Red Alert)**:
  * Triggered when an active OBD fault code has severity `'Critical'`.
  * Action: Immediately updates `vehicle.status = 'Critical'`, displays a `Red Alert` banner, and removes vehicle from active route dispatch.
* **Rule R2 (Schedule Conflict Prevention)**:
  * Triggered when `vehicle.scheduled_use_days <= 3` AND the vehicle has active open work orders or critical OBD faults.
  * Action: Generates an `R2 Conflict Alert` requiring Fleet Manager intervention.
* **Rule R3 (Inventory Reservation System)**:
  * Triggered when a `WorkOrder` requiring parts is created or closed.
  * Action: Automatically reserves stock on creation and permanently deducts stock on closure. Raises an alert if `quantity <= reorder_threshold`.
* **Rule R4 (Total Cost of Repair Formula)**:
  * Formula: $\text{Total Cost} = (\text{Labor Hours} \times \text{Hourly Rate}) + \sum(\text{Part Quantity} \times \text{Unit Cost})$.
  * Action: Standardized cost calculation applied across all work orders and CAE budgets.
* **Rule R5 (CAE Budget Prioritization Metric)**:
  * Formula: $\text{Priority Score} = (\text{Critical Severity} \times 40\%) + (\text{Days Until Route} \times 30\%) + (\text{ROI / Deferral Ratio} \times 30\%)$.
  * Action: Ranks deferred maintenance work orders against available capital budget.
* **Rule R6 (Telemetry Reconciliation / Driver Incident Audit)**:
  * Triggered when a driver incident report is submitted without a corresponding OBD trouble code.
  * Action: Sets `matched_to_fault = false` and generates an `R6 Investigation Work Order` to detect non-electronic mechanical issues.
* **Rule R7 (Strategic Fleet Health Variance Analysis)**:
  * Triggered on periodic financial reviews.
  * Action: Compares actual expenditure against projected quarterly budget across engine, electrical, brake, and chassis systems.

---

## 6. Golden Path Interactive Simulation Workflows

To test and demonstrate end-to-end rule enforcement without manual data entry, developers can execute two automated simulation workflows via the TopBar or Strategic Dashboard:

### Golden Path A: Automated OBD-II Fault Detection & Resolution
1. **Trigger**: Click **"Run Golden Path A"** or simulate OBD scan of code `P0299` (`Turbocharger Boost Sensor Circuit Low`) on **Transit-024** (`FL-2024-X`).
2. **Execution Sequence**:
   * Logs `'Critical'` OBD fault code `P0299` onto Transit-024 (**Rule R1** triggered -> Vehicle marked `Critical / Unsafe`).
   * Automatically generates Corrective Work Order `#WO-103` (**Rule R4** calculates labor + part costs).
   * Reserves `1x Turbocharger Boost Sensor (TURBO-SENS-01)` from inventory (**Rule R3** triggered).
   * Checks schedule (`scheduled_use_days = 2` <= 3 days) and dispatches an **R2 Schedule Conflict Alert**.
3. **Resolution**:
   * Switch to **Mechanic** role (`MECHANIC_MOBILE_QUEUE`) or **Work Order Queue** and close `#WO-103`.
   * Parts are deducted from warehouse stock, fault code is cleared, and Transit-024 is restored to `'Healthy'`.

### Golden Path B: Driver Incident Telemetry Verification (Rule R6)
1. **Trigger**: Click **"Run Golden Path B"** or submit a driver symptom report for **Transit-024** (`Category: Noise`, `"Loud squeal from front right wheel on hard braking"`).
2. **Execution Sequence**:
   * Logs incident report into `incidents` list.
   * Runs **Rule R6 Telemetry Reconciliation** audit against active OBD fault codes on Transit-024.
   * Determines no electronic sensor fault matches the physical symptom (`matched_to_fault = false`).
   * Generates an **R6 Investigation Needed** alert and enables one-click creation of an Investigation Work Order (`#WO-104`).
3. **Resolution**:
   * Workshop technician inspects mechanical brake pads/rotor, logs findings, and closes the investigation work order.

---
*End of NextTransit Developer Guide.*
