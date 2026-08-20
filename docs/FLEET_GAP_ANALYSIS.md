# NEXTTRANSIT — FLEET MANAGEMENT GAP ANALYSIS

## 1. Matrice Fonctionnelle

| Domain | Feature | Backend | Database | API | Frontend | Tests | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| **A** | Vehicle Lifecycle Management | `vehicles.ts` | `vehicles` table | Partial | `FleetHealthGrid`, `VehicleDetailModal` | N/A | **PARTIAL** | Basic CRUD exists, missing acquisition/disposal/amortization flows. |
| **B** | Fleet Structure | Supabase Auth | `tenants`, `companies` | Active | `TenantConfig` | N/A | **COMPLETED** | Multi-tenant architecture and RLS fully established. |
| **C** | Driver Management | Auth / Profiles | `profiles` (role DRIVER) | Partial | `DriverMobileView` | N/A | **PARTIAL** | Users exist as drivers, missing license, shifts, and medical tracking. |
| **D** | Vehicle Assignment | `vehicles.ts` | `assigned_driver_id` in `vehicles` | Active | `VehicleDetailModal` | N/A | **PARTIAL** | Simple FK assignment exists, missing assignment history/handovers. |
| **E** | GPS Tracking | Worker | `telemetry_events` | Active | `TelemetryStream` | N/A | **COMPLETED** | Real-time ingestion via canonical events is fully built. |
| **F** | Trip History | None | None | None | None | N/A | **MISSING** | No trip calculation or historical route replay. |
| **G** | Stops and Idle Detection | None | None | None | None | N/A | **MISSING** | No logic to calculate idle time from telemetry. |
| **H** | Geofencing | None | None | None | None | N/A | **MISSING** | No POI/Zones tables or geofence entry/exit rules. |
| **I** | Telematics | `TelemetryIngestionService` | `device_mappings`, `telematics_gateways` | Active | limited | N/A | **COMPLETED** | Adapters (Flespi/Traccar) and Idempotency are robust. |
| **J** | Alert Management | Rules Engine | `fleet_alerts` | Partial | `ConflictAlerts` | N/A | **PARTIAL** | Alerts table exists but rule engine processing is incomplete. |
| **K** | Maintenance | `maintenance.ts` | `work_orders`, `inventory_items` | Active | `PMSchedulesView` | N/A | **PARTIAL** | PM Schedules view exists but DB PM models/triggers are missing. |
| **L** | Work Orders | `workOrders.ts` | `work_orders` | Active | `WorkOrderQueue` | N/A | **COMPLETED** | Full WO lifecycle (Open, In Progress, Closed) is supported. |
| **M** | Fuel Management | `fuel.ts` | `fuel_logs` | Active | `FuelModule` | N/A | **PARTIAL** | Manual logs exist, missing automated CAN-bus/Fuel-card sync. |
| **N** | Tire Management | None | None | None | None | N/A | **MISSING** | No axle configuration or tire lifecycle tracking. |
| **O** | Documents & Compliance | None | `regulatory_documents` (Algerian) | None | None | N/A | **PARTIAL** | Algerian corporate dossier exists, generic vehicle compliance missing. |
| **P** | Warranty Management | None | `warranties` table | None | None | N/A | **TECHNICAL_ONLY** | DB schema migrated, but no UI or backend logic exposed. |
| **Q** | Incidents and Accidents | `incidents.ts` | `driver_incidents` | Active | `IncidentReports` | N/A | **PARTIAL** | Basic reporting exists, missing claim/insurance workflows. |
| **R** | Mission and Dispatch | None | None | None | None | N/A | **MISSING** | No routing, dispatch, or mission tables. |
| **S** | Fleet Costs | None | `cost_records` | None | `VarianceDashboard` | N/A | **PARTIAL** | Cost records exist in DB but API aggregation is lacking. |
| **T** | TCO (Total Cost) | None | None | None | None | N/A | **MISSING** | No comprehensive TCO calculation model. |
| **U** | Reporting and Analytics | None | `cae_budget_metrics` | None | `StrategicDashboard` | N/A | **PARTIAL** | Dashboards exist visually but lack deep API data bindings. |
| **V** | Driver Behavior | None | None | None | `SafetyPerformance` | N/A | **TECHNICAL_ONLY** | UI placeholder exists, backend telemetry scoring missing. |
| **W** | Eco Driving | None | None | None | None | N/A | **MISSING** | No CO2 or fuel efficiency scoring. |
| **X** | Predictive Maintenance | None | `cae_budget_metrics` | None | `CaeBudgetPrioritization` | N/A | **TECHNICAL_ONLY** | AI integration planned (Gemini) but not fully operational on real data. |
| **Y** | Mobile/PWA | None | N/A | N/A | `MechanicMobileQueue` | N/A | **PARTIAL** | Responsive views exist, missing offline capabilities/ServiceWorkers. |


