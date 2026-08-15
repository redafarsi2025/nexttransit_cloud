-- Migration: Telemetry Device Mapping Integrity
-- Corrige la table créée par 20260804000005_device_mappings.sql

-- 1. Ajout de la colonne is_active
ALTER TABLE public.device_mappings 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Suppression du tenant par défaut et modification ON DELETE RESTRICT
ALTER TABLE public.device_mappings 
ALTER COLUMN tenant_id DROP DEFAULT;

-- Note: Le nom de la contrainte FK générée par PostgreSQL est généralement "device_mappings_tenant_id_fkey"
ALTER TABLE public.device_mappings 
DROP CONSTRAINT IF EXISTS device_mappings_tenant_id_fkey;

ALTER TABLE public.device_mappings 
ADD CONSTRAINT device_mappings_tenant_id_fkey 
FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;

-- 3. Sécurisation de vehicle_id (UUID + FK ON DELETE RESTRICT)

ALTER TABLE public.device_mappings 
ALTER COLUMN vehicle_id TYPE UUID USING vehicle_id::uuid;

ALTER TABLE public.device_mappings 
ADD CONSTRAINT device_mappings_vehicle_id_fkey 
FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE RESTRICT;

-- 4. Remplacement de la contrainte d'unicité (un device = 1 seule association globale)
ALTER TABLE public.device_mappings 
DROP CONSTRAINT IF EXISTS unique_tenant_vehicle_device_mapping;

ALTER TABLE public.device_mappings 
ADD CONSTRAINT unique_provider_external_device UNIQUE (provider, external_device_id);

-- 5. Mise à jour de la contrainte CHECK sur le provider pour autoriser la gateway locale
ALTER TABLE public.device_mappings 
DROP CONSTRAINT IF EXISTS device_mappings_provider_check;

ALTER TABLE public.device_mappings 
ADD CONSTRAINT device_mappings_provider_check 
CHECK (provider IN ('teltonika', 'flespi_wialon', 'manual', 'nexttransit_gateway'));

-- 6. Re-sécurisation du RLS
ALTER TABLE public.device_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation SELECT for device_mappings" ON public.device_mappings;
DROP POLICY IF EXISTS "Tenant Isolation INSERT for device_mappings" ON public.device_mappings;
DROP POLICY IF EXISTS "Tenant Isolation UPDATE for device_mappings" ON public.device_mappings;
DROP POLICY IF EXISTS "Tenant Isolation DELETE for device_mappings" ON public.device_mappings;

CREATE POLICY "Tenant Isolation SELECT for device_mappings" ON public.device_mappings 
  FOR SELECT USING (tenant_id = public.get_current_tenant_id());
  
CREATE POLICY "Tenant Isolation INSERT for device_mappings" ON public.device_mappings 
  FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());
  
CREATE POLICY "Tenant Isolation UPDATE for device_mappings" ON public.device_mappings 
  FOR UPDATE USING (tenant_id = public.get_current_tenant_id()) WITH CHECK (tenant_id = public.get_current_tenant_id());
  
CREATE POLICY "Tenant Isolation DELETE for device_mappings" ON public.device_mappings 
  FOR DELETE USING (tenant_id = public.get_current_tenant_id());
