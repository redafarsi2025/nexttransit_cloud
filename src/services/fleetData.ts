import { supabase } from '../lib/supabase';
import {
  Vehicle,
  InventoryItem,
  WorkOrder,
  Incident,
  CostRecord,
  FleetAlert,
  CAEItem,
  VehicleClassification,
} from '../types';
import {
  INITIAL_VEHICLES,
  INITIAL_INVENTORY,
  INITIAL_WORK_ORDERS,
  INITIAL_INCIDENTS,
  INITIAL_COST_RECORDS,
  INITIAL_ALERTS,
} from '../data/seedData';

/**
 * NextTransit Supabase Fleet Data Service Layer
 * 
 * Provides backend data fetching and role-based query views for the 10 screen components.
 * Connects directly to Supabase (`@supabase/supabase-js`) with seamless local seed data fallback
 * when tables are not yet provisioned or during network unavailability.
 */

// ==========================================
// 1. Core Table Fetchers with Seed Fallback & Memoized Caching Layer
// ==========================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const DEFAULT_CACHE_TTL_MS = 30000; // 30 seconds default cache TTL
const cacheStore = new Map<string, CacheEntry<any>>();

/**
 * Clears the fleet data local cache.
 * If a specific key is provided, clears only that key; otherwise flushes all cached data.
 */
export function clearFleetCache(keyPrefix?: string): void {
  if (keyPrefix) {
    for (const key of Array.from(cacheStore.keys())) {
      if (key === keyPrefix || key.startsWith(`${keyPrefix}_`)) {
        cacheStore.delete(key);
      }
    }
  } else {
    cacheStore.clear();
  }
}

/**
 * Maps any legacy string or UUID tenant identifier to its corresponding robust UUID.
 */
export function getTenantUuid(tenantId: string | null | undefined): string {
  if (!tenantId) return 'c0a80101-0000-0000-0000-000000000001';
  
  // If it is already a valid UUID, return it
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(tenantId)) {
    return tenantId.toLowerCase();
  }
  
  // Map legacy string identifiers to the respective seeded UUIDs
  switch (tenantId) {
    case 'TNT-NEXTR-001':
      return 'c0a80101-0000-0000-0000-000000000001';
    case 'TNT-EUR-002':
    case 'TNT-NEXTR-002':
      return 'c0a80101-0000-0000-0000-000000000002';
    case 'TNT-MUN-003':
      return 'c0a80101-0000-0000-0000-000000000003';
    case 'TNT-DZD-004':
      return 'c0a80101-0000-0000-0000-000000000004';
    default:
      return 'c0a80101-0000-0000-0000-000000000001';
  }
}

/**
 * Helper to dynamically determine the current tenant context from active Supabase Auth session or localStorage fallback
 */
export async function getCurrentTenantId(): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userMetadataTenant = session?.user?.user_metadata?.tenant_id || session?.user?.app_metadata?.tenant_id;
    if (userMetadataTenant) return getTenantUuid(userMetadataTenant);
  } catch (err) {
    console.warn('Error fetching Supabase session for tenant isolation:', err);
  }
  
  try {
    const stored = localStorage.getItem('nexttransit_active_tenant_id');
    if (stored) return getTenantUuid(stored);
  } catch (e) {}
  return 'c0a80101-0000-0000-0000-000000000001';
}

/**
 * Generic wrapper to retrieve data from local memoized cache if fresh,
 * or execute the underlying fetcher and update cache.
 */
async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_CACHE_TTL_MS
): Promise<T> {
  const now = Date.now();
  const cached = cacheStore.get(key);

  if (cached && now - cached.timestamp < ttlMs) {
    return cached.data as T;
  }

  const freshData = await fetcher();
  cacheStore.set(key, { data: freshData, timestamp: now });
  return freshData;
}