## 2. Analyse des Gaps (MISSING & PARTIAL)

**D. Vehicle Assignment (PARTIAL)**
- **Fichiers/Tables** : `vehicles` (table), `vehicles.ts`.
- **Dépendances** : Auth, profiles.
- **Effort & Priorité** : M - P1.
- *Remarque* : Actuellement une simple clé étrangère. Il faut une table `vehicle_assignments` pour l'historique et la traçabilité des chauffeurs.

**F, G, H. Trips, Stops, Geofencing (MISSING)**
- **Fichiers/Tables** : Création requise de `trips`, `geofences`, `geofence_events`.
- **Services réutilisables** : `TelemetryWorker`.
- **Dépendances** : Traitement géospatial (PostGIS recommandé si disponible).
- **Effort & Priorité** : XL - P2.

**K. Maintenance / PM Schedules (PARTIAL)**
- **Fichiers/Tables** : `pm_schedules` (à créer), `pm_tasks`.
- **Services réutilisables** : `workOrders.ts`.
- **Effort & Priorité** : L - P1.
- *Remarque* : L'interface `PMSchedulesView` est là, mais il manque le moteur de génération automatique de WO basé sur l'odomètre/le temps.

**N. Tire Management (MISSING)**
- **Fichiers/Tables** : `tires`, `axle_configs`, `tire_inspections`.
- **Effort & Priorité** : M - P3.

**O. Documents and Compliance (PARTIAL)**
- **Fichiers/Tables** : Réutiliser `regulatory_documents`, étendre aux véhicules (`vehicle_documents`).
- **Services réutilisables** : Supabase Storage pour les scans.
- **Effort & Priorité** : S - P1.

**P. Warranty Management (TECHNICAL_ONLY)**
- **Fichiers/Tables** : `warranties` (existant).
- **Effort & Priorité** : S - P2.
- *Remarque* : API et UI à câbler. Très rapide car le schéma existe.

**R. Mission and Dispatch (MISSING)**
- **Fichiers/Tables** : `missions`, `mission_stops`.
- **Effort & Priorité** : L - P2.

**S & T. Costs & TCO (PARTIAL/MISSING)**
- **Fichiers/Tables** : `cost_records` (existant).
- **Effort & Priorité** : M - P1.
- *Remarque* : Nécessite des endpoints d'agrégation SQL robustes pour alimenter le `VarianceDashboard` et générer le TCO.

**V & W & X. Behavior, Eco & Predictive (TECHNICAL_ONLY/MISSING)**
- **Fichiers/Tables** : Moteur de scoring, appels AI Gemini.
- **Effort & Priorité** : L - P3 (Innovation).


## 3. Ordre d'Implémentation Recommandé

1. **Phase 3A : Vehicle Assignment History (Domain D)**
   *Pourquoi : Indispensable pour attribuer des incidents et coûts au bon chauffeur dans le temps.*
2. **Phase 3B : PM Schedules & Maintenance Engine (Domain K)**
   *Pourquoi : Le cœur de NextTransit réside dans la décision de maintenance.*
3. **Phase 3C : Costs Aggregation & TCO (Domains S, T)**
   *Pourquoi : Le ROI client se prouve par le dashboard de variance et les coûts.*
4. **Phase 3D : Compliance & Warranties (Domains O, P)**
   *Pourquoi : Quick win, les tables/fondations existent.*
5. **Phase 4A : Trips & Geofencing (Domains F, H)**
   *Pourquoi : Module lourd qui nécessite une base de télémétrie déjà stabilisée (complétée en Phase 2).*

NEXTTRANSIT_FLEET_GAP_ANALYSIS=COMPLETE
