import {
  Vehicle,
  Warranty,
  FuelLog,
  WorkOrder,
  InventoryItem,
  FleetAlert,
  CostRecord,
  Incident,
  DeviceMapping,
  AuditLogEntry,
  TenantConfig,
  VehicleClassification,
} from '../types';
import { DEMO_TENANT_ID } from '../config/demoAccount';

/**
 * Single source of truth for the public demo tenant's fleet dossier: a heterogeneous
 * transport & logistics fleet (semi-trailers, rigid trucks, delivery vans, reefers,
 * shuttle buses, warehouse forklifts, standalone trailers) for "Numilog Logistics Spa".
 *
 * Consumed by:
 *  - src/services/demoSeedService.ts (generateLargeFleetDemoData) — client-side fallback
 *    seeding path, gated by ALLOW_DEMO_SEED.
 *  - scripts/sync-demo-snapshot.ts — writes this same data into demo_seed_snapshot so
 *    reset_demo_tenant_data() restores exactly what visitors first see (fixes the
 *    pre-existing drift where the SQL snapshot only had 3 hand-written vehicles while
 *    this generator had 200 unrelated ones).
 *
 * `Vehicle.mileage` has no engine-hours equivalent for forklifts, and no natural odometer
 * for towed trailers — both are documented per-category below rather than silently misused.
 */

export interface DemoDataset {
  tenantConfig: TenantConfig;
  vehicles: Vehicle[];
  warranties: Warranty[];
  fuelLogs: FuelLog[];
  workOrders: WorkOrder[];
  inventoryItems: InventoryItem[];
  alerts: FleetAlert[];
  deviceMappings: DeviceMapping[];
  auditLogs: AuditLogEntry[];
  incidents: Incident[];
  costRecords: CostRecord[];
}

export const DEMO_TENANT_CONFIG: TenantConfig = {
  id: DEMO_TENANT_ID,
  societyName: 'Numilog Logistics Spa',
  currency: 'DZD (DA)',
  currencySymbol: 'DA',
  defaultLanguage: 'fr',
  timezone: 'Africa/Algiers',
  notificationsEnabled: true,
  customDomain: 'fleet.numilog.dz',
  allocatedBudget: 125000000,
  moneyUsed: 82450000,
  fiscalYear: 'FY2026',
  operatingRegion: 'Algérie - Réseau National Transport & Logistique',
  taxRegistrationId: 'NIF-00021609948201',
  costCenterCode: 'CC-NUMILOG-ALGER-900',
  defaultLaborRate: 1400,
  emergencyApprovalThreshold: 250000,
  contactEmail: 'direction.flotte@numilog.dz',
  contactPhone: '+213 23 89 12 00',
  billingAddress: 'Zone Industrielle Oued Smar, Route de Meftah, Alger, Algérie',
  autoSyncMoneyUsed: true,
  primaryColor: '#0f172a',
  accentColor: '#d97706',
  brandTagline: 'Excellence Logistique & Réconciliation Télématique — Flotte Hétérogène Numilog',
  lastUpdated: '2026-08-21',
};

type CategoryKey = 'SR' | 'CP' | 'FG' | 'FR' | 'BU' | 'CE' | 'RM';

interface CategoryDef {
  key: CategoryKey;
  label: string; // human-readable category name, embedded in Vehicle.name
  count: number; // bulk-generated count, EXCLUDING hand-authored anchors below
  models: { brand: string; model: string }[];
  classificationSplit: (i: number) => VehicleClassification;
  mileageRange: [number, number]; // km for motorized road vehicles; hours-as-int for CE; km-towed proxy for RM
  mileageUnit: 'km' | 'engine_hours' | 'km_towed';
  motorized: boolean; // false => no fuel logs (RM has no engine)
  routes: string[];
  wilayaCodes: number[];
}

const LONG_HAUL_ROUTES = [
  'Alger (Birtouta) -> Hassi Messaoud Base Sud',
  'Plateforme Logistique Alger -> Oran Senia Hub',
  'Constantine Le Khroub -> Annaba Port',
  'Sétif Euro-Park -> Batna Hub',
  'Alger -> Béjaïa Port Corridor',
  'Oran Senia -> Tlemcen Frontière',
  'Alger -> Ghardaïa Sud',
];

const REGIONAL_ROUTES = [
  'Distribution Régionale Alger Centre',
  'Distribution Régionale Blida - Médéa',
  'Distribution Régionale Oran - Mostaganem',
  'Distribution Régionale Constantine - Skikda',
];

const LAST_MILE_ROUTES = [
  'Dernier Kilomètre Alger Est',
  'Dernier Kilomètre Alger Ouest',
  'Dernier Kilomètre Oran Centre-Ville',
  'Dernier Kilomètre Constantine Centre',
  'Dernier Kilomètre Annaba',
];

const COLD_CHAIN_ROUTES = [
  'Chaîne du Froid Alger -> Grossistes Agroalimentaires',
  'Chaîne du Froid Oran -> Marché de Gros Poisson',
  'Chaîne du Froid Blida -> Distributeurs Frais',
];

const SHUTTLE_ROUTES = [
  'Navette Personnel Alger (Birtouta -> Zone Industrielle)',
  'Navette Personnel Oran (Senia -> Hub)',
];

