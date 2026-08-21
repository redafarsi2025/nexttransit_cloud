-- Fix: reset_demo_tenant_data() failed with a foreign key violation
-- ("device_mappings_vehicle_id_fkey") the first time it ran after this feature's migrations,
-- because device_mappings.vehicle_id is `ON DELETE RESTRICT` (20260816000000) and old demo
-- device mapping rows (from the original 3-vehicle seed) still referenced vehicles the
-- function was trying to delete. Delete device_mappings for the demo tenant before vehicles.
--
-- device_mappings is not re-seeded from a snapshot here: this feature's fleet dataset
-- (src/data/demoFleetDataset.ts) generates provider values ('direct'/'flespi') that don't
-- satisfy this table's provider CHECK constraint (teltonika/flespi_wialon/manual/
-- nexttransit_gateway) — reconciling that is out of scope for the fleet-dossier feature this
-- migration set supports; the demo tenant simply has no device mappings / live telemetry
-- positions after a reset until that's addressed separately.

CREATE OR REPLACE FUNCTION public.reset_demo_tenant_data_impl()
RETURNS VOID AS $$
DECLARE
    DEMO_TENANT_ID CONSTANT UUID := 'c0a80101-0000-0000-0000-000000000001'::uuid;
    rec RECORD;
BEGIN
    DELETE FROM public.telemetry_events WHERE tenant_id = DEMO_TENANT_ID;
    DELETE FROM public.device_mappings WHERE tenant_id = DEMO_TENANT_ID;
    DELETE FROM public.fleet_alerts WHERE tenant_id = DEMO_TENANT_ID;
    DELETE FROM public.cost_records WHERE tenant_id = DEMO_TENANT_ID;
    DELETE FROM public.work_orders WHERE tenant_id = DEMO_TENANT_ID;
    DELETE FROM public.driver_incidents WHERE tenant_id = DEMO_TENANT_ID;
    DELETE FROM public.fuel_logs WHERE tenant_id = DEMO_TENANT_ID;
    DELETE FROM public.warranties WHERE tenant_id = DEMO_TENANT_ID;
    DELETE FROM public.inventory_items WHERE tenant_id = DEMO_TENANT_ID;
    DELETE FROM public.vehicles WHERE tenant_id = DEMO_TENANT_ID;

    FOR rec IN SELECT jsonb_array_elements(snapshot_data) AS elem FROM public.demo_seed_snapshot WHERE table_name = 'vehicles' LOOP
        INSERT INTO public.vehicles (
            id, tenant_id, plate, name, classification, status, status_reason, mileage, next_service_mileage, scheduled_use_days, scheduled_route, fault_score, compliance_score, active_fault_codes
        ) VALUES (
            (rec.elem->>'id')::uuid, DEMO_TENANT_ID, rec.elem->>'plate', rec.elem->>'name',
            COALESCE(rec.elem->>'classification', 'Standard'), COALESCE(rec.elem->>'status', 'Healthy'),
            COALESCE(rec.elem->>'status_reason', 'Nominal operation'), COALESCE((rec.elem->>'mileage')::int, 100000),
            COALESCE((rec.elem->>'next_service_mileage')::int, 110000), COALESCE((rec.elem->>'scheduled_use_days')::int, 7),
            rec.elem->>'scheduled_route', COALESCE((rec.elem->>'fault_score')::int, 100),
            COALESCE((rec.elem->>'compliance_score')::int, 100), COALESCE(rec.elem->'active_fault_codes', '[]'::jsonb)
        );
    END LOOP;

    FOR rec IN SELECT jsonb_array_elements(snapshot_data) AS elem FROM public.demo_seed_snapshot WHERE table_name = 'warranties' LOOP
        INSERT INTO public.warranties (id, vehicle_id, tenant_id, manufacturer, status, expiry_date, expiry_mileage, covered_systems)
        VALUES (
            (rec.elem->>'id')::uuid, (rec.elem->>'vehicle_id')::uuid, DEMO_TENANT_ID, rec.elem->>'manufacturer',
            COALESCE(rec.elem->>'status', 'active'), (rec.elem->>'expiry_date')::timestamptz, (rec.elem->>'expiry_mileage')::int,
            ARRAY(SELECT jsonb_array_elements_text(COALESCE(rec.elem->'covered_systems', '[]'::jsonb)))::text[]
        );
    END LOOP;

    FOR rec IN SELECT jsonb_array_elements(snapshot_data) AS elem FROM public.demo_seed_snapshot WHERE table_name = 'fuel_logs' LOOP
        INSERT INTO public.fuel_logs (id, vehicle_id, tenant_id, liters, cost, odometer, date, route_id, anomaly_flag)
        VALUES (
            (rec.elem->>'id')::uuid, (rec.elem->>'vehicle_id')::uuid, DEMO_TENANT_ID, (rec.elem->>'liters')::decimal,
            (rec.elem->>'cost')::decimal, (rec.elem->>'odometer')::int, COALESCE((rec.elem->>'date')::timestamptz, NOW()),
            rec.elem->>'route_id', COALESCE((rec.elem->>'anomaly_flag')::boolean, false)
        );
    END LOOP;

    FOR rec IN SELECT jsonb_array_elements(snapshot_data) AS elem FROM public.demo_seed_snapshot WHERE table_name = 'inventory_items' LOOP
        INSERT INTO public.inventory_items (id, tenant_id, name, sku, quantity, reorder_threshold, unit_cost, compatible_vehicles, lead_time_days, category)
        VALUES (
            (rec.elem->>'id')::uuid, DEMO_TENANT_ID, rec.elem->>'name', rec.elem->>'sku',
            COALESCE((rec.elem->>'quantity')::int, 0), COALESCE((rec.elem->>'reorder_threshold')::int, 5),
            COALESCE((rec.elem->>'unit_cost')::decimal, 0),
            ARRAY(SELECT jsonb_array_elements_text(COALESCE(rec.elem->'compatible_vehicles', '[]'::jsonb)))::text[],
            COALESCE((rec.elem->>'lead_time_days')::int, 3), COALESCE(rec.elem->>'category', 'General')
        );
    END LOOP;

    FOR rec IN SELECT jsonb_array_elements(snapshot_data) AS elem FROM public.demo_seed_snapshot WHERE table_name = 'driver_incidents' LOOP
        INSERT INTO public.driver_incidents (id, tenant_id, vehicle_id, vehicle_plate, reported_by, category, description, matched_to_fault, related_fault_code, status, created_date)
        VALUES (
            (rec.elem->>'id')::uuid, DEMO_TENANT_ID, (rec.elem->>'vehicle_id')::uuid, rec.elem->>'vehicle_plate',
            rec.elem->>'reported_by', rec.elem->>'category', rec.elem->>'description',
            COALESCE((rec.elem->>'matched_to_fault')::boolean, false), rec.elem->>'related_fault_code',
            COALESCE(rec.elem->>'status', 'Investigation'), COALESCE((rec.elem->>'created_date')::timestamptz, NOW())
        );
    END LOOP;

    FOR rec IN SELECT jsonb_array_elements(snapshot_data) AS elem FROM public.demo_seed_snapshot WHERE table_name = 'work_orders' LOOP
        INSERT INTO public.work_orders (id, tenant_id, vehicle_id, vehicle_plate, type, status, labor_hours, hourly_rate, labor_cost, parts_used, before_notes, after_notes, created_date, closed_date, assigned_mechanic_id, assigned_mechanic_name, related_fault_code, related_incident_id)
        VALUES (
            (rec.elem->>'id')::uuid, DEMO_TENANT_ID, (rec.elem->>'vehicle_id')::uuid, rec.elem->>'vehicle_plate',
            COALESCE(rec.elem->>'type', 'Corrective'), COALESCE(rec.elem->>'status', 'Open'),
            COALESCE((rec.elem->>'labor_hours')::decimal, 0), COALESCE((rec.elem->>'hourly_rate')::decimal, 0),
            COALESCE((rec.elem->>'labor_cost')::decimal, 0), COALESCE(rec.elem->'parts_used', '[]'::jsonb),
            rec.elem->>'before_notes', rec.elem->>'after_notes', COALESCE((rec.elem->>'created_date')::timestamptz, NOW()),
            (rec.elem->>'closed_date')::timestamptz, rec.elem->>'assigned_mechanic_id', rec.elem->>'assigned_mechanic_name',
            rec.elem->>'related_fault_code', (rec.elem->>'related_incident_id')::uuid
        );
    END LOOP;

    FOR rec IN SELECT jsonb_array_elements(snapshot_data) AS elem FROM public.demo_seed_snapshot WHERE table_name = 'fleet_alerts' LOOP
        INSERT INTO public.fleet_alerts (id, tenant_id, timestamp, rule_id, title, description, severity, vehicle_id, part_id, read)
        VALUES (
            (rec.elem->>'id')::uuid, DEMO_TENANT_ID, COALESCE((rec.elem->>'timestamp')::timestamptz, NOW()),
            rec.elem->>'rule_id', rec.elem->>'title', rec.elem->>'description', rec.elem->>'severity',
            (rec.elem->>'vehicle_id')::uuid, (rec.elem->>'part_id')::uuid, COALESCE((rec.elem->>'read')::boolean, false)
        );
    END LOOP;

    FOR rec IN SELECT jsonb_array_elements(snapshot_data) AS elem FROM public.demo_seed_snapshot WHERE table_name = 'cost_records' LOOP
        INSERT INTO public.cost_records (id, tenant_id, vehicle_id, vehicle_plate, category, amount, budget_for_category, period, work_order_id, related_fault_code)
        VALUES (
            (rec.elem->>'id')::uuid, DEMO_TENANT_ID, (rec.elem->>'vehicle_id')::uuid, rec.elem->>'vehicle_plate',
            rec.elem->>'category', COALESCE((rec.elem->>'amount')::decimal, 0), COALESCE((rec.elem->>'budget_for_category')::decimal, 0),
            rec.elem->>'period', (rec.elem->>'work_order_id')::uuid, rec.elem->>'related_fault_code'
        );
    END LOOP;

    FOR rec IN SELECT jsonb_array_elements(snapshot_data) AS elem FROM public.demo_seed_snapshot WHERE table_name = 'telemetry_events' LOOP
        INSERT INTO public.telemetry_events (event_id, tenant_id, vehicle_id, provider, external_device_id, event_timestamp, payload)
        VALUES (
            rec.elem->>'event_id', DEMO_TENANT_ID, (rec.elem->>'vehicle_id')::uuid, 'demo', rec.elem->>'external_device_id', NOW(),
            jsonb_build_object('position', jsonb_build_object(
                'latitude', (rec.elem->>'latitude')::double precision,
                'longitude', (rec.elem->>'longitude')::double precision,
                'heading', (rec.elem->>'heading')::double precision
            ))
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
