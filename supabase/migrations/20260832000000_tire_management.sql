-- =========================================================
-- TIRE MANAGEMENT MODULE
-- =========================================================
--
-- Confirmed entirely absent before this migration: no tires table, no tire columns on
-- vehicles, no API/UI. docs/FLEET_GAP_ANALYSIS.md:20,54-56 already flagged this as MISSING
-- and proposed `tires`/`axle_configs`/`tire_inspections`. This migration builds `tires` +
-- `tire_inspections` (tread-depth history over time, mirroring fuel_logs' role for
-- consumption history) -- `axle_configs` is deliberately not built: a free-text `position`
-- enum on `tires` covers real single- and dual-rear-wheel heavy-truck layouts (this fleet's
-- actual vehicle types -- Renault T480, Volvo FH16, Scania R500) without the added
-- normalization complexity of a separate axle-configuration table that nothing else in this
-- schema uses.

CREATE TABLE IF NOT EXISTS public.tires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT 'c0a80101-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    position VARCHAR(16) NOT NULL DEFAULT 'UNASSIGNED'
        CHECK (position IN ('FL', 'FR', 'RL_OUTER', 'RL_INNER', 'RR_OUTER', 'RR_INNER', 'SPARE', 'UNASSIGNED')),
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    status VARCHAR(24) NOT NULL DEFAULT 'in_service'
        CHECK (status IN ('in_service', 'in_stock', 'retired', 'needs_replacement')),
    install_date DATE,
    install_odometer INT,
    latest_tread_depth_mm NUMERIC(4,1),
    rotation_due_odometer INT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tires_vehicle_id ON public.tires(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_tires_tenant_id ON public.tires(tenant_id);

CREATE TABLE IF NOT EXISTS public.tire_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT 'c0a80101-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    tire_id UUID NOT NULL REFERENCES public.tires(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    inspection_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tread_depth_mm NUMERIC(4,1) NOT NULL,
    pressure_bar NUMERIC(4,2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tire_inspections_tire_id ON public.tire_inspections(tire_id, inspection_date DESC);

-- Keep tires.latest_tread_depth_mm in sync with the most recent inspection, the same way
-- vehicles.mileage etc. are kept current elsewhere -- avoids the app having to compute the
-- "latest" reading client-side on every read.
CREATE OR REPLACE FUNCTION public.sync_tire_latest_tread_depth()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.tires
    SET latest_tread_depth_mm = NEW.tread_depth_mm,
        updated_at = NOW()
    WHERE id = NEW.tire_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_sync_tire_latest_tread_depth ON public.tire_inspections;
CREATE TRIGGER trg_sync_tire_latest_tread_depth
    AFTER INSERT ON public.tire_inspections
    FOR EACH ROW EXECUTE FUNCTION public.sync_tire_latest_tread_depth();

ALTER TABLE public.tires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tire_inspections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation SELECT for tires" ON public.tires;
DROP POLICY IF EXISTS "Tenant Isolation INSERT for tires" ON public.tires;
DROP POLICY IF EXISTS "Tenant Isolation UPDATE for tires" ON public.tires;
DROP POLICY IF EXISTS "Tenant Isolation DELETE for tires" ON public.tires;

CREATE POLICY "Tenant Isolation SELECT for tires" ON public.tires FOR SELECT USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant Isolation INSERT for tires" ON public.tires FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant Isolation UPDATE for tires" ON public.tires FOR UPDATE USING (tenant_id = public.get_current_tenant_id()) WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant Isolation DELETE for tires" ON public.tires FOR DELETE USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "Tenant Isolation SELECT for tire_inspections" ON public.tire_inspections;
DROP POLICY IF EXISTS "Tenant Isolation INSERT for tire_inspections" ON public.tire_inspections;
DROP POLICY IF EXISTS "Tenant Isolation UPDATE for tire_inspections" ON public.tire_inspections;
DROP POLICY IF EXISTS "Tenant Isolation DELETE for tire_inspections" ON public.tire_inspections;

CREATE POLICY "Tenant Isolation SELECT for tire_inspections" ON public.tire_inspections FOR SELECT USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant Isolation INSERT for tire_inspections" ON public.tire_inspections FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant Isolation UPDATE for tire_inspections" ON public.tire_inspections FOR UPDATE USING (tenant_id = public.get_current_tenant_id()) WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant Isolation DELETE for tire_inspections" ON public.tire_inspections FOR DELETE USING (tenant_id = public.get_current_tenant_id());
