/**
 * Syncs src/data/demoFleetDataset.ts (the heterogeneous fleet TypeScript dataset) into the
 * `demo_seed_snapshot` table, so that `reset_demo_tenant_data()` (see
 * supabase/migrations/*_expand_demo_reset_and_lockdown.sql) restores exactly what the demo
 * account first seeds. Before this script, the snapshot only held 3 hand-written vehicles,
 * disconnected from the TypeScript generator — a scheduled reset would have quietly served
 * a much smaller/older fleet than what visitors saw on first login.
 *
 * `vehicles.id` (and other entity ids) are real Postgres UUID columns, but the dataset uses
 * readable string ids (e.g. "SR-901") for maintainability. This script deterministically maps
 * each string id to a stable UUID (same input -> same output every run, so FK references
 * between vehicles/warranties/work_orders/etc. stay consistent and reruns are idempotent).
 *
 * Usage: npm run sync:demo-snapshot   (requires SUPABASE_SERVICE_ROLE_KEY in .env)
 */
import { createHash } from 'crypto';
import { supabaseAdmin } from '../src/lib/supabaseAdmin';
import { DEMO_TENANT_ID } from '../src/config/demoAccount';
import { buildHeterogeneousFleetDataset } from '../src/data/demoFleetDataset';

function idToUuid(kind: string, id: string): string {
  const hex = createHash('sha1').update(`${kind}:${id}`).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

async function main() {
  console.log('[sync-demo-snapshot] Building heterogeneous fleet dataset...');
  const dataset = buildHeterogeneousFleetDataset(DEMO_TENANT_ID);

  const vehicleUuid = (id: string) => idToUuid('vehicle', id);
  const inventoryUuid = (id: string) => idToUuid('inventory_item', id);
  const workOrderUuid = (id: string) => idToUuid('work_order', id);
  const incidentUuid = (id: string) => idToUuid('driver_incident', id);

  const vehiclesSnapshot = dataset.vehicles.map((v) => ({
    id: vehicleUuid(v.id),
    plate: v.plate,
    name: v.name,
    classification: v.classification,
    status: v.status,
    status_reason: v.status_reason,
    mileage: v.mileage,
    next_service_mileage: v.next_service_mileage,
    scheduled_use_days: v.scheduled_use_days,
    scheduled_route: v.scheduled_route || null,
    fault_score: v.fault_score,
    compliance_score: v.compliance_score,
    active_fault_codes: v.active_fault_codes,
  }));

  const warrantiesSnapshot = dataset.warranties.map((w) => ({
    id: idToUuid('warranty', w.id || `WRN-${w.vehicle_id}`),
    vehicle_id: vehicleUuid(w.vehicle_id!),
    manufacturer: w.manufacturer,
    status: w.status,
    expiry_date: w.expiry_date,
    expiry_mileage: w.expiry_mileage,
    covered_systems: w.covered_systems,
  }));

  const fuelLogsSnapshot = dataset.fuelLogs.map((f) => ({
    id: idToUuid('fuel_log', f.id),
    vehicle_id: vehicleUuid(f.vehicle_id),
    liters: f.liters,
    cost: f.cost,
    odometer: f.odometer_km,
    date: f.logged_at,
    route_id: f.route_id || null,
    anomaly_flag: f.anomaly_flag,
  }));

  const inventorySnapshot = dataset.inventoryItems.map((item) => ({
    id: inventoryUuid(item.id),
    name: item.name,
    sku: item.sku,
    quantity: item.quantity,
    reorder_threshold: item.reorder_threshold,
    unit_cost: item.unit_cost,
    compatible_vehicles: item.compatible_vehicles,
    lead_time_days: item.lead_time_days,
    category: item.category,
  }));

  const workOrdersSnapshot = dataset.workOrders.map((wo) => ({
    id: workOrderUuid(wo.id),
    vehicle_id: vehicleUuid(wo.vehicle_id),
    vehicle_plate: wo.vehicle_plate,
    type: wo.type,
    status: wo.status,
    labor_hours: wo.labor_hours,
    hourly_rate: wo.hourly_rate,
    labor_cost: wo.labor_cost,
    parts_used: wo.parts_used,
    before_notes: wo.before_after_notes.before,
    after_notes: wo.before_after_notes.after,
    created_date: wo.created_date,
    closed_date: wo.closed_date || null,
    assigned_mechanic_id: wo.assigned_mechanic_id,
    assigned_mechanic_name: wo.assigned_mechanic_name,
    related_fault_code: wo.related_fault_code || null,
    related_incident_id: wo.related_incident_id ? incidentUuid(wo.related_incident_id) : null,
  }));

  const incidentsSnapshot = dataset.incidents.map((inc) => ({
    id: incidentUuid(inc.id),
    vehicle_id: vehicleUuid(inc.vehicle_id),
    vehicle_plate: inc.vehicle_plate,
    reported_by: inc.reported_by,
    category: inc.category,
    description: inc.description,
    matched_to_fault: inc.matched_to_fault,
    related_fault_code: inc.related_fault_code || null,
    status: inc.status,
    created_date: inc.created_date,
  }));

  const alertsSnapshot = dataset.alerts.map((a) => ({
    id: idToUuid('fleet_alert', a.id),
    timestamp: a.timestamp,
    rule_id: a.rule_id,
    title: a.title,
    description: a.description,
    severity: a.severity,
    vehicle_id: a.vehicle_id ? vehicleUuid(a.vehicle_id) : null,
    part_id: a.part_id ? inventoryUuid(a.part_id) : null,
    read: a.read,
  }));

  const costRecordsSnapshot = dataset.costRecords.map((cr) => ({
    id: idToUuid('cost_record', cr.id),
    vehicle_id: vehicleUuid(cr.vehicle_id),
    vehicle_plate: cr.vehicle_plate,
    category: cr.category,
    amount: cr.amount,
    budget_for_category: cr.budget_for_category,
    period: cr.period,
    work_order_id: cr.work_order_id ? workOrderUuid(cr.work_order_id) : null,
    related_fault_code: cr.related_fault_code || null,
  }));

  const rows: { table_name: string; snapshot_data: unknown }[] = [
    { table_name: 'vehicles', snapshot_data: vehiclesSnapshot },
    { table_name: 'warranties', snapshot_data: warrantiesSnapshot },
    { table_name: 'fuel_logs', snapshot_data: fuelLogsSnapshot },
    { table_name: 'inventory_items', snapshot_data: inventorySnapshot },
    { table_name: 'work_orders', snapshot_data: workOrdersSnapshot },
    { table_name: 'driver_incidents', snapshot_data: incidentsSnapshot },
    { table_name: 'fleet_alerts', snapshot_data: alertsSnapshot },
    { table_name: 'cost_records', snapshot_data: costRecordsSnapshot },
  ];

  console.log(`[sync-demo-snapshot] Replacing ${rows.length} snapshot table entries...`);
  const { error: deleteError } = await supabaseAdmin
    .from('demo_seed_snapshot')
    .delete()
    .in('table_name', rows.map((r) => r.table_name));
  if (deleteError) throw new Error(`Failed to clear old snapshot rows: ${deleteError.message}`);

  // This dataset doesn't generate telemetry positions (device_mappings/live-map simulation is
  // out of scope here — see supabase/migrations/20260837000000_fix_demo_reset_device_mappings_fk.sql).
  // Any pre-existing telemetry_events snapshot row references vehicle ids from an older/smaller
  // seed and would FK-violate against this vehicle set — remove it rather than leave it stale.
  const { error: telemetryDeleteError } = await supabaseAdmin
    .from('demo_seed_snapshot')
    .delete()
    .eq('table_name', 'telemetry_events');
  if (telemetryDeleteError) throw new Error(`Failed to clear stale telemetry_events snapshot: ${telemetryDeleteError.message}`);

  const { error: insertError } = await supabaseAdmin.from('demo_seed_snapshot').insert(
    rows.map((r) => ({ table_name: r.table_name, snapshot_data: r.snapshot_data as never }))
  );
  if (insertError) throw new Error(`Failed to insert snapshot rows: ${insertError.message}`);

  console.log('[sync-demo-snapshot] Done. Row counts:', {
    vehicles: vehiclesSnapshot.length,
    warranties: warrantiesSnapshot.length,
    fuel_logs: fuelLogsSnapshot.length,
    inventory_items: inventorySnapshot.length,
    work_orders: workOrdersSnapshot.length,
    driver_incidents: incidentsSnapshot.length,
    fleet_alerts: alertsSnapshot.length,
    cost_records: costRecordsSnapshot.length,
  });
  console.log('[sync-demo-snapshot] Run `select public.reset_demo_tenant_data();` (or wait for the');
  console.log('[sync-demo-snapshot] scheduled cron job) to materialize this snapshot into live tables.');
}

main().catch((err) => {
  console.error('[sync-demo-snapshot] FAILED:', err);
  process.exit(1);
});