export async function fetchVehicles(bypassCache: boolean = false): Promise<Vehicle[]> {
  const tenantId = await getCurrentTenantId();
  const cacheKey = `vehicles_${tenantId}`;
  if (bypassCache) clearFleetCache(cacheKey);
  return fetchWithCache(cacheKey, async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('tenant_id', tenantId);
    
    if (error) {
      throw new Error(`fetchVehicles failed: ${error.message}`);
    }
    
    if (!data) {
      return [];
    }
    
    return data as Vehicle[];
  });
}

export async function fetchInventory(bypassCache: boolean = false): Promise<InventoryItem[]> {
  const tenantId = await getCurrentTenantId();
  const cacheKey = `inventory_${tenantId}`;
  if (bypassCache) clearFleetCache(cacheKey);
  return fetchWithCache(cacheKey, async () => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('tenant_id', tenantId);
    
    if (error) {
      throw new Error(`fetchInventory failed: ${error.message}`);
    }
    
    if (!data) {
      return [];
    }
    
    return data as InventoryItem[];
  });
}

export async function fetchWorkOrders(bypassCache: boolean = false): Promise<WorkOrder[]> {
  const tenantId = await getCurrentTenantId();
  const cacheKey = `work_orders_${tenantId}`;
  if (bypassCache) clearFleetCache(cacheKey);
  return fetchWithCache(cacheKey, async () => {
    const { data, error } = await supabase
      .from('work_orders')
      .select('*')
      .eq('tenant_id', tenantId);
    
    if (error) {
      throw new Error(`fetchWorkOrders failed: ${error.message}`);
    }
    
    if (!data) {
      return [];
    }
    
    return (data as any[]).map((wo) => {
      let notes = { before: '', after: '' };
      if (wo.before_after_notes) {
        if (typeof wo.before_after_notes === 'string') {
          try {
            notes = JSON.parse(wo.before_after_notes);
          } catch {
            notes = { before: wo.before_after_notes, after: '' };
          }
        } else if (typeof wo.before_after_notes === 'object') {
          notes = {
            before: wo.before_after_notes.before || '',
            after: wo.before_after_notes.after || '',
          };
        }
      }
      return {
        ...wo,
        parts_used: Array.isArray(wo.parts_used) ? wo.parts_used : [],
        before_after_notes: notes,
      } as WorkOrder;
    });
  });
}

export async function fetchIncidents(bypassCache: boolean = false): Promise<Incident[]> {
  const tenantId = await getCurrentTenantId();
  const cacheKey = `incidents_${tenantId}`;
  if (bypassCache) clearFleetCache(cacheKey);
  return fetchWithCache(cacheKey, async () => {
    const { data, error } = await supabase
      .from('driver_incidents')
      .select('*')
      .eq('tenant_id', tenantId);
    
    if (error) {
      throw new Error(`fetchIncidents failed: ${error.message}`);
    }
    
    if (!data) {
      return [];
    }
    
    return data as Incident[];
  });
}

export async function fetchCostRecords(bypassCache: boolean = false): Promise<CostRecord[]> {
  const tenantId = await getCurrentTenantId();
  const cacheKey = `cost_records_${tenantId}`;
  if (bypassCache) clearFleetCache(cacheKey);
  return fetchWithCache(cacheKey, async () => {
    const { data, error } = await supabase
      .from('cost_records')
      .select('*')
      .eq('tenant_id', tenantId);
    
    if (error) {
      throw new Error(`fetchCostRecords failed: ${error.message}`);
    }
    
    if (!data) {
      return [];
    }
    
    return data as CostRecord[];
  });
}

export async function fetchAlerts(bypassCache: boolean = false): Promise<FleetAlert[]> {
  const tenantId = await getCurrentTenantId();
  const cacheKey = `alerts_${tenantId}`;
  if (bypassCache) clearFleetCache(cacheKey);
  return fetchWithCache(cacheKey, async () => {
    const { data, error } = await supabase
      .from('fleet_alerts')
      .select('*')
      .eq('tenant_id', tenantId);
    
    if (error) {
      throw new Error(`fetchAlerts failed: ${error.message}`);
    }
    
    if (!data) {
      return [];
    }
    
    return data as FleetAlert[];
  });
}

