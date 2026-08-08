-- Migration: Fuel Logs table and RLS policies
CREATE TABLE IF NOT EXISTS public.fuel_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT 'c0a80101-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    liters NUMERIC(10,2) NOT NULL,
    cost NUMERIC(10,2) NOT NULL,
    odometer_km INT NOT NULL,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    anomaly_flag BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation SELECT for fuel_logs" ON public.fuel_logs;
DROP POLICY IF EXISTS "Tenant Isolation INSERT for fuel_logs" ON public.fuel_logs;
DROP POLICY IF EXISTS "Tenant Isolation UPDATE for fuel_logs" ON public.fuel_logs;
DROP POLICY IF EXISTS "Tenant Isolation DELETE for fuel_logs" ON public.fuel_logs;

CREATE POLICY "Tenant Isolation SELECT for fuel_logs" ON public.fuel_logs FOR SELECT USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant Isolation INSERT for fuel_logs" ON public.fuel_logs FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant Isolation UPDATE for fuel_logs" ON public.fuel_logs FOR UPDATE USING (tenant_id = public.get_current_tenant_id()) WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant Isolation DELETE for fuel_logs" ON public.fuel_logs FOR DELETE USING (tenant_id = public.get_current_tenant_id());