const CATEGORIES: CategoryDef[] = [
  {
    key: 'SR',
    label: 'Semi-remorque',
    count: 23, // + 2 hand-authored anchors below = 25
    models: [
      { brand: 'Renault Trucks', model: 'T480 High Cab Sleeper' },
      { brand: 'Volvo', model: 'FH16 750 Globetrotter XL' },
      { brand: 'Mercedes-Benz', model: 'Actros 1845 LS StreamSpace' },
      { brand: 'Scania', model: 'R450 Highline' },
      { brand: 'MAN', model: 'TGX 18.500 XXL Line' },
      { brand: 'DAF', model: 'XF 480 Super Space Cab' },
      { brand: 'Iveco', model: 'S-Way AS440 Hi-Way' },
    ],
    classificationSplit: (i) => (i % 3 === 0 ? 'Standard' : 'Keystone'),
    mileageRange: [180000, 620000],
    mileageUnit: 'km',
    motorized: true,
    routes: LONG_HAUL_ROUTES,
    wilayaCodes: [16, 9, 26, 31, 25, 6, 19],
  },
  {
    key: 'CP',
    label: 'Camion porteur',
    count: 11, // + 1 anchor = 12
    models: [
      { brand: 'Renault Trucks', model: 'D Wide 26T' },
      { brand: 'Iveco', model: 'Eurocargo ML180' },
      { brand: 'Mercedes-Benz', model: 'Atego 1524' },
    ],
    classificationSplit: () => 'Standard',
    mileageRange: [90000, 340000],
    mileageUnit: 'km',
    motorized: true,
    routes: REGIONAL_ROUTES,
    wilayaCodes: [16, 9, 31, 25],
  },
  {
    key: 'FG',
    label: 'Fourgon de livraison',
    count: 17, // + 1 anchor = 18
    models: [
      { brand: 'Renault', model: 'Master L3H2' },
      { brand: 'Mercedes-Benz', model: 'Sprinter 316 CDI' },
      { brand: 'Peugeot', model: 'Boxer 435 L4H2' },
      { brand: 'Fiat', model: 'Ducato Maxi 140' },
      { brand: 'Iveco', model: 'Daily 35S16' },
    ],
    classificationSplit: () => 'Standard',
    mileageRange: [40000, 210000],
    mileageUnit: 'km',
    motorized: true,
    routes: LAST_MILE_ROUTES,
    wilayaCodes: [16, 31, 25, 23],
  },
  {
    key: 'FR',
    label: 'Frigorifique',
    count: 9, // + 1 anchor = 10
    models: [
      { brand: 'Renault', model: 'Master Frigorifique Carrier Xarios' },
      { brand: 'Mercedes-Benz', model: 'Sprinter Frigorifique Thermo King V-300' },
      { brand: 'Iveco', model: 'Daily Frigorifique Carrier Supra' },
      { brand: 'Renault Trucks', model: 'D Wide Frigorifique Thermo King T-1000' },
    ],
    classificationSplit: (i) => (i % 4 === 0 ? 'Keystone' : 'Standard'),
    mileageRange: [60000, 260000],
    mileageUnit: 'km',
    motorized: true,
    routes: COLD_CHAIN_ROUTES,
    wilayaCodes: [16, 31, 9],
  },
  {
    key: 'BU',
    label: 'Bus / Minibus',
    count: 5, // + 1 anchor = 6
    models: [
      { brand: 'Iveco', model: 'Daily Minibus 50C 22 places' },
      { brand: 'Mercedes-Benz', model: 'Sprinter Transfer 519 CDI' },
    ],
    classificationSplit: () => 'Standard',
    mileageRange: [50000, 180000],
    mileageUnit: 'km',
    motorized: true,
    routes: SHUTTLE_ROUTES,
    wilayaCodes: [16, 31],
  },
  {
    key: 'CE',
    label: 'Chariot élévateur',
    count: 5, // + 1 anchor = 6
    models: [
      { brand: 'Toyota', model: 'Tonero 8FD25 (Thermique, 2.5T)' },
      { brand: 'Hyster', model: 'H2.5FT (Thermique, 2.5T)' },
      { brand: 'Linde', model: 'E20 (Électrique, 2.0T)' },
    ],
    classificationSplit: () => 'Standard',
    // NOTE: forklifts have no odometer — mileage here holds engine/motor HOURS, not km.
    // Vehicle.mileage has no dedicated hours field; documented here rather than silently
    // treated as kilometers. next_service_mileage follows the same hours convention.
    mileageRange: [800, 5200],
    mileageUnit: 'engine_hours',
    motorized: true,
    routes: ['Entrepôt Birtouta - Zone A', 'Entrepôt Birtouta - Zone B', 'Entrepôt Oran Senia'],
    wilayaCodes: [16, 31],
  },
  {
    key: 'RM',
    label: 'Remorque',
    count: 6,
    models: [
      { brand: 'Schmitz Cargobull', model: 'S.KO Fourgon Tautliner' },
      { brand: 'Krone', model: 'Profi Liner Mega' },
      { brand: 'Kögel', model: 'Cargo Frigo' },
    ],
    classificationSplit: () => 'Standard',
    // NOTE: trailers have no engine/odometer of their own — mileage here is an estimated
    // cumulative distance towed (tracked via the tractor unit), not a true odometer reading.
    mileageRange: [50000, 400000],
    mileageUnit: 'km_towed',
    motorized: false,
    routes: ['Attelage variable selon tracteur assigné'],
    wilayaCodes: [16, 9, 31],
  },
];

function plateFor(wilayaCode: number, seq: number): string {
  const base = (10000 + seq * 37) % 99999;
  return `${base.toString().padStart(5, '0')}-${(100 + (seq % 800)).toString().padStart(3, '0')}-${wilayaCode.toString().padStart(2, '0')}`;
}

function statusFor(seed: number): { status: Vehicle['status']; reason: string; faultScore: number; faultCodes: Vehicle['active_fault_codes'] } {
  const rand = seed % 100;
  if (rand >= 90) {
    return {
      status: 'Critical',
      reason: 'Défaut système détecté - Code diagnostic de sévérité élevée',
      faultScore: 30,
      faultCodes: [
        {
          code: seed % 2 === 0 ? 'P0234' : 'P0087',
          name: seed % 2 === 0 ? 'Surpression Turbocompresseur' : 'Pression Rampe Carburant Trop Basse',
          severity: 'Critical',
          logged_date: '2026-08-19T10:00:00Z',
          required_part_id: seed % 2 === 0 ? 'TURBO-ACT-02' : 'INJ-CR-01',
          required_intervention: 'Inspection rampe haute pression et remplacement capteur.',
        },
      ],
    };
  }
  if (rand >= 75) {
    return {
      status: 'Attention',
      reason: 'Défaut mineur ou seuil de service proche',
      faultScore: 70,
      faultCodes: [
        {
          code: 'P0113',
          name: "Capteur Température Air Admission - Signal Haut",
          severity: 'Warning',
          logged_date: '2026-08-18T15:30:00Z',
          required_part_id: 'SENS-AIR-01',
          required_intervention: 'Contrôle du faisceau et du connecteur capteur.',
        },
      ],
    };
  }
  return {
    status: 'Healthy',
    reason: 'État opérationnel nominal - Contrôle OBD propre',
    faultScore: 95,
    faultCodes: [],
  };
}