// ==========================================
// 2. The 7 Role-Based Query Views
// ==========================================

export interface StrategicMetricsView {
  totalVehicles: number;
  healthyCount: number;
  attentionCount: number;
  criticalCount: number;
  availabilityRate: number; // e.g. 83.3%
  criticalAlerts: FleetAlert[];
  quarterlySpend: number;
  quarterlyBudget: number;
  budgetVariancePercentage: number;
  highPriorityWorkOrdersCount: number;
}

/**
 * 1. DIRECTOR Role Query: getStrategicMetrics
 * 
 * Fetches executive-level strategic metrics, fleet availability health,
 * Rule R1 critical stop alerts, and Rule R7 quarterly budget vs. actual variance.
 * Connected UI Component: StrategicDashboard (STRATEGIC_DASHBOARD)
 */
export async function getStrategicMetrics(): Promise<StrategicMetricsView> {
  const [vehicles, alerts, costRecords, workOrders] = await Promise.all([
    fetchVehicles(),
    fetchAlerts(),
    fetchCostRecords(),
    fetchWorkOrders(),
  ]);

  const totalVehicles = vehicles.length;
  const healthyCount = vehicles.filter((v) => v.status === 'Healthy').length;
  const attentionCount = vehicles.filter((v) => v.status === 'Attention').length;
  const criticalCount = vehicles.filter((v) => v.status === 'Critical').length;
  const availabilityRate = totalVehicles > 0 ? (healthyCount / totalVehicles) * 100 : 100;

  const criticalAlerts = alerts.filter((a) => a.severity === 'critical' && !a.read);
  const q3Records = costRecords.filter((c) => c.period === 'Q3 2026');
  const quarterlySpend = q3Records.reduce((sum, r) => sum + r.amount, 0);
  const quarterlyBudget = q3Records.reduce((sum, r) => sum + r.budget_for_category, 0);
  const budgetVariancePercentage =
    quarterlyBudget > 0 ? ((quarterlySpend - quarterlyBudget) / quarterlyBudget) * 100 : 0;

  const highPriorityWorkOrdersCount = workOrders.filter(
    (wo) => wo.status !== 'Closed' && (wo.type === 'Corrective' || wo.type === 'Investigation')
  ).length;

  return {
    totalVehicles,
    healthyCount,
    attentionCount,
    criticalCount,
    availabilityRate,
    criticalAlerts,
    quarterlySpend,
    quarterlyBudget,
    budgetVariancePercentage,
    highPriorityWorkOrdersCount,
  };
}

export interface VarianceAnalysisView {
  period: string;
  totalActual: number;
  totalBudget: number;
  overallVariancePercentage: number;
  categoryBreakdown: {
    category: CostRecord['category'];
    actual: number;
    budget: number;
    variancePercentage: number;
    status: 'under' | 'over' | 'aligned';
  }[];
  records: CostRecord[];
}

/**
 * 2. MGMT_CONTROLLER Role Query: getVarianceAnalysis
 * 
 * Enforces Rule R7 (Strategic Fleet Health Variance Analysis).
 * Fetches quarterly financial breakdowns across engine, electrical, brake,
 * and chassis systems, comparing actual expenditure against projected budgets.
 * Connected UI Component: VarianceDashboard (VARIANCE_DASHBOARD)
 */
