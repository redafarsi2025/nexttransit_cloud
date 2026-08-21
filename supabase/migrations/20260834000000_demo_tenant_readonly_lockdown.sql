-- =========================================================
-- DEMO TENANT READ-ONLY LOCKDOWN
-- =========================================================
-- The public live-demo account (src/config/demoAccount.ts) is a REAL Supabase Auth login
-- with publicly-displayed credentials. Existing tenant-isolation RLS policies only check
-- tenant_id match — they do not distinguish the demo tenant from a real one, so an
-- authenticated TENANT_ADMIN session on the demo tenant could otherwise INSERT/UPDATE/DELETE
-- freely, and — because the credentials are public — that's reachable by anyone holding the
-- JWT directly (curl/Postman), bypassing any client-side "local-only" UX guard entirely.
--
-- This migration makes every write to the demo tenant's rows fail at the database level, for
-- every role, with two deliberate exceptions:
--  1. session_user = 'service_role' — the backend provisioning/sync scripts
--     (scripts/seed-demo-account.ts, scripts/sync-demo-snapshot.ts) authenticate this way.
--  2. A session-local flag set by reset_demo_tenant_data() itself for the duration of its own
--     restore transaction. A custom GUC (`nexttransit.*`) is used rather than the built-in
--     session_replication_role: the latter is PGC_SUSET (superuser-only to set in vanilla
--     Postgres) and its privilege level under a specific managed-Postgres plan isn't something
--     this migration can verify without a live DB connection, whereas any session may set a
--     custom GUC — no elevated-privilege assumption required. It also only affects these
--     specific triggers, not any other trigger on the same tables (e.g. tire_inspections'
--     tread-depth sync), which stays correctly wired if that table is ever added to the
--     snapshot rotation.
--
-- Everyday visitor interactions remain fully responsive because the frontend
-- (src/context/FleetContext.tsx) simulates fleet-data mutations in local React state instead
-- of calling the backend for the demo tenant — this trigger is the actual security boundary,
-- the frontend behavior is a UX nicety layered on top of it, not a substitute for it.

CREATE OR REPLACE FUNCTION public.block_demo_tenant_writes()
RETURNS TRIGGER AS $$
DECLARE
    DEMO_TENANT_ID CONSTANT UUID := 'c0a80101-0000-0000-0000-000000000001'::uuid;
    row_tenant_id UUID;
BEGIN
    IF session_user = 'service_role'
       OR current_setting('nexttransit.demo_reset_bypass', true) = 'true' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    row_tenant_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.tenant_id ELSE NEW.tenant_id END;

    IF row_tenant_id = DEMO_TENANT_ID THEN
        RAISE EXCEPTION 'Le tenant de démonstration publique est en lecture seule — les actions y sont simulées côté client et ne sont jamais enregistrées.'
            USING ERRCODE = '42501'; -- insufficient_privilege
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'vehicles', 'warranties', 'fuel_logs', 'work_orders', 'driver_incidents',
        'fleet_alerts', 'inventory_items', 'cost_records', 'tires', 'tire_inspections',
        'pm_schedules'
    ]) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS block_demo_tenant_writes ON public.%I', tbl);
        EXECUTE format(
            'CREATE TRIGGER block_demo_tenant_writes BEFORE INSERT OR UPDATE OR DELETE ON public.%I ' ||
            'FOR EACH ROW EXECUTE FUNCTION public.block_demo_tenant_writes()',
            tbl
        );
    END LOOP;
END;
$$;