function buildBulkVehicles(cat: CategoryDef, startIndex: number): { vehicles: Vehicle[]; warranties: Warranty[]; deviceMappings: DeviceMapping[] } {
  const vehicles: Vehicle[] = [];
  const warranties: Warranty[] = [];
  const deviceMappings: DeviceMapping[] = [];

  for (let n = 1; n <= cat.count; n++) {
    const seed = startIndex + n;
    const id = `${cat.key}-${n.toString().padStart(3, '0')}`;
    const model = cat.models[(seed - 1) % cat.models.length];
    const route = cat.routes[(seed - 1) % cat.routes.length];
    const wilaya = cat.wilayaCodes[(seed - 1) % cat.wilayaCodes.length];
    const plate = plateFor(wilaya, seed);
    const { status, reason, faultScore, faultCodes } = statusFor(seed * 17);
    const classification = cat.classificationSplit(n);

    const [minMi, maxMi] = cat.mileageRange;
    const mileage = minMi + ((seed * 4130) % (maxMi - minMi));
    const serviceInterval = cat.mileageUnit === 'engine_hours' ? 150 + (seed % 100) : 5000 + ((seed * 150) % 6000);

    vehicles.push({
      id,
      plate,
      name: `${id} ${model.brand} ${model.model.split(' ')[0]} — ${cat.label} (${route.split(' ')[0]})`,
      classification,
      status,
      lifecycle_status: 'IN_SERVICE',
      status_reason: reason,
      last_check_date: '2026-08-20',
      active_fault_codes: faultCodes,
      mileage,
      next_service_mileage: mileage + serviceInterval,
      next_service_date: `2026-09-${(1 + (seed % 27)).toString().padStart(2, '0')}`,
      scheduled_use_days: cat.motorized ? 1 + (seed % 14) : 3 + (seed % 10),
      scheduled_route: cat.key === 'RM' ? undefined : route,
      maintenance_history: [],
      assigned_mechanic_id: `MCH-${(seed % 5) + 1}`,
      fault_score: faultScore,
      compliance_score: 85 + (seed % 15),
      freshness_score: 80 + (seed % 20),
      classification_weight: classification === 'Keystone' ? 1.5 : 1.0,
      delay_multiplier: classification === 'Keystone' ? 2.2 : 1.4,
    });

    const warrantyActive = seed % 5 !== 0;
    warranties.push({
      id: `WRN-${id}`,
      tenant_id: DEMO_TENANT_ID,
      vehicle_id: id,
      manufacturer: `${model.brand} Garantie Officielle`,
      expiry_date: warrantyActive ? '2027-12-31' : '2025-06-30',
      expiry_mileage: warrantyActive ? 600000 : 300000,
      covered_systems: cat.key === 'CE'
        ? ['hydraulique', 'électrique', 'mât de levage']
        : ['moteur', 'transmission', 'freins', 'électrique'],
      status: warrantyActive ? 'active' : 'expired',
      created_at: '2024-01-01T00:00:00Z',
    });

    if (cat.key !== 'RM') {
      const providers: DeviceMapping['provider'][] = ['direct', 'flespi', 'manual'];
      const protocols: DeviceMapping['protocol'][] = ['teltonika', 'wialon', undefined];
      deviceMappings.push({
        id: `DM-${id}`,
        tenant_id: DEMO_TENANT_ID,
        vehicle_id: id,
        provider: providers[seed % 3],
        protocol: protocols[seed % 3],
        external_device_id: `DEV-NUMILOG-${cat.key}-${seed.toString().padStart(4, '0')}`,
      });
    }
  }

  return { vehicles, warranties, deviceMappings };
}