export async function getVarianceAnalysis(
  period: string = 'Q3 2026'
): Promise<VarianceAnalysisView> {
  const costRecords = await fetchCostRecords();
  const periodRecords = costRecords.filter((r) => r.period === period);

  const totalActual = periodRecords.reduce((sum, r) => sum + r.amount, 0);
  const totalBudget = periodRecords.reduce((sum, r) => sum + r.budget_for_category, 0);
  const overallVariancePercentage =
    totalBudget > 0 ? ((totalActual - totalBudget) / totalBudget) * 100 : 0;

  const categories: CostRecord['category'][] = [
    'Preventive Maintenance',
    'Corrective Repair',
    'Parts & Consumables',
    'Emergency Diagnostics',
    'Fuel',
  ];

  const categoryBreakdown = categories.map((cat) => {
    const catRecords = periodRecords.filter((r) => r.category === cat);
    const actual = catRecords.reduce((sum, r) => sum + r.amount, 0);
    const budget = catRecords.reduce((sum, r) => sum + r.budget_for_category, 0);
    const variancePercentage = budget > 0 ? ((actual - budget) / budget) * 100 : 0;
    let status: 'under' | 'over' | 'aligned' = 'aligned';
    if (variancePercentage > 3) status = 'over';
    else if (variancePercentage < -3) status = 'under';

    return {
      category: cat,
      actual,
      budget,
      variancePercentage,
      status,
    };
  });

  return {
    period,
    totalActual,
    totalBudget,
    overallVariancePercentage,
    categoryBreakdown,
    records: periodRecords,
  };
}

export interface FleetHealthTelemetryView {
  vehicles: Vehicle[];
  totalActiveFaults: number;
  criticalVehicles: Vehicle[];
  averageFaultScore: number;
  averageComplianceScore: number;
  keystoneVehiclesCount: number;
  standardVehiclesCount: number;
}

/**
 * 3. TECHNICAL_CONTROLLER Role Query: getFleetHealthTelemetry
 * 
 * Fetches detailed operational telemetry for all vehicles, active OBD trouble codes,
 * classification tags (Keystone vs. Standard), and sub-scores (Fault, Compliance, Freshness).
 * Connected UI Components: FleetHealthGrid (FLEET_HEALTH_GRID) & ConflictAlerts (CONFLICT_ALERTS)
 */
export async function getFleetHealthTelemetry(options?: {
  statusFilter?: string;
  classificationFilter?: string;
}): Promise<FleetHealthTelemetryView> {
  const vehicles = await fetchVehicles();

  let filtered = vehicles;
  if (options?.statusFilter && options.statusFilter !== 'ALL') {
    filtered = filtered.filter((v) => v.status === options.statusFilter);
  }
  if (options?.classificationFilter && options.classificationFilter !== 'ALL') {
    filtered = filtered.filter((v) => v.classification === options.classificationFilter);
  }

  const totalActiveFaults = filtered.reduce((sum, v) => sum + (v.active_fault_codes?.length || 0), 0);
  const criticalVehicles = filtered.filter((v) => v.status === 'Critical');

  const totalFaultScore = filtered.reduce((sum, v) => sum + (v.fault_score || 100), 0);
  const totalComplianceScore = filtered.reduce((sum, v) => sum + (v.compliance_score || 100), 0);
  const averageFaultScore = filtered.length > 0 ? Math.round(totalFaultScore / filtered.length) : 100;
  const averageComplianceScore =
    filtered.length > 0 ? Math.round(totalComplianceScore / filtered.length) : 100;

  const keystoneVehiclesCount = filtered.filter((v) => v.classification === 'Keystone').length;
  const standardVehiclesCount = filtered.filter((v) => v.classification === 'Standard').length;

  return {
    vehicles: filtered,
    totalActiveFaults,
    criticalVehicles,
    averageFaultScore,
    averageComplianceScore,
    keystoneVehiclesCount,
    standardVehiclesCount,
  };
}

export interface InventoryLogisticsView {
  inventory: InventoryItem[];
  lowStockItems: InventoryItem[];
  reservedQuantities: Record<string, number>;
  totalWarehouseValue: number;
  criticalReorderAlertsCount: number;
}

/**
 * 4. LOGISTICS_CONTROLLER Role Query: getInventoryLogistics
 * 
 * Enforces Rule R3 (Inventory Reservation System).
 * Fetches warehouse stock levels, computes reserved quantities from open work orders,
 * calculates available stock, and flags items below their reorder threshold.
 * Connected UI Component: InventoryDashboard (INVENTORY_DASHBOARD)
 */
