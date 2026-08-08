-- Drop the old one and recreate since we're in early dev
DROP TABLE IF EXISTS public.warranties CASCADE;

CREATE TABLE IF NOT EXISTS public.warranties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT 'c0a80101-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    manufacturer VARCHAR(255) NOT NULL,
    expiry_date TIMESTAMPTZ,
    expiry_mileage INT,
    covered_systems TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expiring_soon', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Isolation SELECT for warranties" ON public.warranties FOR SELECT USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant Isolation INSERT for warranties" ON public.warranties FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant Isolation UPDATE for warranties" ON public.warranties FOR UPDATE USING (tenant_id = public.get_current_tenant_id()) WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant Isolation DELETE for warranties" ON public.warranties FOR DELETE USING (tenant_id = public.get_current_tenant_id());

-- Update work_orders table with warranty_risk
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS warranty_risk BOOLEAN NOT NULL DEFAULT FALSE;