// ── Hand-authored anchor vehicles: guarantee R1-R7 all trigger out of the box, one per
// heterogeneous category so the demo showcases the full fleet mix, not just trucks. ──
const ANCHOR_VEHICLES: Vehicle[] = [
  {
    id: 'SR-901',
    plate: '00124-326-16',
    name: 'SR-901 Renault T480 Titan — Semi-remorque (Alger Nord)',
    classification: 'Keystone',
    status: 'Critical',
    lifecycle_status: 'IN_SERVICE',
    status_reason: 'R1 EMERGENCY STOP: Défaut Critique Circuit Pression Turbocompresseur (P0299)',
    last_check_date: '2026-08-21',
    active_fault_codes: [
      {
        code: 'P0299',
        name: 'Turbocharger Boost Sensor A Circuit Low - Pressure Drop',
        severity: 'Critical',
        logged_date: '2026-08-21T06:15:00Z',
        required_part_id: 'TURBO-SENS-01',
        required_intervention: 'Remplacement immédiat du capteur de pression turbo & réalignement ECU.',
      },
    ],
    mileage: 384200,
    next_service_mileage: 390000,
    next_service_date: '2026-08-28',
    scheduled_use_days: 1,
    scheduled_route: 'Alger (Birtouta) -> Hassi Messaoud Base Sud',
    maintenance_history: [
      {
        id: 'MH-SR-901-01',
        date: '2026-06-12',
        type: 'Preventive',
        summary: 'Service préventif complet 350k km',
        labor_cost: 14000,
        parts_cost: 32000,
        total_cost: 46000,
      },
    ],
    assigned_mechanic_id: 'MCH-001',
    fault_score: 25,
    compliance_score: 98,
    freshness_score: 100,
    classification_weight: 1.5,
    delay_multiplier: 2.2,
  },
  {
    id: 'CP-901',
    plate: '01482-326-31',
    name: 'CP-901 Iveco Eurocargo Atlas — Camion porteur (Oran)',
    classification: 'Keystone',
    status: 'Attention',
    lifecycle_status: 'IN_SERVICE',
    status_reason: 'R2 CONFLIT PLANNING: Départ dans 2 jours avec Ordre de Travail correctif ouvert',
    last_check_date: '2026-08-20',
    active_fault_codes: [
      {
        code: 'P0700',
        name: 'Transmission Control System Request MIL Active',
        severity: 'Warning',
        logged_date: '2026-08-20T14:30:00Z',
        required_part_id: 'RET-PAD-02',
        required_intervention: 'Inspection ralentisseur hydrodynamique & joints.',
      },
    ],
    mileage: 210500,
    next_service_mileage: 215000,
    next_service_date: '2026-08-24',
    scheduled_use_days: 2,
    scheduled_route: 'Distribution Régionale Oran - Mostaganem',
    maintenance_history: [],
    assigned_mechanic_id: 'MCH-002',
    fault_score: 65,
    compliance_score: 95,
    freshness_score: 98,
    classification_weight: 1.5,
    delay_multiplier: 2.2,
  },
  {
    id: 'SR-902',
    plate: '03912-326-30',
    name: 'SR-902 Mercedes Actros Sirius — Semi-remorque (Constantine)',
    classification: 'Keystone',
    status: 'Critical',
    lifecycle_status: 'IN_SERVICE',
    status_reason: 'Surchauffe Moteur (P0217) - Thermostat Bloqué Fermé',
    last_check_date: '2026-08-21',
    active_fault_codes: [
      {
        code: 'P0217',
        name: 'Engine Coolant Overtemperature Condition Above 112°C',
        severity: 'Critical',
        logged_date: '2026-08-21T08:10:00Z',
        required_part_id: 'THRM-ACT-03',
        required_intervention: 'Remplacement thermostat & purge circuit de refroidissement.',
      },
    ],
    mileage: 495000,
    next_service_mileage: 500000,
    next_service_date: '2026-08-25',
    scheduled_use_days: 1,
    scheduled_route: 'Constantine Le Khroub -> Annaba Port',
    maintenance_history: [],
    assigned_mechanic_id: 'MCH-001',
    fault_score: 15,
    compliance_score: 90,
    freshness_score: 100,
    classification_weight: 1.5,
    delay_multiplier: 2.2,
  },
  {
    id: 'FG-901',
    plate: '02194-326-25',
    name: 'FG-901 Renault Master — Fourgon de livraison (Alger Est)',
    classification: 'Standard',
    status: 'Attention',
    lifecycle_status: 'IN_SERVICE',
    status_reason: 'R7 ANOMALIE CARBURANT: Pic de consommation détecté sur dernier plein',
    last_check_date: '2026-08-19',
    active_fault_codes: [],
    mileage: 92500,
    next_service_mileage: 100000,
    next_service_date: '2026-09-05',
    scheduled_use_days: 4,
    scheduled_route: 'Dernier Kilomètre Alger Est',
    maintenance_history: [],
    assigned_mechanic_id: 'MCH-003',
    fault_score: 80,
    compliance_score: 92,
    freshness_score: 90,
    classification_weight: 1.0,
    delay_multiplier: 1.4,
  },
  {
    id: 'FR-901',
    plate: '05183-326-19',
    name: 'FR-901 Mercedes Sprinter Frigo — Frigorifique (Chaîne du Froid)',
    classification: 'Keystone',
    status: 'Attention',
    lifecycle_status: 'IN_SERVICE',
    status_reason: 'R6 INCIDENT NON VÉRIFIÉ: Chauffeur signale alarme groupe froid sans code défaut OBD',
    last_check_date: '2026-08-20',
    active_fault_codes: [],
    mileage: 142000,
    next_service_mileage: 150000,
    next_service_date: '2026-09-01',
    scheduled_use_days: 2,
    scheduled_route: 'Chaîne du Froid Alger -> Grossistes Agroalimentaires',
    maintenance_history: [],
    assigned_mechanic_id: 'MCH-002',
    fault_score: 85,
    compliance_score: 96,
    freshness_score: 100,
    classification_weight: 1.5,
    delay_multiplier: 2.2,
  },
  {
    id: 'BU-901',
    plate: '06821-326-16',
    name: 'BU-901 Iveco Daily Minibus — Navette Personnel (Alger)',
    classification: 'Standard',
    status: 'Attention',
    lifecycle_status: 'IN_SERVICE',
    status_reason: 'Score sécurité dégradé: freinages brusques répétés sur navette du matin',
    last_check_date: '2026-08-21',
    active_fault_codes: [],
    mileage: 68000,
    next_service_mileage: 75000,
    next_service_date: '2026-09-10',
    scheduled_use_days: 1,
    scheduled_route: 'Navette Personnel Alger (Birtouta -> Zone Industrielle)',
    maintenance_history: [],
    assigned_mechanic_id: 'MCH-001',
    fault_score: 78,
    compliance_score: 94,
    freshness_score: 96,
    classification_weight: 1.0,
    delay_multiplier: 1.4,
  },
  {
    id: 'CE-901',
    plate: '07234-326-16',
    name: 'CE-901 Toyota Tonero 8FD25 — Chariot élévateur (Entrepôt Birtouta)',
    classification: 'Standard',
    status: 'Attention',
    lifecycle_status: 'IN_SERVICE',
    status_reason: 'Inspection réglementaire chariot en retard - immobilisation entrepôt recommandée',
    last_check_date: '2026-08-15',
    active_fault_codes: [],
    // Hours, not km — see CATEGORIES['CE'].mileageUnit note above.
    mileage: 4850,
    next_service_mileage: 5000,
    next_service_date: '2026-08-30',
    scheduled_use_days: 1,
    scheduled_route: 'Entrepôt Birtouta - Zone A',
    maintenance_history: [],
    assigned_mechanic_id: 'MCH-003',
    fault_score: 72,
    compliance_score: 80,
    freshness_score: 70,
    classification_weight: 1.0,
    delay_multiplier: 1.4,
  },
];