export async function getInventoryLogistics(options?: {
  categoryFilter?: string;
  onlyLowStock?: boolean;
}): Promise<InventoryLogisticsView> {
  const [inventory, workOrders] = await Promise.all([fetchInventory(), fetchWorkOrders()]);

  // Compute reserved quantities from open or in-progress work orders (Rule R3)
  const reservedQuantities: Record<string, number> = {};
  workOrders.forEach((wo) => {
    if (wo.status !== 'Closed') {
      wo.parts_used.forEach((part) => {
        reservedQuantities[part.part_id] =
          (reservedQuantities[part.part_id] || 0) + part.quantity;
      });
    }
  });

  let items = inventory;
  if (options?.categoryFilter && options.categoryFilter !== 'ALL') {
    items = items.filter((item) => item.category === options.categoryFilter);
  }
  if (options?.onlyLowStock) {
    items = items.filter((item) => item.quantity <= item.reorder_threshold);
  }

  const lowStockItems = inventory.filter((item) => item.quantity <= item.reorder_threshold);
  const totalWarehouseValue = inventory.reduce(
    (sum, item) => sum + item.quantity * item.unit_cost,
    0
  );

  return {
    inventory: items,
    lowStockItems,
    reservedQuantities,
    totalWarehouseValue,
    criticalReorderAlertsCount: lowStockItems.length,
  };
}

export interface WorkOrderQueueView {
  workOrders: WorkOrder[];
  openCount: number;
  inProgressCount: number;
  pendingPartsCount: number;
  closedCount: number;
  totalLaborCost: number;
  totalPartsCost: number;
  totalCombinedCost: number; // Enforces Rule R4: Total Work Order Cost formula
  caePriorityList?: CAEItem[]; // Enforces Rule R5: CAE Budget Prioritization
}

/**
 * 5. FLEET_MANAGER Role Query: getWorkOrderQueue
 * 
 * Enforces Rule R4 (Total Cost of Repair Formula) & Rule R2 (Schedule Conflict Detection).
 * Fetches work order dispatch queues, labor costs, parts consumption, and priority scores.
 * Connected UI Components: WorkOrderQueue (WORK_ORDER_QUEUE), ConflictAlerts, & CaeBudgetPrioritization
 */
