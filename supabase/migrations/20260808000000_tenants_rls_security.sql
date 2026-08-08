-- =========================================================
-- NEXTTRANSIT TENANTS TABLE RLS SECURITY MIGRATION
-- Migration: 20260808000000_tenants_rls_security.sql
-- =========================================================

-- 1. Enable RLS on public.tenants table
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 2. Drop any legacy/permissive policies on public.tenants
DROP POLICY IF EXISTS "Tenant Isolation SELECT for tenants" ON public.tenants;
DROP POLICY IF EXISTS "Anon Demo Select Tenants" ON public.tenants;
DROP POLICY IF EXISTS "SuperAdmin Manage Tenants" ON public.tenants;
DROP POLICY IF EXISTS "Authenticated User Select Own Tenant" ON public.tenants;

-- 3. Policy for Authenticated Users: Users can SELECT their assigned tenant or SuperAdmins can SELECT all tenants
CREATE POLICY "Authenticated User Select Own Tenant"
  ON public.tenants FOR SELECT TO authenticated
  USING (
    id::text = public.get_current_tenant_id()::text
    OR public.get_current_user_role() = 'SUPER_ADMIN'
  );

-- 4. Policy for Anonymous Demo Users: Strict SELECT scoped ONLY to DEMO_TENANT_ID ('c0a80101-0000-0000-0000-000000000001')
CREATE POLICY "Anon Demo Select Tenants"
  ON public.tenants FOR SELECT TO anon
  USING (id = 'c0a80101-0000-0000-0000-000000000001'::uuid);

-- 5. Policy for SuperAdmins UPDATE/INSERT: Only SUPER_ADMIN can modify tenant configuration
CREATE POLICY "SuperAdmin Manage Tenants"
  ON public.tenants FOR ALL TO authenticated
  USING (public.get_current_user_role() = 'SUPER_ADMIN')
  WITH CHECK (public.get_current_user_role() = 'SUPER_ADMIN');