const ANCHOR_WARRANTIES: Warranty[] = [
  { id: 'WRN-SR-901', tenant_id: DEMO_TENANT_ID, vehicle_id: 'SR-901', manufacturer: 'Renault Trucks Excellence', expiry_date: '2027-12-31', expiry_mileage: 500000, covered_systems: ['moteur', 'transmission', 'turbocompresseur', 'électrique'], status: 'active', created_at: '2024-01-15T00:00:00Z' },
  { id: 'WRN-CP-901', tenant_id: DEMO_TENANT_ID, vehicle_id: 'CP-901', manufacturer: 'Iveco FleetCare', expiry_date: '2026-11-30', expiry_mileage: 300000, covered_systems: ['moteur', 'ralentisseur', 'transmission'], status: 'expiring_soon', created_at: '2024-03-20T00:00:00Z' },
  { id: 'WRN-SR-902', tenant_id: DEMO_TENANT_ID, vehicle_id: 'SR-902', manufacturer: 'Mercedes-Benz CharterWay', expiry_date: '2025-05-15', expiry_mileage: 400000, covered_systems: ['moteur', 'refroidissement', 'transmission'], status: 'expired', created_at: '2022-05-15T00:00:00Z' },
  { id: 'WRN-FG-901', tenant_id: DEMO_TENANT_ID, vehicle_id: 'FG-901', manufacturer: 'Renault Pro+ Garantie', expiry_date: '2028-01-31', expiry_mileage: 200000, covered_systems: ['moteur', 'électrique'], status: 'active', created_at: '2025-01-10T00:00:00Z' },
  { id: 'WRN-FR-901', tenant_id: DEMO_TENANT_ID, vehicle_id: 'FR-901', manufacturer: 'Mercedes-Benz + Thermo King Groupe Froid', expiry_date: '2027-06-30', expiry_mileage: 300000, covered_systems: ['moteur', 'groupe frigorifique'], status: 'active', created_at: '2025-02-01T00:00:00Z' },
  { id: 'WRN-BU-901', tenant_id: DEMO_TENANT_ID, vehicle_id: 'BU-901', manufacturer: 'Iveco FleetCare', expiry_date: '2027-04-15', expiry_mileage: 350000, covered_systems: ['moteur', 'freins', 'châssis'], status: 'active', created_at: '2025-04-15T00:00:00Z' },
  { id: 'WRN-CE-901', tenant_id: DEMO_TENANT_ID, vehicle_id: 'CE-901', manufacturer: 'Toyota Material Handling', expiry_date: '2026-10-01', expiry_mileage: 6000, covered_systems: ['hydraulique', 'électrique'], status: 'expiring_soon', created_at: '2023-10-01T00:00:00Z' },
];

const ANCHOR_DEVICE_MAPPINGS: DeviceMapping[] = [
  { id: 'DM-SR-901', tenant_id: DEMO_TENANT_ID, vehicle_id: 'SR-901', provider: 'direct', protocol: 'teltonika', external_device_id: 'TEL-864201049281901' },
  { id: 'DM-CP-901', tenant_id: DEMO_TENANT_ID, vehicle_id: 'CP-901', provider: 'flespi', protocol: 'wialon', external_device_id: 'WIA-UNIT-882902' },
  { id: 'DM-SR-902', tenant_id: DEMO_TENANT_ID, vehicle_id: 'SR-902', provider: 'direct', protocol: 'teltonika', external_device_id: 'TEL-864201049281902' },
  { id: 'DM-FG-901', tenant_id: DEMO_TENANT_ID, vehicle_id: 'FG-901', provider: 'manual', external_device_id: 'MAN-FG901-ALGER' },
  { id: 'DM-FR-901', tenant_id: DEMO_TENANT_ID, vehicle_id: 'FR-901', provider: 'direct', protocol: 'teltonika', external_device_id: 'TEL-864201049281905' },
  { id: 'DM-BU-901', tenant_id: DEMO_TENANT_ID, vehicle_id: 'BU-901', provider: 'flespi', protocol: 'wialon', external_device_id: 'WIA-UNIT-901906' },
];