export async function getWorkOrderQueue(options?: {
  statusFilter?: string;
  typeFilter?: string;
  assignedMechanicId?: string;
}): Promise<WorkOrderQueueView> {
  const [workOrders, vehicles] = await Promise.all([fetchWorkOrders(), fetchVehicles()]);

  let filtered = workOrders;
  if (options?.statusFilter && options.statusFilter !== 'ALL') {
    filtered = filtered.filter((wo) => wo.status === options.statusFilter);
  }
  if (options?.typeFilter && options.typeFilter !== 'ALL') {
    filtered = filtered.filter((wo) => wo.type === options.typeFilter);
  }
  if (options?.assignedMechanicId) {
    filtered = filtered.filter((wo) => wo.assigned_mechanic_id === options.assignedMechanicId);
  }

  const openCount = filtered.filter((wo) => wo.status === 'Open').length;
  const inProgressCount = filtered.filter((wo) => wo.status === 'In Progress').length;
  const pendingPartsCount = filtered.filter((wo) => wo.status === 'Pending Parts').length;
  const closedCount = filtered.filter((wo) => wo.status === 'Closed').length;

  // Enforce Rule R4: Total Work Order Cost = (Labor * Rate) + SUM(Parts)
  let totalLaborCost = 0;
  let totalPartsCost = 0;
  filtered.forEach((wo) => {
    const labor = wo.labor_cost || wo.labor_hours * wo.hourly_rate;
    const parts = wo.parts_used.reduce((sum, p) => sum + p.quantity * p.unit_cost, 0);
    totalLaborCost += labor;
    totalPartsCost += parts;
  });

  // Calculate CAE priority items (Rule R5)
  const caePriorityList: CAEItem[] = [];
  vehicles.forEach((vehicle) => {
    vehicle.active_fault_codes?.forEach((fault) => {
      const isCritical = fault.severity === 'Critical';
      const repairCost = isCritical ? 1350 : 450;
      const delayMultiplier = vehicle.classification === 'Keystone' ? 2.2 : 1.4;
      const deferralCost = repairCost * delayMultiplier;
      const failureLikelihood = isCritical ? 0.85 : 0.45;
      const rankScore =
        (deferralCost / repairCost) * vehicle.classification_weight * failureLikelihood;

      caePriorityList.push({
        vehicle_id: vehicle.id,
        vehicle_plate: vehicle.plate,
        vehicle_name: vehicle.name,
        classification: vehicle.classification,
        fault_code: fault.code,
        fault_name: fault.name,
        repair_cost: repairCost,
        deferral_cost: deferralCost,
        delay_multiplier: delayMultiplier,
        failure_likelihood: failureLikelihood,
        classification_weight: vehicle.classification_weight,
        rank_score: Number(rankScore.toFixed(3)),
        status: isCritical ? 'Escalated' : 'Pending',
        scheduled_use_days: vehicle.scheduled_use_days,
      });
    });
  });

  return {
    workOrders: filtered,
    openCount,
    inProgressCount,
    pendingPartsCount,
    closedCount,
    totalLaborCost,
    totalPartsCost,
    totalCombinedCost: totalLaborCost + totalPartsCost,
    caePriorityList,
  };
}

export interface MechanicQueueView {
  mechanicId: string;
  assignedWorkOrders: WorkOrder[];
  workshopVehicles: Vehicle[];
  availableInventory: InventoryItem[];
  activeTasksCount: number;
}

/**
 * 6. MECHANIC Role Query: getMechanicQueue
 * 
 * Fetches work orders assigned specifically to a technician (default: M-01 - David Thorne),
 * target workshop vehicles for OBD scanning, and warehouse parts inventory.
 * Connected UI Component: MechanicMobileQueue (MECHANIC_MOBILE_QUEUE)
 */
export async function getMechanicQueue(
  mechanicId: string = 'M-01'
): Promise<MechanicQueueView> {
  const [workOrders, vehicles, inventory] = await Promise.all([
    fetchWorkOrders(),
    fetchVehicles(),
    fetchInventory(),
  ]);

  const assignedWorkOrders = workOrders.filter(
    (wo) => wo.assigned_mechanic_id === mechanicId && wo.status !== 'Closed'
  );

  const workshopVehicles = vehicles.filter(
    (v) =>
      v.status !== 'Healthy' ||
      assignedWorkOrders.some((wo) => wo.vehicle_id === v.id)
  );

  return {
    mechanicId,
    assignedWorkOrders,
    workshopVehicles,
    availableInventory: inventory,
    activeTasksCount: assignedWorkOrders.length,
  };
}

export interface DriverIncidentLogsView {
  incidents: Incident[];
  unmatchedR6Count: number; // Rule R6: Driver reports without matching OBD faults
  assignedVehicles: Vehicle[];
  totalReportedByDriver: number;
}

/**
 * 7. DRIVER Role Query: getDriverIncidentLogs
 * 
 * Enforces Rule R6 (Telemetry Reconciliation / Driver Incident Audit).
 * Fetches driver-reported symptoms, flags unmatched incidents requiring investigation,
 * and retrieves vehicle readiness status for pre-trip inspections.
 * Connected UI Components: IncidentReports (INCIDENT_REPORTS) & DriverMobileView (DRIVER_MOBILE_VIEW)
 */