-- tenants: guarded by primary key id (a tenant row's own id IS the tenant id).
CREATE OR REPLACE FUNCTION public.block_demo_tenant_row_writes()
RETURNS TRIGGER AS $$
DECLARE
    DEMO_TENANT_ID CONSTANT UUID := 'c0a80101-0000-0000-0000-000000000001'::uuid;
    target_id UUID;
BEGIN
    IF session_user = 'service_role'
       OR current_setting('nexttransit.demo_reset_bypass', true) = 'true' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    target_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;

    IF target_id = DEMO_TENANT_ID THEN
        RAISE EXCEPTION 'Le tenant de démonstration publique est en lecture seule.'
            USING ERRCODE = '42501';
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS block_demo_tenant_row_writes ON public.tenants;
CREATE TRIGGER block_demo_tenant_row_writes BEFORE UPDATE OR DELETE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.block_demo_tenant_row_writes();

-- profiles: guarded by tenant_id column. INSERT is intentionally NOT blocked — the
-- handle_new_user() trigger inserts a tenant_id-less orphan profile for every new Supabase
-- Auth signup, which must keep working for real tenants; NULL tenant_id never equals
-- DEMO_TENANT_ID so real signups are unaffected either way.
CREATE OR REPLACE FUNCTION public.block_demo_tenant_profile_writes()
RETURNS TRIGGER AS $$
DECLARE
    DEMO_TENANT_ID CONSTANT UUID := 'c0a80101-0000-0000-0000-000000000001'::uuid;
BEGIN
    IF session_user = 'service_role'
       OR current_setting('nexttransit.demo_reset_bypass', true) = 'true' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF (CASE WHEN TG_OP = 'DELETE' THEN OLD.tenant_id ELSE NEW.tenant_id END) = DEMO_TENANT_ID THEN
        RAISE EXCEPTION 'Le tenant de démonstration publique est en lecture seule.'
            USING ERRCODE = '42501';
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS block_demo_tenant_profile_writes ON public.profiles;
CREATE TRIGGER block_demo_tenant_profile_writes BEFORE UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.block_demo_tenant_profile_writes();

-- subscriptions: guarded by tenant_id column.
CREATE OR REPLACE FUNCTION public.block_demo_tenant_subscription_writes()
RETURNS TRIGGER AS $$
DECLARE
    DEMO_TENANT_ID CONSTANT UUID := 'c0a80101-0000-0000-0000-000000000001'::uuid;
BEGIN
    IF session_user = 'service_role'
       OR current_setting('nexttransit.demo_reset_bypass', true) = 'true' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF (CASE WHEN TG_OP = 'DELETE' THEN OLD.tenant_id ELSE NEW.tenant_id END) = DEMO_TENANT_ID THEN
        RAISE EXCEPTION 'Le tenant de démonstration publique est en lecture seule.'
            USING ERRCODE = '42501';
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS block_demo_tenant_subscription_writes ON public.subscriptions;
CREATE TRIGGER block_demo_tenant_subscription_writes BEFORE UPDATE OR DELETE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.block_demo_tenant_subscription_writes();

-- reset_demo_tenant_data(): sets the bypass GUC for the duration of its own restore
-- transaction, delegates to the (unchanged) restore body from 20260833000000, then clears it.
-- Wrapped in a BEGIN/EXCEPTION block so the flag is always cleared even if the restore fails
-- partway through, instead of leaking a bypass flag into whatever runs next on this connection.
CREATE OR REPLACE FUNCTION public.reset_demo_tenant_data()
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('nexttransit.demo_reset_bypass', 'true', true);
    PERFORM public.reset_demo_tenant_data_impl();
    PERFORM set_config('nexttransit.demo_reset_bypass', 'false', true);
EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('nexttransit.demo_reset_bypass', 'false', true);
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Restore body, unchanged from 20260833000000_expand_demo_reset_snapshot.sql, moved into a
-- separate _impl function so the wrapper above can set/clear the bypass flag around it.
CREATE OR REPLACE FUNCTION public.reset_demo_tenant_data_impl()
RETURNS VOID AS $$
DECLARE
    DEMO_TENANT_ID CONSTANT UUID := 'c0a80101-0000-0000-0000-000000000001'::uuid;
    rec RECORD;
BEGIN
    DELETE FROM public.telemetry_events WHERE tenant_id = DEMO_TENANT_ID;
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