const INVENTORY_ITEMS: InventoryItem[] = [
  { id: 'TURBO-SENS-01', name: 'Capteur Pression Turbocompresseur Heavy Duty (Volvo/Renault)', sku: 'SKU-VOL-TURBO-902', quantity: 12, reorder_threshold: 5, unit_cost: 18500, compatible_vehicles: ['SR-901', 'SR-902'], lead_time_days: 3, category: 'Systèmes Moteur' },
  { id: 'RET-PAD-02', name: 'Kit Joints & Valve Ralentisseur Hydrodynamique Voith', sku: 'SKU-RET-118', quantity: 8, reorder_threshold: 4, unit_cost: 32000, compatible_vehicles: ['CP-901'], lead_time_days: 5, category: 'Transmission & Ralentisseur' },
  { id: 'BRK-PAD-01', name: 'Plaquettes de Frein Céramique Essieu Avant PL 22.5"', sku: 'SKU-BRK-PAD-HD22', quantity: 3, reorder_threshold: 10, unit_cost: 14500, compatible_vehicles: ['SR-901', 'SR-902', 'CP-901'], lead_time_days: 4, category: 'Systèmes de Freinage' },
  { id: 'INJ-CR-01', name: 'Injecteur Haute Pression Common Rail Bosch', sku: 'SKU-BOSCH-INJ-881', quantity: 6, reorder_threshold: 8, unit_cost: 48000, compatible_vehicles: ['SR-901', 'SR-902'], lead_time_days: 6, category: 'Injection Carburant' },
  { id: 'THRM-ACT-03', name: 'Thermostat & Boîtier Joint Heavy Duty Mercedes Actros', sku: 'SKU-MB-THRM-402', quantity: 5, reorder_threshold: 3, unit_cost: 12800, compatible_vehicles: ['SR-902'], lead_time_days: 2, category: 'Refroidissement' },
  { id: 'FILT-OIL-02', name: 'Filtre à Huile Haute Efficacité (Flotte Lourde)', sku: 'SKU-FILT-OIL-550', quantity: 45, reorder_threshold: 20, unit_cost: 3200, compatible_vehicles: ['Toute la flotte motorisée'], lead_time_days: 2, category: 'Filtres & Consommables' },
  { id: 'FILT-FUEL-01', name: 'Filtre Carburant Primaire & Séparateur Eau', sku: 'SKU-FILT-FUEL-102', quantity: 38, reorder_threshold: 15, unit_cost: 4500, compatible_vehicles: ['Toute la flotte motorisée'], lead_time_days: 2, category: 'Filtres & Consommables' },
  { id: 'REEFER-COMP-01', name: 'Compresseur Groupe Froid Thermo King/Carrier + Kit Réfrigérant', sku: 'SKU-REEFER-COMP-220', quantity: 4, reorder_threshold: 3, unit_cost: 95000, compatible_vehicles: ['FR-901'], lead_time_days: 7, category: 'Chaîne du Froid' },
  { id: 'FORK-HYD-01', name: 'Fourches de Levage & Joints Hydrauliques Chariot Élévateur', sku: 'SKU-FORK-HYD-118', quantity: 6, reorder_threshold: 4, unit_cost: 22000, compatible_vehicles: ['CE-901'], lead_time_days: 5, category: 'Manutention & Entrepôt' },
  { id: 'VAN-BELT-01', name: 'Kit Courroie Distribution & Filtre Habitacle Fourgon', sku: 'SKU-VAN-BELT-310', quantity: 20, reorder_threshold: 8, unit_cost: 6800, compatible_vehicles: ['FG-901'], lead_time_days: 3, category: 'Fourgons & Utilitaires' },
  { id: 'TRAILER-AIR-01', name: 'Kit Frein à Air Essieu Remorque (Schmitz/Krone/Kögel)', sku: 'SKU-TRL-AIR-405', quantity: 9, reorder_threshold: 4, unit_cost: 15800, compatible_vehicles: ['Toutes remorques'], lead_time_days: 4, category: 'Remorques' },
  { id: 'BUS-DOOR-01', name: 'Kit Freinage Passagers & Vérins Portes Pneumatiques Minibus', sku: 'SKU-BUS-DOOR-205', quantity: 5, reorder_threshold: 3, unit_cost: 27500, compatible_vehicles: ['BU-901'], lead_time_days: 5, category: 'Bus & Navettes' },
  { id: 'ALT-28V-01', name: 'Alternateur Heavy Duty 28V 150A Delco Remy', sku: 'SKU-ALT-28V-150A', quantity: 4, reorder_threshold: 5, unit_cost: 38500, compatible_vehicles: ['Volvo FH16', 'Renault T480'], lead_time_days: 5, category: 'Systèmes Électriques' },
  { id: 'STR-24V-01', name: 'Démarreur 24V 5.5kW Heavy Duty', sku: 'SKU-STR-24V-55KW', quantity: 6, reorder_threshold: 4, unit_cost: 42000, compatible_vehicles: ['Scania R450', 'MAN TGX'], lead_time_days: 4, category: 'Systèmes Électriques' },
];

const WORK_ORDERS: WorkOrder[] = [
  {
    id: 'WO-R1-EMERG-901',
    vehicle_id: 'SR-901',
    vehicle_plate: '00124-326-16',
    type: 'Corrective',
    status: 'In Progress',
    labor_cost: 8400,
    parts_used: [{ part_id: 'TURBO-SENS-01', name: 'Capteur Pression Turbocompresseur Heavy Duty', quantity: 1, unit_cost: 18500 }],
    labor_hours: 6,
    hourly_rate: 1400,
    before_after_notes: { before: 'R1 ALERTE ROUGE: P0299 détecté. Véhicule retiré de la route Hassi Messaoud pour réparation urgente.', after: '' },
    created_date: '2026-08-21T06:30:00Z',
    assigned_mechanic_id: 'MCH-001',
    assigned_mechanic_name: 'David Thorne (Technicien Atelier Principal)',
    related_fault_code: 'P0299',
    warranty_risk: false,
  },
  {
    id: 'WO-R2-CONF-901',
    vehicle_id: 'CP-901',
    vehicle_plate: '01482-326-31',
    type: 'Corrective',
    status: 'Open',
    labor_cost: 7000,
    parts_used: [{ part_id: 'RET-PAD-02', name: 'Kit Joints & Valve Ralentisseur Hydrodynamique', quantity: 1, unit_cost: 32000 }],
    labor_hours: 5,
    hourly_rate: 1400,
    before_after_notes: { before: 'R2 CONFLIT OPÉRATIONNEL: CP-901 programmé pour départ Oran dans 2 jours. Remplacement ralentisseur en attente de baie atelier.', after: '' },
    created_date: '2026-08-20T15:00:00Z',
    assigned_mechanic_id: 'MCH-002',
    assigned_mechanic_name: 'Ahmed Benali (Mécanicien Hydraulique Senior)',
    related_fault_code: 'P0700',
    warranty_risk: false,
  },
  {
    id: 'WO-R4-COST-901',
    vehicle_id: 'SR-902',
    vehicle_plate: '03912-326-30',
    type: 'Corrective',
    status: 'In Progress',
    labor_cost: 11200,
    parts_used: [
      { part_id: 'THRM-ACT-03', name: 'Thermostat & Boîtier Joint Heavy Duty', quantity: 1, unit_cost: 12800 },
      { part_id: 'FILT-OIL-02', name: 'Filtre à Huile Haute Efficacité', quantity: 2, unit_cost: 3200 },
    ],
    labor_hours: 8,
    hourly_rate: 1400,
    before_after_notes: { before: 'R4 AUDIT COÛT TOTAL: Thermostat bloqué fermé. Formule R4 = (8 × 1400) + (12800 + 6400) = 30 400 DA.', after: '' },
    created_date: '2026-08-21T08:30:00Z',
    assigned_mechanic_id: 'MCH-001',
    assigned_mechanic_name: 'David Thorne (Technicien Atelier Principal)',
    related_fault_code: 'P0217',
    warranty_risk: true,
  },
  {
    id: 'WO-R6-INV-901',
    vehicle_id: 'FR-901',
    vehicle_plate: '05183-326-19',
    type: 'Investigation',
    status: 'Open',
    labor_cost: 4200,
    parts_used: [],
    labor_hours: 3,
    hourly_rate: 1400,
    before_after_notes: { before: "R6 ORDRE D'INVESTIGATION: Chauffeur signale alarme groupe froid sur fourgon Sprinter Frigo. Aucun code OBD détecté. Inspection physique requise.", after: '' },
    created_date: '2026-08-20T09:00:00Z',
    assigned_mechanic_id: 'MCH-003',
    assigned_mechanic_name: 'Karim Mansouri (Technicien Chaîne du Froid)',
    related_incident_id: 'INC-R6-901',
    warranty_risk: false,
  },
  {
    id: 'WO-CE-INSP-901',
    vehicle_id: 'CE-901',
    vehicle_plate: '07234-326-16',
    type: 'Inspection',
    status: 'Open',
    labor_cost: 1400,
    parts_used: [],
    labor_hours: 1,
    hourly_rate: 1400,
    before_after_notes: { before: 'Inspection réglementaire annuelle chariot élévateur en retard de 12 jours — immobilisation recommandée jusqu\'au contrôle.', after: '' },
    created_date: '2026-08-15T08:00:00Z',
    assigned_mechanic_id: 'MCH-003',
    assigned_mechanic_name: 'Karim Mansouri',
  },
  {
    id: 'WO-2026-891',
    vehicle_id: 'FG-901',
    vehicle_plate: '02194-326-25',
    type: 'Preventive',
    status: 'Closed',
    labor_cost: 5600,
    parts_used: [{ part_id: 'FILT-OIL-02', name: 'Filtre à Huile Haute Efficacité', quantity: 2, unit_cost: 3200 }],
    labor_hours: 4,
    hourly_rate: 1400,
    before_after_notes: { before: 'Maintenance préventive programmée 90k km.', after: 'Service effectué. Huile moteur et filtres renouvelés.' },
    created_date: '2026-07-20T08:00:00Z',
    closed_date: '2026-07-20T12:00:00Z',
    assigned_mechanic_id: 'MCH-003',
    assigned_mechanic_name: 'Karim Mansouri',
  },
];