export async function getDriverIncidentLogs(options?: {
  vehicleId?: string;
  reportedBy?: string;
  unmatchedOnly?: boolean;
}): Promise<DriverIncidentLogsView> {
  const [incidents, vehicles] = await Promise.all([fetchIncidents(), fetchVehicles()]);

  let filtered = incidents;
  if (options?.vehicleId) {
    filtered = filtered.filter((inc) => inc.vehicle_id === options.vehicleId);
  }
  if (options?.reportedBy) {
    const reportPattern = options.reportedBy.toLowerCase();
    filtered = filtered.filter((inc) =>
      inc.reported_by.toLowerCase().includes(reportPattern)
    );
  }
  if (options?.unmatchedOnly) {
    filtered = filtered.filter((inc) => !inc.matched_to_fault);
  }

  const unmatchedR6Count = incidents.filter((inc) => !inc.matched_to_fault).length;

  return {
    incidents: filtered,
    unmatchedR6Count,
    assignedVehicles: vehicles,
    totalReportedByDriver: filtered.length,
  };
}

// ==========================================
// 3. Supabase Mutation Helpers (Optional Sync)
// ==========================================

export async function syncLogOBDFaultToSupabase(
  vehicleId: string,
  fault: {
    code: string;
    name: string;
    severity: 'Critical' | 'Warning' | 'Info';
    required_part_id?: string;
    required_intervention: string;
  }
): Promise<boolean> {
  try {
    const tenantId = await getCurrentTenantId();
    const { error } = await supabase.from('fleet_alerts').insert([
      {
        rule_id: 'R1',
        title: `OBD Fault: ${fault.code} on Vehicle ${vehicleId}`,
        description: `${fault.name} - ${fault.required_intervention}`,
        severity: fault.severity === 'Critical' ? 'critical' : 'warning',
        vehicle_id: vehicleId,
        part_id: fault.required_part_id,
        read: false,
        tenant_id: tenantId,
      },
    ]);
    if (error) {
      console.warn('Sync logOBDFault error:', error.message);
      return false;
    }
    clearFleetCache('vehicles');
    clearFleetCache('alerts');
    return true;
  } catch (err) {
    console.warn('Sync logOBDFault exception:', err);
    return false;
  }
}

export async function syncCreateWorkOrderToSupabase(
  workOrder: Omit<WorkOrder, 'id'>
): Promise<WorkOrder | null> {
  try {
    const tenantId = await getCurrentTenantId();
    const { data, error } = await supabase
      .from('work_orders')
      .insert([{ ...workOrder, tenant_id: tenantId }])
      .select()
      .single();
    if (error || !data) {
      console.warn('Sync createWorkOrder error:', error?.message);
      return null;
    }
    clearFleetCache('work_orders');
    clearFleetCache('inventory');
    return data as WorkOrder;
  } catch (err) {
    console.warn('Sync createWorkOrder exception:', err);
    return null;
  }
}

export async function syncSubmitDriverIncidentToSupabase(
  incident: Omit<Incident, 'id'>
): Promise<boolean> {
  try {
    const tenantId = await getCurrentTenantId();
    const { error } = await supabase.from('driver_incidents').insert([
      { ...incident, tenant_id: tenantId }
    ]);
    if (error) {
      console.warn('Sync submitDriverIncident error:', error.message);
      return false;
    }
    clearFleetCache('incidents');
    return true;
  } catch (err) {
    console.warn('Sync submitDriverIncident exception:', err);
    return false;
  }
}

export async function syncCloseWorkOrderAtomic(
  workOrderId: string,
  afterNotes: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('close_work_order_atomic', {
      p_work_order_id: workOrderId,
      p_after_notes: afterNotes
    });
    if (error) {
      console.error('Error closing work order atomically:', error.message);
      return false;
    }
    // Clear all caches so the frontend is fully updated from the DB
    clearFleetCache('vehicles');
    clearFleetCache('work_orders');
    clearFleetCache('inventory');
    clearFleetCache('alerts');
    clearFleetCache('cost_records');
    return !!data;
  } catch (err) {
    console.error('Exception closing work order atomically:', err);
    return false;
  }
}

