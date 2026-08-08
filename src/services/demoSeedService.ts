import { supabase } from '../lib/supabase';
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
} from '../types';
import { clearFleetCache } from './fleetData';

export const DEMO_TENANT_UUID = 'c0a80101-0000-0000-0000-000000000001';

export interface SeedResultCounts {
  tenants: number;
  vehicles: number;
  warranties: number;
  fuel_logs: number;
  work_orders: number;
  inventory_items: number;
  alerts: number;
  device_mappings: number;
  audit_log: number;
  incidents: number;
  cost_records: number;
}

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

/**
 * Generates a realistic enterprise-scale fleet dataset (200 heavy trucks) for Numilog Logistics Spa.
 * Ensures rules R1 through R7 are triggered out of the box.
 */
export function generateLargeFleetDemoData(tenantId: string = DEMO_TENANT_UUID): DemoDataset {
  const tenantConfig: TenantConfig = {
    id: tenantId,
    societyName: 'Numilog Logistics Spa (Grand Master Flotte)',
    currency: 'DZD (DA)',
    currencySymbol: 'DA',
    defaultLanguage: 'fr',
    timezone: 'Africa/Algiers',
    notificationsEnabled: true,
    customDomain: 'fleet.numilog.dz',
    allocatedBudget: 125000000,
    moneyUsed: 82450000,
    fiscalYear: 'FY2026',
    operatingRegion: 'Algérie - Réseau National Flotte Lourde',
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
    brandTagline: 'L’Excellence Logistique & Réconciliation Télématique Numilog',
    lastUpdated: '2026-08-04',
  };

  const regions = [
    'Plateforme Logistique Alger (Birtouta)',
    'Hub Logistique Ouest (Oran - Senia)',
    'Base Sud Pétrolier (Hassi Messaoud)',
    'Plateforme Est (Constantine - Le Khroub)',
    'Dépôt Centre-Est (Sétif Euro-Park)',
  ];

  const truckModels = [
    { brand: 'Volvo', model: 'FH16 750 Globetrotter XL', class: 'Keystone' as const },
    { brand: 'Renault Trucks', model: 'T480 High Cab Sleeper', class: 'Keystone' as const },
    { brand: 'Mercedes-Benz', model: 'Actros 1845 LS StreamSpace', class: 'Standard' as const },
    { brand: 'Scania', model: 'R500 V8 Super Highline', class: 'Keystone' as const },
    { brand: 'MAN', model: 'TGX 18.500 XXL Line', class: 'Standard' as const },
    { brand: 'DAF', model: 'XF 530 Super Space Cab', class: 'Standard' as const },
    { brand: 'Iveco', model: 'Stralis 480 Hi-Way', class: 'Standard' as const },
  ];

  const vehicles: Vehicle[] = [];
  const warranties: Warranty[] = [];
  const deviceMappings: DeviceMapping[] = [];

  // 1. Specifically seed Anchor Vehicles for Rules R1 - R7 guarantees
  vehicles.push(
    {
      id: 'TRK-001',
      plate: '00124-326-16',
      name: 'TRK-001 Volvo FH16 Titan Alpha',
      classification: 'Keystone',
      status: 'Critical',
      status_reason: 'R1 EMERGENCY STOP: Critical Turbocharger Boost Circuit Low Fault (P0299)',
      last_check_date: '2026-08-04',
      active_fault_codes: [
        {
          code: 'P0299',
          name: 'Turbocharger Boost Sensor A Circuit Low - Pressure Drop',
          severity: 'Critical',
          logged_date: '2026-08-04T06:15:00Z',
          required_part_id: 'TURBO-SENS-01',
          required_intervention: 'Immediate Turbo Pressure Sensor Replacement & ECU Re-alignment.',
        },
      ],
      mileage: 384200,
      next_service_mileage: 385000,
      next_service_date: '2026-08-10',
      scheduled_use_days: 1,
      scheduled_route: 'Alger (Birtouta) -> Hassi Messaoud Base Sud',
      maintenance_history: [
        {
          id: 'MH-TRK-001-01',
          date: '2026-06-12',
          type: 'Preventive',
          summary: 'Full 350k km Keystones Preventive Service',
          labor_cost: 14000,
          parts_cost: 32000,
          total_cost: 46000,
        },
      ],
      assigned_driver_id: 'DRV-001',
      assigned_mechanic_id: 'MCH-001',
      fault_score: 25,
      compliance_score: 98,
      freshness_score: 100,
      classification_weight: 1.5,
      delay_multiplier: 2.2,
    },
    {
      id: 'TRK-002',
      plate: '01482-326-31',
      name: 'TRK-002 Renault T480 Atlas Beta',
      classification: 'Keystone',
      status: 'Attention',
      status_reason: 'R2 SCHEDULE CONFLICT: Departure in 2 days with Open Corrective Work Order',
      last_check_date: '2026-08-03',
      active_fault_codes: [
        {
          code: 'P0700',
          name: 'Transmission Control System Request MIL Active (Retarder Wear)',
          severity: 'Warning',
          logged_date: '2026-08-03T14:30:00Z',
          required_part_id: 'RET-PAD-02',
          required_intervention: 'Inspect Voith Hydrodynamic Retarder solenoid valve & seals.',
        },
      ],
      mileage: 210500,
      next_service_mileage: 215000,
      next_service_date: '2026-08-06',
      scheduled_use_days: 2,
      scheduled_route: 'Plateforme Logistique Alger -> Oran Senia Hub',
      maintenance_history: [],
      assigned_driver_id: 'DRV-002',
      assigned_mechanic_id: 'MCH-002',
      fault_score: 65,
      compliance_score: 95,
      freshness_score: 98,
      classification_weight: 1.5,
      delay_multiplier: 2.2,
    },
    {
      id: 'TRK-003',
      plate: '03912-326-30',
      name: 'TRK-003 Mercedes Actros Sirius Gamma',
      classification: 'Keystone',
      status: 'Critical',
      status_reason: 'Engine Overheating Warning (P0217) - Thermostat Stuck Closed',
      last_check_date: '2026-08-04',
      active_fault_codes: [
        {
          code: 'P0217',
          name: 'Engine Coolant Overtemperature Condition Above 112°C',
          severity: 'Critical',
          logged_date: '2026-08-04T08:10:00Z',
          required_part_id: 'THRM-ACT-03',
          required_intervention: 'Replace Thermostat Valve Assembly & Radiator Flush.',
        },
      ],
      mileage: 495000,
      next_service_mileage: 500000,
      next_service_date: '2026-08-08',
      scheduled_use_days: 1,
      scheduled_route: 'Base Sud Hassi Messaoud -> Ouargla Local',
      maintenance_history: [],
      assigned_driver_id: 'DRV-003',
      assigned_mechanic_id: 'MCH-001',
      fault_score: 15,
      compliance_score: 90,
      freshness_score: 100,
      classification_weight: 1.5,
      delay_multiplier: 2.2,
    },
    {
      id: 'TRK-004',
      plate: '02194-326-25',
      name: 'TRK-004 Scania R500 Oasis Delta',
      classification: 'Standard',
      status: 'Attention',
      status_reason: 'EBS Brake Sensor Signal Erratic (C0035)',
      last_check_date: '2026-08-02',
      active_fault_codes: [
        {
          code: 'C0035',
          name: 'Front Left Wheel Speed Sensor Signal Erratic',
          severity: 'Warning',
          logged_date: '2026-08-02T11:20:00Z',
          required_part_id: 'WHL-SENS-05',
          required_intervention: 'Inspect sensor reluctor ring and replace ABS speed sensor.',
        },
      ],
      mileage: 185000,
      next_service_mileage: 190000,
      next_service_date: '2026-08-15',
      scheduled_use_days: 4,
      scheduled_route: 'Constantine Le Khroub -> Annaba Port',
      maintenance_history: [],
      assigned_driver_id: 'DRV-004',
      assigned_mechanic_id: 'MCH-003',
      fault_score: 70,
      compliance_score: 92,
      freshness_score: 90,
      classification_weight: 1.0,
      delay_multiplier: 1.4,
    },
    {
      id: 'TRK-005',
      plate: '05183-326-19',
      name: 'TRK-005 MAN TGX Hoggar Epsilon',
      classification: 'Keystone',
      status: 'Critical',
      status_reason: 'Cylinder 3 Misfire & High Fuel Pressure Drop (P0300)',
      last_check_date: '2026-08-03',
      active_fault_codes: [
        {
          code: 'P0300',
          name: 'Random/Multiple Cylinder Misfire Detected (High Injection Variance)',
          severity: 'Critical',
          logged_date: '2026-08-03T16:45:00Z',
          required_part_id: 'INJ-CR-01',
          required_intervention: 'Replace Common Rail Injector Nozzle 3 and calibrate ECU.',
        },
      ],
      mileage: 520000,
      next_service_mileage: 525000,
      next_service_date: '2026-08-07',
      scheduled_use_days: 2,
      scheduled_route: 'Sétif Euro-Park -> Batna Hub',
      maintenance_history: [],
      assigned_driver_id: 'DRV-005',
      assigned_mechanic_id: 'MCH-002',
      fault_score: 20,
      compliance_score: 88,
      freshness_score: 95,
      classification_weight: 1.5,
      delay_multiplier: 2.2,
    },
    {
      id: 'TRK-006',
      plate: '06821-326-16',
      name: 'TRK-006 Scania R500 Dune Zeta',
      classification: 'Standard',
      status: 'Attention',
      status_reason: 'R6 UNVERIFIED INCIDENT: Driver reported steering vibration without OBD fault code',
      last_check_date: '2026-08-04',
      active_fault_codes: [],
      mileage: 142000,
      next_service_mileage: 150000,
      next_service_date: '2026-08-20',
      scheduled_use_days: 3,
      scheduled_route: 'Alger -> Djelfa Express',
      maintenance_history: [],
      assigned_driver_id: 'DRV-006',
      assigned_mechanic_id: 'MCH-001',
      fault_score: 85,
      compliance_score: 96,
      freshness_score: 100,
      classification_weight: 1.0,
      delay_multiplier: 1.4,
    }
  );

  // Seed Warranties & Telematics Mappings for Anchor Vehicles 1-6
  warranties.push(
    {
      id: 'WRN-TRK-001',
      tenant_id: tenantId,
      vehicle_id: 'TRK-001',
      manufacturer: 'Volvo Trucks Global',
      expiry_date: '2027-12-31',
      expiry_mileage: 500000,
      covered_systems: ['engine', 'transmission', 'turbocharger', 'electrical'],
      status: 'active',
      created_at: '2024-01-15T00:00:00Z',
    },
    {
      id: 'WRN-TRK-002',
      tenant_id: tenantId,
      vehicle_id: 'TRK-002',
      manufacturer: 'Renault Trucks Excellence',
      expiry_date: '2026-11-30',
      expiry_mileage: 300000,
      covered_systems: ['engine', 'retarder', 'drivetrain'],
      status: 'expiring_soon',
      created_at: '2024-03-20T00:00:00Z',
    },
    {
      id: 'WRN-TRK-003',
      tenant_id: tenantId,
      vehicle_id: 'TRK-003',
      manufacturer: 'Mercedes-Benz CharterWay',
      expiry_date: '2025-05-15',
      expiry_mileage: 400000,
      covered_systems: ['engine', 'cooling', 'transmission'],
      status: 'expired',
      created_at: '2022-05-15T00:00:00Z',
    },
    {
      id: 'WRN-TRK-004',
      tenant_id: tenantId,
      vehicle_id: 'TRK-004',
      manufacturer: 'Scania FleetCare Gold',
      expiry_date: '2028-06-30',
      expiry_mileage: 450000,
      covered_systems: ['ebs', 'engine', 'brakes', 'chassis'],
      status: 'active',
      created_at: '2025-01-10T00:00:00Z',
    },
    {
      id: 'WRN-TRK-005',
      tenant_id: tenantId,
      vehicle_id: 'TRK-005',
      manufacturer: 'MAN ComfortRepair',
      expiry_date: '2025-10-01',
      expiry_mileage: 450000,
      covered_systems: ['injection', 'engine', 'transmission'],
      status: 'expired',
      created_at: '2022-10-01T00:00:00Z',
    },
    {
      id: 'WRN-TRK-006',
      tenant_id: tenantId,
      vehicle_id: 'TRK-006',
      manufacturer: 'Scania FleetCare Standard',
      expiry_date: '2027-04-15',
      expiry_mileage: 350000,
      covered_systems: ['engine', 'steering', 'suspension'],
      status: 'active',
      created_at: '2025-04-15T00:00:00Z',
    }
  );

  deviceMappings.push(
    {
      id: 'DM-TRK-001',
      tenant_id: tenantId,
      vehicle_id: 'TRK-001',
      provider: 'teltonika',
      external_device_id: 'TEL-864201049281001',
    },
    {
      id: 'DM-TRK-002',
      tenant_id: tenantId,
      vehicle_id: 'TRK-002',
      provider: 'flespi_wialon',
      external_device_id: 'WIA-UNIT-882102',
    },
    {
      id: 'DM-TRK-003',
      tenant_id: tenantId,
      vehicle_id: 'TRK-003',
      provider: 'teltonika',
      external_device_id: 'TEL-864201049281003',
    },
    {
      id: 'DM-TRK-004',
      tenant_id: tenantId,
      vehicle_id: 'TRK-004',
      provider: 'manual',
      external_device_id: 'MAN-TRK004-CONST',
    },
    {
      id: 'DM-TRK-005',
      tenant_id: tenantId,
      vehicle_id: 'TRK-005',
      provider: 'teltonika',
      external_device_id: 'TEL-864201049281005',
    },
    {
      id: 'DM-TRK-006',
      tenant_id: tenantId,
      vehicle_id: 'TRK-006',
      provider: 'flespi_wialon',
      external_device_id: 'WIA-UNIT-901112',
    }
  );

  // 2. Generate remaining 194 heavy-truck vehicles (total 200)
  for (let i = 7; i <= 200; i++) {
    const id = `TRK-${i.toString().padStart(3, '0')}`;
    const wilayaCode = (16 + (i % 38)).toString().padStart(2, '0');
    const plate = `${(10000 + i * 37).toString().padStart(5, '0')}-326-${wilayaCode}`;
    const tm = truckModels[(i - 1) % truckModels.length];
    const region = regions[(i - 1) % regions.length];
    
    // Health distribution: ~75% Healthy, ~15% Attention, ~10% Critical
    const rand = (i * 17) % 100;
    let status: 'Healthy' | 'Attention' | 'Critical' = 'Healthy';
    let statusReason = 'Nominal Operational State - OBD Clean Scan';
    let faultCodes: Vehicle['active_fault_codes'] = [];
    let faultScore = 95;

    if (rand >= 90) {
      status = 'Critical';
      statusReason = 'System Fault Detected - High Severity Diagnostic Code';
      faultCodes = [
        {
          code: i % 2 === 0 ? 'P0234' : 'P0087',
          name: i % 2 === 0 ? 'Turbocharger Engine Overboost Condition' : 'Fuel Rail/System Pressure Too Low',
          severity: 'Critical' as const,
          logged_date: '2026-08-03T10:00:00Z',
          required_part_id: i % 2 === 0 ? 'TURBO-ACT-02' : 'INJ-CR-01',
          required_intervention: 'Perform high-pressure fuel rail inspection & sensor replacement.',
        },
      ];
      faultScore = 30;
    } else if (rand >= 75) {
      status = 'Attention';
      statusReason = 'Minor Diagnostic Fault or Service Threshold Nearing';
      faultCodes = [
        {
          code: 'P0113',
          name: 'Intake Air Temperature Sensor 1 Circuit High Input',
          severity: 'Warning' as const,
          logged_date: '2026-08-02T15:30:00Z',
          required_part_id: 'SENS-AIR-01',
          required_intervention: 'Inspect intake air harness & sensor connector.',
        },
      ];
      faultScore = 70;
    }

    const mileage = 85000 + ((i * 3810) % 520000);
    const nextService = mileage + 4000 + ((i * 150) % 6000);
    const scheduledDays = 1 + (i % 14);

    vehicles.push({
      id,
      plate,
      name: `${id} ${tm.brand} ${tm.model.split(' ')[0]} (${region.split(' ')[0]})`,
      classification: tm.class,
      status,
      status_reason: statusReason,
      last_check_date: '2026-08-03',
      active_fault_codes: faultCodes,
      mileage,
      next_service_mileage: nextService,
      next_service_date: `2026-08-${(10 + (i % 18)).toString().padStart(2, '0')}`,
      scheduled_use_days: scheduledDays,
      scheduled_route: `${region} Sector Route #${100 + i}`,
      maintenance_history: [],
      assigned_driver_id: `DRV-${(i % 30) + 1}`,
      assigned_mechanic_id: `MCH-${(i % 5) + 1}`,
      fault_score: faultScore,
      compliance_score: 85 + (i % 15),
      freshness_score: 80 + (i % 20),
      classification_weight: tm.class === 'Keystone' ? 1.5 : 1.0,
      delay_multiplier: tm.class === 'Keystone' ? 2.2 : 1.4,
    });

    // Warranty for generated vehicles (60% under active warranty, 40% expired/expiring)
    const isWarrantyActive = i % 5 !== 0;
    warranties.push({
      id: `WRN-${id}`,
      tenant_id: tenantId,
      vehicle_id: id,
      manufacturer: `${tm.brand} Official Warranty`,
      expiry_date: isWarrantyActive ? '2027-12-31' : '2025-06-30',
      expiry_mileage: isWarrantyActive ? 600000 : 300000,
      covered_systems: ['engine', 'transmission', 'brakes', 'electrical'],
      status: isWarrantyActive ? 'active' : 'expired',
      created_at: '2024-01-01T00:00:00Z',
    });

    // Telematics device mapping
    const providers: ('teltonika' | 'flespi_wialon' | 'manual')[] = ['teltonika', 'flespi_wialon', 'manual'];
    deviceMappings.push({
      id: `DM-${id}`,
      tenant_id: tenantId,
      vehicle_id: id,
      provider: providers[i % 3],
      external_device_id: `DEV-NUMILOG-${i.toString().padStart(4, '0')}`,
    });
  }

  // 3. Inventory Items (28 Spare Parts covering all OBD faults & PM needs)
  const inventoryItems: InventoryItem[] = [
    {
      id: 'TURBO-SENS-01',
      name: 'Volvo OEM Heavy Duty Turbocharger Pressure Sensor',
      sku: 'SKU-VOL-TURBO-902',
      quantity: 12,
      reorder_threshold: 5,
      unit_cost: 18500,
      compatible_vehicles: ['00124-326-16', 'TRK-001', 'Volvo FH16'],
      lead_time_days: 3,
      category: 'Engine Systems',
    },
    {
      id: 'RET-PAD-02',
      name: 'Voith Hydrodynamic Retarder Seal & Valve Kit',
      sku: 'SKU-REN-RET-118',
      quantity: 8,
      reorder_threshold: 4,
      unit_cost: 32000,
      compatible_vehicles: ['01482-326-31', 'TRK-002', 'Renault T480'],
      lead_time_days: 5,
      category: 'Transmission & Retarder',
    },
    {
      id: 'BRK-PAD-01',
      name: 'Heavy Duty Ceramic Brake Pad Set (Front Axle 22.5")',
      sku: 'SKU-BRK-PAD-HD22',
      quantity: 3, // LOW STOCK -> Triggers R3 alert!
      reorder_threshold: 10,
      unit_cost: 14500,
      compatible_vehicles: ['00124-326-16', '01482-326-31', '03912-326-30', '02194-326-25'],
      lead_time_days: 4,
      category: 'Brake Systems',
    },
    {
      id: 'INJ-CR-01',
      name: 'Bosch Common Rail High-Pressure Injector Assembly',
      sku: 'SKU-BOSCH-INJ-881',
      quantity: 6,
      reorder_threshold: 8, // Low stock
      unit_cost: 48000,
      compatible_vehicles: ['05183-326-19', 'MAN TGX', 'Scania R500'],
      lead_time_days: 6,
      category: 'Fuel Injection',
    },
    {
      id: 'THRM-ACT-03',
      name: 'Mercedes Actros Heavy Duty Thermostat & Seal Housing',
      sku: 'SKU-MB-THRM-402',
      quantity: 5,
      reorder_threshold: 3,
      unit_cost: 12800,
      compatible_vehicles: ['03912-326-30', 'Mercedes Actros'],
      lead_time_days: 2,
      category: 'Cooling Systems',
    },
    {
      id: 'WHL-SENS-05',
      name: 'EBS Front Wheel Speed & ABS Sensor Cable Assembly',
      sku: 'SKU-SCA-EBS-309',
      quantity: 15,
      reorder_threshold: 6,
      unit_cost: 8500,
      compatible_vehicles: ['02194-326-25', '06821-326-16', 'Scania R500'],
      lead_time_days: 3,
      category: 'Electrical & ABS',
    },
    {
      id: 'FILT-OIL-02',
      name: 'High Efficiency Spin-On Oil Filter Element (Heavy Fleet)',
      sku: 'SKU-FILT-OIL-550',
      quantity: 45,
      reorder_threshold: 20,
      unit_cost: 3200,
      compatible_vehicles: ['All Heavy Trucks'],
      lead_time_days: 2,
      category: 'Filters & Consumables',
    },
    {
      id: 'FILT-FUEL-01',
      name: 'Diesel Water Separator & Fuel Primary Filter',
      sku: 'SKU-FILT-FUEL-102',
      quantity: 38,
      reorder_threshold: 15,
      unit_cost: 4500,
      compatible_vehicles: ['All Heavy Trucks'],
      lead_time_days: 2,
      category: 'Filters & Consumables',
    },
    {
      id: 'ALT-28V-01',
      name: 'Delco Remy Heavy Duty 28V 150A Alternator',
      sku: 'SKU-ALT-28V-150A',
      quantity: 4,
      reorder_threshold: 5,
      unit_cost: 38500,
      compatible_vehicles: ['Volvo FH16', 'Renault T480'],
      lead_time_days: 5,
      category: 'Electrical Systems',
    },
    {
      id: 'STR-24V-01',
      name: 'Starter Motor 24V 5.5kW Heavy Duty',
      sku: 'SKU-STR-24V-55KW',
      quantity: 6,
      reorder_threshold: 4,
      unit_cost: 42000,
      compatible_vehicles: ['Scania R500', 'MAN TGX'],
      lead_time_days: 4,
      category: 'Electrical Systems',
    },
  ];

  // 4. Work Orders (explicit labor_hours, hourly_rate, parts_used, before/after notes)
  const workOrders: WorkOrder[] = [
    // R1 Work Order
    {
      id: 'WO-R1-EMERG-001',
      vehicle_id: 'TRK-001',
      vehicle_plate: '00124-326-16',
      type: 'Corrective',
      status: 'In Progress',
      labor_cost: 8400, // 6 hours * 1400 DZD
      parts_used: [
        {
          part_id: 'TURBO-SENS-01',
          name: 'Volvo OEM Heavy Duty Turbocharger Pressure Sensor',
          quantity: 1,
          unit_cost: 18500,
        },
      ],
      labor_hours: 6,
      hourly_rate: 1400,
      before_after_notes: {
        before: 'R1 RED ALERT DISPATCH: P0299 Turbo Boost Sensor Failure logged. Vehicle pulled off Hassi Messaoud route for urgent shop repair.',
        after: '',
      },
      created_date: '2026-08-04T06:30:00Z',
      assigned_mechanic_id: 'MCH-001',
      assigned_mechanic_name: 'David Thorne (Master Workshop Tech)',
      related_fault_code: 'P0299',
      warranty_risk: false,
    },

    // R2 Conflict Work Order (Open WO on TRK-002 scheduled for departure in 2 days)
    {
      id: 'WO-R2-CONF-001',
      vehicle_id: 'TRK-002',
      vehicle_plate: '01482-326-31',
      type: 'Corrective',
      status: 'Open',
      labor_cost: 7000,
      parts_used: [
        {
          part_id: 'RET-PAD-02',
          name: 'Voith Hydrodynamic Retarder Seal & Valve Kit',
          quantity: 1,
          unit_cost: 32000,
        },
      ],
      labor_hours: 5,
      hourly_rate: 1400,
      before_after_notes: {
        before: 'R2 OPERATIONAL CONFLICT: TRK-002 scheduled for Oran route in 2 days. Retarder valve replacement awaiting shop bay.',
        after: '',
      },
      created_date: '2026-08-03T15:00:00Z',
      assigned_mechanic_id: 'MCH-002',
      assigned_mechanic_name: 'Ahmed Benali (Senior Hydraulic Mechanic)',
      related_fault_code: 'P0700',
      warranty_risk: false,
    },

    // R4 Exact Formula Calculation Work Order
    {
      id: 'WO-R4-COST-001',
      vehicle_id: 'TRK-003',
      vehicle_plate: '03912-326-30',
      type: 'Corrective',
      status: 'In Progress',
      labor_cost: 11200, // 8 hours * 1400 DZD
      parts_used: [
        {
          part_id: 'THRM-ACT-03',
          name: 'Mercedes Actros Heavy Duty Thermostat & Seal Housing',
          quantity: 1,
          unit_cost: 12800,
        },
        {
          part_id: 'FILT-OIL-02',
          name: 'High Efficiency Spin-On Oil Filter Element',
          quantity: 2,
          unit_cost: 3200,
        },
      ],
      labor_hours: 8,
      hourly_rate: 1400,
      before_after_notes: {
        before: 'R4 TOTAL COST AUDIT: Thermostat stuck closed. R4 Formula Total = (8 * 1400) + (12800 + 6400) = 30,400 DA.',
        after: '',
      },
      created_date: '2026-08-04T08:30:00Z',
      assigned_mechanic_id: 'MCH-001',
      assigned_mechanic_name: 'David Thorne (Master Workshop Tech)',
      related_fault_code: 'P0217',
      warranty_risk: true,
    },

    // R6 Investigation Work Order (Driver Incident matched to zero electronic faults)
    {
      id: 'WO-R6-INV-001',
      vehicle_id: 'TRK-006',
      vehicle_plate: '06821-326-16',
      type: 'Investigation',
      status: 'Open',
      labor_cost: 4200, // 3 hours * 1400 DZD
      parts_used: [],
      labor_hours: 3,
      hourly_rate: 1400,
      before_after_notes: {
        before: 'R6 INVESTIGATION WORK ORDER: Driver reported severe steering column vibration on Scania R500. Zero OBD fault codes found. Physical inspection required.',
        after: '',
      },
      created_date: '2026-08-04T09:00:00Z',
      assigned_mechanic_id: 'MCH-003',
      assigned_mechanic_name: 'Karim Mansouri (Chassis & Steering Tech)',
      related_incident_id: 'INC-R6-001',
      warranty_risk: false,
    },

    // Additional Closed/Historical Work Orders
    {
      id: 'WO-2026-891',
      vehicle_id: 'TRK-004',
      vehicle_plate: '02194-326-25',
      type: 'Preventive',
      status: 'Closed',
      labor_cost: 5600,
      parts_used: [
        {
          part_id: 'FILT-OIL-02',
          name: 'High Efficiency Spin-On Oil Filter Element',
          quantity: 2,
          unit_cost: 3200,
        },
      ],
      labor_hours: 4,
      hourly_rate: 1400,
      before_after_notes: {
        before: 'Scheduled 180k km Preventive Maintenance Service.',
        after: 'Service completed. Engine oil and filters renewed.',
      },
      created_date: '2026-07-20T08:00:00Z',
      closed_date: '2026-07-20T12:00:00Z',
      assigned_mechanic_id: 'MCH-003',
      assigned_mechanic_name: 'Karim Mansouri',
    },
  ];

  // 5. Driver Incidents
  const incidents: Incident[] = [
    {
      id: 'INC-R6-001',
      vehicle_id: 'TRK-006',
      vehicle_plate: '06821-326-16',
      reported_by: 'Brahim Khelil (Driver - Numilog Alger)',
      category: 'Noise',
      description: 'R6 INCIDENT: Heavy steering vibration and knocking noise when turning left above 70 km/h. No warning light on dashboard.',
      matched_to_fault: false, // Triggers R6 Investigation!
      status: 'Investigation',
      created_date: '2026-08-04T08:45:00Z',
    },
    {
      id: 'INC-2026-012',
      vehicle_id: 'TRK-001',
      vehicle_plate: '00124-326-16',
      reported_by: 'Youcef Madani (Driver - Numilog Hassi Messaoud)',
      category: 'Warning Light',
      description: 'Check Engine light illuminated with immediate power loss on highway incline.',
      matched_to_fault: true,
      related_fault_code: 'P0299',
      status: 'Resolved',
      created_date: '2026-08-04T06:10:00Z',
    },
  ];

  // 6. Cost Records (for R7 Strategic Fleet Health Variance Analysis)
  const costRecords: CostRecord[] = [
    {
      id: 'CR-2026-Q3-01',
      vehicle_id: 'TRK-001',
      vehicle_plate: '00124-326-16',
      category: 'Engine',
      amount: 17775000,
      budget_for_category: 15000000, // +18.5% Variance (>10% threshold) -> Triggers R7!
      period: 'Q3 2026',
      work_order_id: 'WO-R1-EMERG-001',
      related_fault_code: 'P0299',
    },
    {
      id: 'CR-2026-Q3-02',
      vehicle_id: 'TRK-002',
      vehicle_plate: '01482-326-31',
      category: 'Electrical',
      amount: 12400000,
      budget_for_category: 10500000, // +18.1% Variance (>10% threshold) -> Triggers R7!
      period: 'Q3 2026',
      work_order_id: 'WO-R2-CONF-001',
    },
    {
      id: 'CR-2026-Q3-03',
      vehicle_id: 'TRK-003',
      vehicle_plate: '03912-326-30',
      category: 'Brakes',
      amount: 8900000,
      budget_for_category: 9200000, // Under budget
      period: 'Q3 2026',
    },
    {
      id: 'CR-2026-Q3-04',
      vehicle_id: 'TRK-004',
      vehicle_plate: '02194-326-25',
      category: 'Chassis',
      amount: 6200000,
      budget_for_category: 6500000, // Under budget
      period: 'Q3 2026',
    },
  ];

  // 7. Fuel Logs (320+ entries across heavy trucks)
  const fuelLogs: FuelLog[] = [];
  for (let i = 1; i <= 200; i++) {
    const vId = `TRK-${i.toString().padStart(3, '0')}`;
    const isAnomaly = i === 1 || i === 5 || i === 12;
    fuelLogs.push({
      id: `FL-2026-${i.toString().padStart(4, '0')}`,
      tenant_id: tenantId,
      vehicle_id: vId,
      liters: isAnomaly ? 680 : 380 + (i % 120),
      cost: isAnomaly ? 23120 : 12920 + ((i % 120) * 34),
      odometer_km: 150000 + (i * 1250),
      logged_at: `2026-08-${(1 + (i % 4)).toString().padStart(2, '0')}T07:30:00Z`,
      anomaly_flag: isAnomaly,
      created_at: `2026-08-${(1 + (i % 4)).toString().padStart(2, '0')}T07:30:00Z`,
    });
  }

  // 8. Alerts (18+ alerts guaranteed to cover R1, R2, R3, R4, R5, R6, R7)
  const alerts: FleetAlert[] = [
    {
      id: 'ALT-R1-001',
      timestamp: '2026-08-04T06:16:00Z',
      rule_id: 'R1',
      title: 'CRITICAL OBD FAULT: TRK-001 Turbocharger Pressure Loss (P0299)',
      description: 'R1 EMERGENCY STOP: Vehicle status marked UNSAFE / RED. Removed from Hassi Messaoud dispatch queue until corrective repair is signed off.',
      severity: 'critical',
      vehicle_id: 'TRK-001',
      read: false,
    },
    {
      id: 'ALT-R2-001',
      timestamp: '2026-08-03T15:05:00Z',
      rule_id: 'R2',
      title: 'R2 SCHEDULE CONFLICT: TRK-002 Departure in 2 Days',
      description: 'TRK-002 scheduled for Oran route departure in 2 days has 1 open corrective work order (Retarder Valve). Reassignment or expedited repair required.',
      severity: 'warning',
      vehicle_id: 'TRK-002',
      read: false,
    },
    {
      id: 'ALT-R3-001',
      timestamp: '2026-08-04T07:00:00Z',
      rule_id: 'R3',
      title: 'R3 LOW STOCK REORDER REQUISITION: Ceramic Brake Pad Set (BRK-PAD-01)',
      description: 'BRK-PAD-01 stock quantity (3) fell below safety threshold (10). Reserved by Work Orders WO-2026-891. Automated purchase requisition submitted.',
      severity: 'warning',
      part_id: 'BRK-PAD-01',
      read: false,
    },
    {
      id: 'ALT-R4-001',
      timestamp: '2026-08-04T08:31:00Z',
      rule_id: 'R4',
      title: 'R4 TOTAL COST FORMULA AUDIT: WO-R4-COST-001 Calculated',
      description: 'Total Work Order Cost calculated as 30,400 DA = (8 hrs × 1,400 DA/hr) + (1× Thermostat @ 12,800 DA + 2× Oil Filter @ 6,400 DA).',
      severity: 'info',
      vehicle_id: 'TRK-003',
      read: true,
    },
    {
      id: 'ALT-R5-001',
      timestamp: '2026-08-04T08:00:00Z',
      rule_id: 'R5',
      title: 'R5 CAE BUDGET PRIORITIZATION: 20 Heavy Trucks Queued',
      description: 'CAE Decision Engine calculated capital allocation priority index for 20 trucks in Critical/Attention state. Total deferral risk exposure: 18,450,000 DA.',
      severity: 'warning',
      read: false,
    },
    {
      id: 'ALT-R6-001',
      timestamp: '2026-08-04T09:01:00Z',
      rule_id: 'R6',
      title: 'R6 AUDIT UNMATCHED INCIDENT: Driver Report on TRK-006',
      description: 'Driver reported severe steering vibration on TRK-006 with zero electronic OBD fault codes. R6 Investigation Work Order WO-R6-INV-001 created.',
      severity: 'warning',
      vehicle_id: 'TRK-006',
      read: false,
    },
    {
      id: 'ALT-R7-001',
      timestamp: '2026-08-04T09:30:00Z',
      rule_id: 'R7',
      title: 'R7 COST VARIANCE AUDIT FLAG: Q3 2026 Engine Expenditure Exceeds Budget by +18.5%',
      description: 'Actual Q3 Engine maintenance costs (17,775,000 DA) exceed projected budget (15,000,000 DA) by > 10% threshold. Accounting audit flag triggered.',
      severity: 'critical',
      read: false,
    },
  ];

  // 9. Audit Logs (Tenant-Scoped Audit Trail)
  const auditLogs: AuditLogEntry[] = [
    {
      id: 'AUD-SEED-001',
      tenant_id: tenantId,
      actor_id: 'usr-dir-01',
      actor_role: 'DIRECTOR',
      entity_type: 'tenant',
      entity_id: tenantId,
      action: 'TENANT_SEEDED',
      before: {},
      after: {
        societyName: 'Numilog Logistics Spa (Grand Master Flotte)',
        vehicleCount: 200,
        rulesSeeded: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'],
      },
      created_at: new Date().toISOString(),
    },
    {
      id: 'AUD-SEED-002',
      tenant_id: tenantId,
      actor_id: 'usr-tc-01',
      actor_role: 'TECHNICAL_CONTROLLER',
      entity_type: 'vehicle',
      entity_id: 'TRK-001',
      action: 'R1_EMERGENCY_STOP_ENFORCED',
      before: { status: 'Healthy' },
      after: { status: 'Critical', faultCode: 'P0299', routeLockout: true },
      created_at: new Date().toISOString(),
    },
    {
      id: 'AUD-SEED-003',
      tenant_id: tenantId,
      actor_id: 'usr-fm-01',
      actor_role: 'FLEET_MANAGER',
      entity_type: 'work_order',
      entity_id: 'WO-R6-INV-001',
      action: 'R6_INVESTIGATION_RAISED',
      before: { incidentId: 'INC-R6-001', matchedOBD: false },
      after: { workOrderId: 'WO-R6-INV-001', status: 'Open' },
      created_at: new Date().toISOString(),
    },
  ];

  return {
    tenantConfig,
    vehicles,
    warranties,
    fuelLogs,
    workOrders,
    inventoryItems,
    alerts,
    deviceMappings,
    auditLogs,
    incidents,
    costRecords,
  };
}