const INCIDENTS: Incident[] = [
  {
    id: 'INC-R6-901',
    vehicle_id: 'FR-901',
    vehicle_plate: '05183-326-19',
    reported_by: 'Brahim Khelil (Chauffeur - Numilog Alger)',
    category: 'Warning Light',
    description: "R6 INCIDENT: Alarme sonore intermittente du groupe froid en roulant, sans voyant moteur allumé. Aucun code défaut électronique détecté.",
    matched_to_fault: false,
    status: 'Investigation',
    created_date: '2026-08-20T08:45:00Z',
  },
  {
    id: 'INC-2026-012',
    vehicle_id: 'SR-901',
    vehicle_plate: '00124-326-16',
    reported_by: 'Youcef Madani (Chauffeur - Numilog Hassi Messaoud)',
    category: 'Warning Light',
    description: 'Voyant moteur allumé avec perte de puissance immédiate en montée sur autoroute.',
    matched_to_fault: true,
    related_fault_code: 'P0299',
    status: 'Resolved',
    created_date: '2026-08-21T06:10:00Z',
  },
  {
    id: 'INC-BU-901',
    vehicle_id: 'BU-901',
    vehicle_plate: '06821-326-16',
    reported_by: 'Nadia Cherif (Chauffeuse - Navette Personnel)',
    category: 'Noise',
    description: 'Bruit de grincement au freinage sur la navette du matin, plusieurs signalements passagers.',
    matched_to_fault: false,
    status: 'Investigation',
    created_date: '2026-08-21T07:20:00Z',
  },
];

// NOTE: category values are constrained to the DB CHECK on cost_records
// (supabase/migrations/20260804000002_consolidated_schema.sql) — 'Preventive Maintenance',
// 'Corrective Repair', 'Parts & Consumables', 'Emergency Diagnostics' only. The wider CostRecord
// TS union (Engine/Fuel/Brakes/...) pre-dates that constraint and is not DB-writable as-is.
const COST_RECORDS: CostRecord[] = [
  { id: 'CR-2026-Q3-01', vehicle_id: 'SR-901', vehicle_plate: '00124-326-16', category: 'Emergency Diagnostics', amount: 17775000, budget_for_category: 15000000, period: 'Q3 2026', work_order_id: 'WO-R1-EMERG-901', related_fault_code: 'P0299' },
  { id: 'CR-2026-Q3-02', vehicle_id: 'CP-901', vehicle_plate: '01482-326-31', category: 'Corrective Repair', amount: 12400000, budget_for_category: 10500000, period: 'Q3 2026', work_order_id: 'WO-R2-CONF-901' },
  { id: 'CR-2026-Q3-03', vehicle_id: 'SR-902', vehicle_plate: '03912-326-30', category: 'Preventive Maintenance', amount: 8900000, budget_for_category: 9200000, period: 'Q3 2026' },
  { id: 'CR-2026-Q3-04', vehicle_id: 'FG-901', vehicle_plate: '02194-326-25', category: 'Parts & Consumables', amount: 6200000, budget_for_category: 5100000, period: 'Q3 2026' },
  { id: 'CR-2026-Q3-05', vehicle_id: 'FR-901', vehicle_plate: '05183-326-19', category: 'Corrective Repair', amount: 3100000, budget_for_category: 3400000, period: 'Q3 2026' },
];

