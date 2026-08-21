-- =========================================================
-- CONTROL ROOM 3C-04: CONSOLIDATED VEHICLE POSITION
-- =========================================================
--
-- The live map (src/components/vehicle/FleetMap.tsx, src/components/screens/control-room/
-- LiveMapBoard.tsx) was generating vehicle coordinates procedurally (sin/cos around Algiers) instead
-- of reading anything real. The real GPS ingestion pipeline already exists and is wired end-to-end
-- (see src/services/telemetry/TelemetryIngestionService.ts) and already writes each event's
-- payload->position->{latitude,longitude,heading,...} into telemetry_events -- but nothing
-- aggregates that into a per-vehicle "current position". A prior migration
-- (20260817000000_telemetry_canonical_events_and_idempotency.sql:174-175) deliberately deprecated a
-- separate `positions` table in favor of this single unified log, so this adds a *view* over it
-- rather than a redundant vehicles.latitude/longitude column -- consolidation without a second
-- source of truth.

-- Supports the DISTINCT ON (vehicle_id) ... ORDER BY vehicle_id, event_timestamp DESC pattern below.
CREATE INDEX IF NOT EXISTS idx_telemetry_events_vehicle_latest
  ON public.telemetry_events (vehicle_id, event_timestamp DESC);

CREATE OR REPLACE VIEW public.vehicle_latest_position AS
SELECT DISTINCT ON (vehicle_id)
  vehicle_id,
  tenant_id,
  (payload -> 'position' ->> 'latitude')::double precision AS latitude,
  (payload -> 'position' ->> 'longitude')::double precision AS longitude,
  (payload -> 'position' ->> 'heading')::double precision AS heading,
  (payload -> 'position' ->> 'speed')::double precision AS speed,
  event_timestamp AS recorded_at
FROM public.telemetry_events
WHERE payload -> 'position' ->> 'latitude' IS NOT NULL
  AND payload -> 'position' ->> 'longitude' IS NOT NULL
ORDER BY vehicle_id, event_timestamp DESC;

-- Plain (non-materialized) view: runs with the invoker's own privileges, so RLS on the underlying
-- telemetry_events table still applies per-querying-user -- tenant isolation is inherited, not
-- reimplemented. Only the view itself needs an explicit grant to be reachable at all (see
-- 20260826000000_baseline_table_grants.sql for why that grant can no longer be assumed implicit).
GRANT SELECT ON public.vehicle_latest_position TO authenticated;

-- =========================================================
-- Demo data: 3 static, honestly-labeled positions (provider = 'demo') for the 3 seeded demo
-- vehicles, refreshed to "now" on every reset_demo_tenant_data() call so the wallboard shows live-
-- looking data in demos. This is real data flowing through the real view above, not a second fake
-- coordinate generator -- the distinction the sin/cos code this migration replaces got wrong.
-- =========================================================

DELETE FROM public.demo_seed_snapshot WHERE table_name = 'telemetry_events';

INSERT INTO public.demo_seed_snapshot (table_name, snapshot_data) VALUES
('telemetry_events', '[
  {
    "event_id": "demo-seed-position-001",
    "vehicle_id": "a0a80101-0000-0000-0000-000000000001",
    "external_device_id": "DEMO-DEVICE-001",
    "latitude": 36.7538,
    "longitude": 3.0588,
    "heading": 45
  },
  {
    "event_id": "demo-seed-position-002",
    "vehicle_id": "a0a80101-0000-0000-0000-000000000002",
    "external_device_id": "DEMO-DEVICE-002",
    "latitude": 36.7509,
    "longitude": 5.0567,
    "heading": 120
  },
  {
    "event_id": "demo-seed-position-003",
    "vehicle_id": "a0a80101-0000-0000-0000-000000000003",
    "external_device_id": "DEMO-DEVICE-003",
    "latitude": 35.6969,
    "longitude": -0.6331,
    "heading": 200
  }
]'::jsonb);

