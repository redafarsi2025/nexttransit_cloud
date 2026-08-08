-- Migration: Device Mappings table for Vendor-Agnostic Telematics Ingestion Layer
CREATE TABLE IF NOT EXISTS public.device_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT 'c0a80101-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    vehicle_id VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('teltonika', 'flespi_wialon', 'manual')),
    external_device_id VARCHAR(250) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_tenant_vehicle_device_mapping UNIQUE (tenant_id, vehicle_id)
);

ALTER TABLE public.device_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation SELECT for device_mappings" ON public.device_mappings;
DROP POLICY IF EXISTS "Tenant Isolation INSERT for device_mappings" ON public.device_mappings;
DROP POLICY IF EXISTS "Tenant Isolation UPDATE for device_mappings" ON public.device_mappings;
DROP POLICY IF EXISTS "Tenant Isolation DELETE for device_mappings" ON public.device_mappings;

CREATE POLICY "Tenant Isolation SELECT for device_mappings" ON public.device_mappings FOR SELECT USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant Isolation INSERT for device_mappings" ON public.device_mappings FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant Isolation UPDATE for device_mappings" ON public.device_mappings FOR UPDATE USING (tenant_id = public.get_current_tenant_id()) WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant Isolation DELETE for device_mappings" ON public.device_mappings FOR DELETE USING (tenant_id = public.get_current_tenant_id());
