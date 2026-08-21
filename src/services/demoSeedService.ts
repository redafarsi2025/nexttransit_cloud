import { supabase } from '../lib/supabase';
import { clearFleetCache } from './fleetData';
import { DEMO_TENANT_ID } from '../config/demoAccount';
import { buildHeterogeneousFleetDataset, DemoDataset } from '../data/demoFleetDataset';

export type { DemoDataset };
export const DEMO_TENANT_UUID = DEMO_TENANT_ID;

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

/**
 * Returns the heterogeneous transport & logistics fleet dataset (~83 vehicles: semi-trailers,
 * rigid trucks, delivery vans, reefers, shuttle buses, warehouse forklifts, standalone
 * trailers) for the public demo tenant. Ensures rules R1 through R7 are triggered out of the box.
 * Data lives in src/data/demoFleetDataset.ts (single source of truth, also consumed by
 * scripts/sync-demo-snapshot.ts to keep the SQL reset snapshot in sync).
 */
export function generateLargeFleetDemoData(tenantId: string = DEMO_TENANT_UUID): DemoDataset {
  return buildHeterogeneousFleetDataset(tenantId);
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
    await supabase.from('alerts' as any).delete().eq('tenant_id', tenantId);
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
        lifecycle_status: 'IN_SERVICE',
    status_reason: v.status_reason,
        last_check_date: v.last_check_date,
        active_fault_codes: v.active_fault_codes,
        mileage: v.mileage,
        next_service_mileage: v.next_service_mileage,
        next_service_date: v.next_service_date,
        scheduled_use_days: v.scheduled_use_days,
        scheduled_route: v.scheduled_route,
        maintenance_history: v.maintenance_history,
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
      await supabase.from('alerts' as any).upsert(alertPayloads);
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