const ALERTS: FleetAlert[] = [
  { id: 'ALT-R1-901', timestamp: '2026-08-21T06:16:00Z', rule_id: 'R1', title: 'DÉFAUT OBD CRITIQUE: SR-901 Perte Pression Turbo (P0299)', description: 'R1 ARRÊT URGENCE: Véhicule marqué CRITIQUE. Retiré de la file de répartition Hassi Messaoud jusqu\'à réparation validée.', severity: 'critical', vehicle_id: 'SR-901', read: false },
  { id: 'ALT-R2-901', timestamp: '2026-08-20T15:05:00Z', rule_id: 'R2', title: 'R2 CONFLIT PLANNING: CP-901 Départ dans 2 Jours', description: 'CP-901 programmé pour départ Oran dans 2 jours avec 1 ordre de travail correctif ouvert (Ralentisseur). Réaffectation ou réparation accélérée requise.', severity: 'warning', vehicle_id: 'CP-901', read: false },
  { id: 'ALT-R3-901', timestamp: '2026-08-21T07:00:00Z', rule_id: 'R3', title: 'R3 RÉAPPROVISIONNEMENT STOCK BAS: Plaquettes de Frein Céramique (BRK-PAD-01)', description: 'Stock BRK-PAD-01 (3) sous le seuil de sécurité (10). Réservé par WO-2026-891. Réquisition automatique soumise.', severity: 'warning', part_id: 'BRK-PAD-01', read: false },
  { id: 'ALT-R4-901', timestamp: '2026-08-21T08:31:00Z', rule_id: 'R4', title: 'R4 AUDIT FORMULE COÛT TOTAL: WO-R4-COST-901 Calculé', description: 'Coût total ordre de travail calculé à 30 400 DA = (8h × 1 400 DA/h) + (1× Thermostat @ 12 800 DA + 2× Filtre Huile @ 6 400 DA).', severity: 'info', vehicle_id: 'SR-902', read: true },
  { id: 'ALT-R5-901', timestamp: '2026-08-21T08:00:00Z', rule_id: 'R5', title: 'R5 PRIORISATION BUDGÉTAIRE CAE: Flotte Hétérogène en Attente', description: 'Le moteur de décision CAE a calculé l\'indice de priorité d\'allocation budgétaire pour les véhicules en état Critique/Attention à travers toutes les catégories (semi-remorques, fourgons, chariots élévateurs). Exposition totale au risque de report: 18 450 000 DA.', severity: 'warning', read: false },
  { id: 'ALT-R6-901', timestamp: '2026-08-20T09:01:00Z', rule_id: 'R6', title: 'R6 INCIDENT NON APPARIÉ: Signalement Chauffeur sur FR-901', description: 'Chauffeur a signalé une alarme groupe froid sur FR-901 sans code défaut OBD électronique. Ordre de travail d\'investigation R6 WO-R6-INV-901 créé.', severity: 'warning', vehicle_id: 'FR-901', read: false },
  { id: 'ALT-R7-901', timestamp: '2026-08-19T09:30:00Z', rule_id: 'R7', title: 'R7 ALERTE ÉCART COÛT: Dépenses Carburant Q3 2026 Dépassent le Budget de +21.6%', description: 'Coûts carburant réels Q3 (6 200 000 DA) dépassent le budget projeté (5 100 000 DA) de plus de 10%. Alerte d\'audit comptable déclenchée. Pic isolé sur FG-901.', severity: 'critical', vehicle_id: 'FG-901', read: false },
];

const AUDIT_LOGS: AuditLogEntry[] = [
  { id: 'AUD-SEED-901', tenant_id: DEMO_TENANT_ID, actor_id: 'usr-dir-01', actor_role: 'DIRECTOR', entity_type: 'tenant', entity_id: DEMO_TENANT_ID, action: 'TENANT_SEEDED', before: {}, after: { societyName: DEMO_TENANT_CONFIG.societyName, vehicleCount: 83, rulesSeeded: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'] }, created_at: new Date().toISOString() },
  { id: 'AUD-SEED-902', tenant_id: DEMO_TENANT_ID, actor_id: 'usr-tc-01', actor_role: 'TECHNICAL_CONTROLLER', entity_type: 'vehicle', entity_id: 'SR-901', action: 'R1_EMERGENCY_STOP_ENFORCED', before: { status: 'Healthy' }, after: { status: 'Critical', faultCode: 'P0299', routeLockout: true }, created_at: new Date().toISOString() },
  { id: 'AUD-SEED-903', tenant_id: DEMO_TENANT_ID, actor_id: 'usr-fm-01', actor_role: 'FLEET_MANAGER', entity_type: 'work_order', entity_id: 'WO-R6-INV-901', action: 'R6_INVESTIGATION_RAISED', before: { incidentId: 'INC-R6-901', matchedOBD: false }, after: { workOrderId: 'WO-R6-INV-901', status: 'Open' }, created_at: new Date().toISOString() },
];

function buildFuelLogs(vehicles: Vehicle[]): FuelLog[] {
  const motorized = vehicles.filter((v) => !v.id.startsWith('RM-'));
  return motorized.map((v, idx) => {
    const i = idx + 1;
    const isAnomaly = v.id === 'FG-901' || i === 12 || i === 40;
    return {
      id: `FL-2026-${i.toString().padStart(4, '0')}`,
      tenant_id: DEMO_TENANT_ID,
      vehicle_id: v.id,
      liters: isAnomaly ? 210 : 45 + (i % 90),
      cost: isAnomaly ? 7300 : 1600 + ((i % 90) * 34),
      odometer_km: v.mileage,
      logged_at: `2026-08-${(1 + (i % 20)).toString().padStart(2, '0')}T07:30:00Z`,
      anomaly_flag: isAnomaly,
      created_at: `2026-08-${(1 + (i % 20)).toString().padStart(2, '0')}T07:30:00Z`,
    };
  });
}

export function buildHeterogeneousFleetDataset(tenantId: string = DEMO_TENANT_ID): DemoDataset {
  const bulk = CATEGORIES.map((cat, catIdx) => buildBulkVehicles(cat, catIdx * 1000));

  const vehicles: Vehicle[] = [...ANCHOR_VEHICLES, ...bulk.flatMap((b) => b.vehicles)];
  const warranties: Warranty[] = [...ANCHOR_WARRANTIES, ...bulk.flatMap((b) => b.warranties)];
  const deviceMappings: DeviceMapping[] = [...ANCHOR_DEVICE_MAPPINGS, ...bulk.flatMap((b) => b.deviceMappings)];
  const fuelLogs = buildFuelLogs(vehicles);

  const tenantConfig: TenantConfig = { ...DEMO_TENANT_CONFIG, id: tenantId };

  return {
    tenantConfig,
    vehicles,
    warranties,
    fuelLogs,
    workOrders: WORK_ORDERS,
    inventoryItems: INVENTORY_ITEMS,
    alerts: ALERTS,
    deviceMappings,
    auditLogs: AUDIT_LOGS,
    incidents: INCIDENTS,
    costRecords: COST_RECORDS,
  };
}
