-- =========================================================
-- NEXTTRANSIT DEMO TENANT & ANONYMOUS RLS ISOLATION MIGRATION
-- Migration: 20260807000000_demo_tenant_and_anonymous_rls.sql
-- =========================================================

-- 1. Schema Extensions on tenants table
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS slug VARCHAR(128);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Ensure slug constraint / index
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants (slug) WHERE slug IS NOT NULL;

-- 2. Upsert Demo Tenant
INSERT INTO public.tenants (id, name, currency, is_demo, slug, onboarding_completed_at)
VALUES (
    'c0a80101-0000-0000-0000-000000000001'::uuid,
    'Numilog Flotte Démo Algérie',
    'DZD (DA)',
    TRUE,
    'demo',
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    currency = EXCLUDED.currency,
    is_demo = TRUE,
    slug = 'demo',
    onboarding_completed_at = NOW();

-- 3. Demo Seed Snapshot Table for Atomic In-Transaction Reset
CREATE TABLE IF NOT EXISTS public.demo_seed_snapshot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(64) NOT NULL,
    snapshot_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reset snapshot table for clean seed population
DELETE FROM public.demo_seed_snapshot WHERE table_name IN (
    'vehicles', 'warranties', 'fuel_logs', 'work_orders', 'inventory_items', 'fleet_alerts', 'driver_incidents', 'cost_records'
);

-- Seed Snapshot Data: Algerian Heavy Commercial Fleet (DZD)
INSERT INTO public.demo_seed_snapshot (table_name, snapshot_data) VALUES
('vehicles', '[
  {
    "id": "v0a80101-0000-0000-0000-000000000001",
    "tenant_id": "c0a80101-0000-0000-0000-000000000001",
    "plate": "00123-116-16",
    "name": "Renault T480 Keystone frigorifique (Alger Nord)",
    "classification": "Keystone",
    "status": "Healthy",
    "status_reason": "Nominal operational state",
    "mileage": 142500,
    "next_service_mileage": 150000,
    "scheduled_use_days": 7,
    "scheduled_route": "Alger - Oran Express",
    "fault_score": 98,
    "compliance_score": 100,
    "active_fault_codes": []
  },
  {
    "id": "v0a80101-0000-0000-0000-000000000002",
    "tenant_id": "c0a80101-0000-0000-0000-000000000001",
    "plate": "05421-120-06",
    "name": "Volvo FH16 Multi-Temp (Béjaïa Port Logistics)",
    "classification": "Keystone",
    "status": "Critical",
    "status_reason": "Emergency Stop R1: Active OBD Fault P0300 Engine Misfire",
    "mileage": 189000,
    "next_service_mileage": 190000,
    "scheduled_use_days": 1,
    "scheduled_route": "Béjaïa - Sétif Food Cold Chain",
    "fault_score": 42,
    "compliance_score": 60,
    "active_fault_codes": [
      {
        "code": "P0300",
        "name": "Random/Multiple Cylinder Misfire Detected",
        "severity": "Critical",
        "logged_date": "2026-08-07T08:00:00Z",
        "required_intervention": "Replace High-Pressure Fuel Injector Cylinder #3"
      }
    ]
  },
  {
    "id": "v0a80101-0000-0000-0000-000000000003",
    "tenant_id": "c0a80101-0000-0000-0000-000000000001",
    "plate": "12890-119-31",
    "name": "Scania R500 V8 Heavy Haulage (Oran Zone Industrielle)",
    "classification": "Standard",
    "status": "Attention",
    "status_reason": "Rule R2 Conflict: Open Work Order WO-4001 with departure scheduled in 2 days",
    "mileage": 210400,
    "next_service_mileage": 215000,
    "scheduled_use_days": 2,
    "scheduled_route": "Oran - Hassi Messaoud Energy Route",
    "fault_score": 75,
    "compliance_score": 85,
    "active_fault_codes": [
      {
        "code": "P0234",
        "name": "Turbocharger Engine Overboost Condition",
        "severity": "Warning",
        "logged_date": "2026-08-06T14:30:00Z",
        "required_intervention": "Calibrate Wastegate Actuator"
      }
    ]
  }
]'::jsonb),

('warranties', '[
  {
    "id": "w0a80101-0000-0000-0000-000000000001",
    "vehicle_id": "v0a80101-0000-0000-0000-000000000002",
    "tenant_id": "c0a80101-0000-0000-0000-000000000001",
    "provider": "Volvo Trucks Algérie (Constructeur)",
    "status": "Active",
    "expiration_date": "2027-12-31T23:59:59Z",
    "expiration_mileage": 300000,
    "covered_systems": ["Engine", "Transmission", "Cold Storage Refrigeration"]
  }
]'::jsonb),

('fuel_logs', '[
  {
    "id": "f0a80101-0000-0000-0000-000000000001",
    "vehicle_id": "v0a80101-0000-0000-0000-000000000001",
    "tenant_id": "c0a80101-0000-0000-0000-000000000001",
    "liters": 380,
    "cost": 15200.00,
    "odometer": 142500,
    "date": "2026-08-05T10:00:00Z",
    "route_id": "ALG-ORA-01",
    "anomaly_flag": false
  },
  {
    "id": "f0a80101-0000-0000-0000-000000000002",
    "vehicle_id": "v0a80101-0000-0000-0000-000000000002",
    "tenant_id": "c0a80101-0000-0000-0000-000000000001",
    "liters": 520,
    "cost": 23400.00,
    "odometer": 189000,
    "date": "2026-08-06T16:20:00Z",
    "route_id": "BEJ-SET-03",
    "anomaly_flag": true
  }
]'::jsonb);


-- 4. RPC: Atomic Transactional Reset Function with Hardcoded Constant Safeguard
CREATE OR REPLACE FUNCTION public.reset_demo_tenant_data()
RETURNS VOID AS $$
DECLARE
    DEMO_TENANT_ID CONSTANT UUID := 'c0a80101-0000-0000-0000-000000000001'::uuid;
    rec RECORD;
BEGIN
    -- Atomic In-Transaction Purge & Restoration (READ COMMITTED isolation keeps UI smooth)
    -- Delete existing demo records
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
            id, vehicle_id, tenant_id, provider, status, expiration_date, expiration_mileage, covered_systems
        ) VALUES (
            (rec.elem->>'id')::uuid,
            (rec.elem->>'vehicle_id')::uuid,
            DEMO_TENANT_ID,
            rec.elem->>'provider',
            COALESCE(rec.elem->>'status', 'Active'),
            (rec.elem->>'expiration_date')::timestamptz,
            (rec.elem->>'expiration_mileage')::int,
            COALESCE(rec.elem->'covered_systems', '[]'::jsonb)
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- 5. RLS POLICIES AUDIT & ANONYMOUS DEMO SELECT POLICIES
-- Drop any legacy permissive or anonymous policies
DROP POLICY IF EXISTS "Anon Demo Select Vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Anon Demo Select Warranties" ON public.warranties;
DROP POLICY IF EXISTS "Anon Demo Select FuelLogs" ON public.fuel_logs;
DROP POLICY IF EXISTS "Anon Demo Select WorkOrders" ON public.work_orders;
DROP POLICY IF EXISTS "Anon Demo Select FleetAlerts" ON public.fleet_alerts;
DROP POLICY IF EXISTS "Anon Demo Select Inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Anon Demo Select Incidents" ON public.driver_incidents;

-- Create STRICT TO anon SELECT policies scoped ONLY to DEMO_TENANT_ID ('c0a80101-0000-0000-0000-000000000001')
CREATE POLICY "Anon Demo Select Vehicles"
  ON public.vehicles FOR SELECT TO anon
  USING (tenant_id = 'c0a80101-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Anon Demo Select Warranties"
  ON public.warranties FOR SELECT TO anon
  USING (tenant_id = 'c0a80101-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Anon Demo Select FuelLogs"
  ON public.fuel_logs FOR SELECT TO anon
  USING (tenant_id = 'c0a80101-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Anon Demo Select WorkOrders"
  ON public.work_orders FOR SELECT TO anon
  USING (tenant_id = 'c0a80101-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Anon Demo Select FleetAlerts"
  ON public.fleet_alerts FOR SELECT TO anon
  USING (tenant_id = 'c0a80101-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Anon Demo Select Inventory"
  ON public.inventory_items FOR SELECT TO anon
  USING (tenant_id = 'c0a80101-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Anon Demo Select Incidents"
  ON public.driver_incidents FOR SELECT TO anon
  USING (tenant_id = 'c0a80101-0000-0000-0000-000000000001'::uuid);