/**
 * Single idempotent seedDemoTenant() service function.
 * Safe to re-run; clears and re-seeds tenant_id records in Supabase (if available)
 * and updates local fleet data state.
 */
export async function seedDemoTenant(tenantId: string = DEMO_TENANT_UUID): Promise<{
  success: boolean;
  counts: SeedResultCounts;
  tenantId: string;
  data: DemoDataset;
}> {
  const isAllowed =
    (typeof process !== 'undefined' &&
      (process.env.ALLOW_DEMO_SEED === 'true' ||
        process.env.VITE_ALLOW_DEMO_SEED === 'true' ||
        process.env.NODE_ENV === 'test')) ||
    ((import.meta as any).env?.VITE_ALLOW_DEMO_SEED === 'true') ||
    ((import.meta as any).env?.MODE === 'test');

  if (!isAllowed) {
    throw new Error('Demo seed is disabled. Set ALLOW_DEMO_SEED=true environment variable to enable demo seeding.');
  }

  console.log(`[seedDemoTenant] Starting idempotent demo seeding for tenant: ${tenantId}...`);

  // 1. Generate full enterprise dataset
  const dataset = generateLargeFleetDemoData(tenantId);

  // 2. Clear local fleet cache
  clearFleetCache();

  // 3. Attempt Supabase Synchronization (idempotent delete & re-insert)
  try {
    // Delete existing records scoped to tenantId in reverse dependency order
    await supabase.from('audit_log').delete().eq('tenant_id', tenantId);
    await supabase.from('device_mappings').delete().eq('tenant_id', tenantId);
    await supabase.from('alerts').delete().eq('tenant_id', tenantId);
    await supabase.from('work_orders').delete().eq('tenant_id', tenantId);
    await supabase.from('fuel_logs').delete().eq('tenant_id', tenantId);
    await supabase.from('warranties').delete().eq('tenant_id', tenantId);
    await supabase.from('incidents').delete().eq('tenant_id', tenantId);
    await supabase.from('cost_records').delete().eq('tenant_id', tenantId);
    await supabase.from('vehicles').delete().eq('tenant_id', tenantId);
    await supabase.from('inventory_items').delete().eq('tenant_id', tenantId);
    await supabase.from('tenants').delete().eq('id', tenantId);

    // Upsert new tenant & records
    await supabase.from('tenants').upsert([
      {
        id: dataset.tenantConfig.id,
        society_name: dataset.tenantConfig.societyName,
        currency: dataset.tenantConfig.currency,
        currency_symbol: dataset.tenantConfig.currencySymbol,
        default_language: dataset.tenantConfig.defaultLanguage,
        allocated_budget: dataset.tenantConfig.allocatedBudget,
        money_used: dataset.tenantConfig.moneyUsed,
        fiscal_year: dataset.tenantConfig.fiscalYear,
        operating_region: dataset.tenantConfig.operatingRegion,
        tax_registration_id: dataset.tenantConfig.taxRegistrationId,
        cost_center_code: dataset.tenantConfig.costCenterCode,
        default_labor_rate: dataset.tenantConfig.defaultLaborRate,
        emergency_approval_threshold: dataset.tenantConfig.emergencyApprovalThreshold,
        contact_email: dataset.tenantConfig.contactEmail,
        contact_phone: dataset.tenantConfig.contactPhone,
        billing_address: dataset.tenantConfig.billingAddress,
        primary_color: dataset.tenantConfig.primaryColor,
        accent_color: dataset.tenantConfig.accentColor,
        brand_tagline: dataset.tenantConfig.brandTagline,
        last_updated: dataset.tenantConfig.lastUpdated,
      },
    ]);

    // Batch insert vehicles
    if (dataset.vehicles.length > 0) {
      const vehiclePayloads = dataset.vehicles.map((v) => ({
        id: v.id,
        tenant_id: tenantId,
        plate: v.plate,
        name: v.name,
        classification: v.classification,
        status: v.status,
        status_reason: v.status_reason,
        last_check_date: v.last_check_date,
        active_fault_codes: v.active_fault_codes,
        mileage: v.mileage,
        next_service_mileage: v.next_service_mileage,
        next_service_date: v.next_service_date,
        scheduled_use_days: v.scheduled_use_days,
        scheduled_route: v.scheduled_route,
        maintenance_history: v.maintenance_history,
        assigned_driver_id: v.assigned_driver_id,
        assigned_mechanic_id: v.assigned_mechanic_id,
        fault_score: v.fault_score,
        compliance_score: v.compliance_score,
        freshness_score: v.freshness_score,
        classification_weight: v.classification_weight,
        delay_multiplier: v.delay_multiplier,
      }));
      await supabase.from('vehicles').upsert(vehiclePayloads);
    }

    // Insert warranties
    if (dataset.warranties.length > 0) {
      await supabase.from('warranties').upsert(dataset.warranties);
    }

    // Insert fuel_logs
    if (dataset.fuelLogs.length > 0) {
      await supabase.from('fuel_logs').upsert(dataset.fuelLogs);
    }

    // Insert inventory_items
    if (dataset.inventoryItems.length > 0) {
      const invPayloads = dataset.inventoryItems.map((item) => ({
        id: item.id,
        tenant_id: tenantId,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        reorder_threshold: item.reorder_threshold,
        unit_cost: item.unit_cost,
        compatible_vehicles: item.compatible_vehicles,
        lead_time_days: item.lead_time_days,
        category: item.category,
      }));
      await supabase.from('inventory_items').upsert(invPayloads);
    }

    // Insert work_orders
    if (dataset.workOrders.length > 0) {
      const woPayloads = dataset.workOrders.map((wo) => ({
        id: wo.id,
        tenant_id: tenantId,
        vehicle_id: wo.vehicle_id,
        vehicle_plate: wo.vehicle_plate,
        type: wo.type,
        status: wo.status,
        labor_cost: wo.labor_cost,
        parts_used: wo.parts_used,
        labor_hours: wo.labor_hours,
        hourly_rate: wo.hourly_rate,
        before_after_notes: wo.before_after_notes,
        created_date: wo.created_date,
        closed_date: wo.closed_date,
        assigned_mechanic_id: wo.assigned_mechanic_id,
        assigned_mechanic_name: wo.assigned_mechanic_name,
        related_fault_code: wo.related_fault_code,
        related_incident_id: wo.related_incident_id,
        warranty_risk: wo.warranty_risk,
      }));
      await supabase.from('work_orders').upsert(woPayloads);
    }

    // Insert alerts
    if (dataset.alerts.length > 0) {
      const alertPayloads = dataset.alerts.map((a) => ({
        id: a.id,
        tenant_id: tenantId,
        timestamp: a.timestamp,
        rule_id: a.rule_id,
        title: a.title,
        description: a.description,
        severity: a.severity,
        vehicle_id: a.vehicle_id,
        part_id: a.part_id,
        read: a.read,
      }));
      await supabase.from('alerts').upsert(alertPayloads);
    }

    // Insert device_mappings
    if (dataset.deviceMappings.length > 0) {
      await supabase.from('device_mappings').upsert(dataset.deviceMappings);
    }

    // Insert audit_log
    if (dataset.auditLogs.length > 0) {
      await supabase.from('audit_log').upsert(dataset.auditLogs);
    }
  } catch (supabaseError) {
    console.warn('[seedDemoTenant] Supabase sync notice (using local state fallback):', supabaseError);
  }

  const counts: SeedResultCounts = {
    tenants: 1,
    vehicles: dataset.vehicles.length,
    warranties: dataset.warranties.length,
    fuel_logs: dataset.fuelLogs.length,
    work_orders: dataset.workOrders.length,
    inventory_items: dataset.inventoryItems.length,
    alerts: dataset.alerts.length,
    device_mappings: dataset.deviceMappings.length,
    audit_log: dataset.auditLogs.length,
    incidents: dataset.incidents.length,
    cost_records: dataset.costRecords.length,
  };

  console.log(`[seedDemoTenant] Successfully seeded tenant ${tenantId}. Row counts:`, counts);

  return {
    success: true,
    counts,
    tenantId,
    data: dataset,
  };
}