-- Re-declare reset_demo_tenant_data() with the same body as
-- 20260807000000_demo_tenant_and_anonymous_rls.sql plus a telemetry_events purge/reinject step.
-- CREATE OR REPLACE is safe to re-run from a later migration (unlike editing an already-applied
-- migration's DML in place); this is the current, complete definition of the function.
CREATE OR REPLACE FUNCTION public.reset_demo_tenant_data()
RETURNS VOID AS $$
DECLARE
    DEMO_TENANT_ID CONSTANT UUID := 'c0a80101-0000-0000-0000-000000000001'::uuid;
    rec RECORD;
BEGIN
    DELETE FROM public.telemetry_events WHERE tenant_id = DEMO_TENANT_ID;
    DELETE FROM public.fleet_alerts WHERE tenant_id = DEMO_TENANT_ID;
    DELETE FROM public.work_orders WHERE tenant_id = DEMO_TENANT_ID;
    DELETE FROM public.driver_incidents WHERE tenant_id = DEMO_TENANT_ID;
    DELETE FROM public.fuel_logs WHERE tenant_id = DEMO_TENANT_ID;
    DELETE FROM public.warranties WHERE tenant_id = DEMO_TENANT_ID;
    DELETE FROM public.vehicles WHERE tenant_id = DEMO_TENANT_ID;

    -- Re-inject Vehicles from Snapshot
    FOR rec IN SELECT jsonb_array_elements(snapshot_data) AS elem FROM public.demo_seed_snapshot WHERE table_name = 'vehicles' LOOP
        INSERT INTO public.vehicles (
            id, tenant_id, plate, name, classification, status, status_reason, mileage, next_service_mileage, scheduled_use_days, scheduled_route, fault_score, compliance_score, active_fault_codes
        ) VALUES (
            (rec.elem->>'id')::uuid,
            DEMO_TENANT_ID,
            rec.elem->>'plate',
            rec.elem->>'name',
            COALESCE(rec.elem->>'classification', 'Standard'),
            COALESCE(rec.elem->>'status', 'Healthy'),
            COALESCE(rec.elem->>'status_reason', 'Nominal operation'),
            COALESCE((rec.elem->>'mileage')::int, 100000),
            COALESCE((rec.elem->>'next_service_mileage')::int, 110000),
            COALESCE((rec.elem->>'scheduled_use_days')::int, 7),
            rec.elem->>'scheduled_route',
            COALESCE((rec.elem->>'fault_score')::int, 100),
            COALESCE((rec.elem->>'compliance_score')::int, 100),
            COALESCE(rec.elem->'active_fault_codes', '[]'::jsonb)
        );
    END LOOP;

    -- Re-inject Warranties from Snapshot
    FOR rec IN SELECT jsonb_array_elements(snapshot_data) AS elem FROM public.demo_seed_snapshot WHERE table_name = 'warranties' LOOP
        INSERT INTO public.warranties (
            id, vehicle_id, tenant_id, manufacturer, status, expiry_date, expiry_mileage, covered_systems
        ) VALUES (
            (rec.elem->>'id')::uuid,
            (rec.elem->>'vehicle_id')::uuid,
            DEMO_TENANT_ID,
            rec.elem->>'manufacturer',
            COALESCE(rec.elem->>'status', 'active'),
            (rec.elem->>'expiry_date')::timestamptz,
            (rec.elem->>'expiry_mileage')::int,
            ARRAY(SELECT jsonb_array_elements_text(COALESCE(rec.elem->'covered_systems', '[]'::jsonb)))::text[]
        );
    END LOOP;

    -- Re-inject Fuel Logs from Snapshot
    FOR rec IN SELECT jsonb_array_elements(snapshot_data) AS elem FROM public.demo_seed_snapshot WHERE table_name = 'fuel_logs' LOOP
        INSERT INTO public.fuel_logs (
            id, vehicle_id, tenant_id, liters, cost, odometer, date, route_id, anomaly_flag
        ) VALUES (
            (rec.elem->>'id')::uuid,
            (rec.elem->>'vehicle_id')::uuid,
            DEMO_TENANT_ID,
            (rec.elem->>'liters')::decimal,
            (rec.elem->>'cost')::decimal,
            (rec.elem->>'odometer')::int,
            COALESCE((rec.elem->>'date')::timestamptz, NOW()),
            rec.elem->>'route_id',
            COALESCE((rec.elem->>'anomaly_flag')::boolean, false)
        );
    END LOOP;

    -- Re-inject Telemetry (vehicle positions) from Snapshot, timestamped "now" so the live map
    -- shows fresh-looking data regardless of when the demo tenant was last reset.
    FOR rec IN SELECT jsonb_array_elements(snapshot_data) AS elem FROM public.demo_seed_snapshot WHERE table_name = 'telemetry_events' LOOP
        INSERT INTO public.telemetry_events (
            event_id, tenant_id, vehicle_id, provider, external_device_id, event_timestamp, payload
        ) VALUES (
            rec.elem->>'event_id',
            DEMO_TENANT_ID,
            (rec.elem->>'vehicle_id')::uuid,
            'demo',
            rec.elem->>'external_device_id',
            NOW(),
            jsonb_build_object(
                'position', jsonb_build_object(
                    'latitude', (rec.elem->>'latitude')::double precision,
                    'longitude', (rec.elem->>'longitude')::double precision,
                    'heading', (rec.elem->>'heading')::double precision
                )
            )
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
