-- =========================================================
-- NEXTTRANSIT TENANT_ADMIN ROLE & PLATFORM_ADMIN ISOLATION
-- Migration: 20260810000001_tenant_admin_role.sql
-- =========================================================

-- 1. Create platform_admins table
CREATE TABLE IF NOT EXISTS public.platform_admins (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on platform_admins
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins can read platform_admins" ON public.platform_admins FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid()));

-- 2. Drop existing CHECK constraints on roles and re-add them with TENANT_ADMIN
-- (public.users has been deprecated in favor of profiles)

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invitations') THEN
        ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_role_check;
        ALTER TABLE public.invitations ADD CONSTRAINT invitations_role_check CHECK (
            role IN ('SUPER_ADMIN', 'TENANT_ADMIN', 'DIRECTOR', 'FLEET_MANAGER', 'MAINTENANCE_MANAGER', 'FINANCE', 'OPERATIONS', 'MECHANIC', 'DRIVER')
        );
    END IF;
END $$;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (
    role IN ('SUPER_ADMIN', 'TENANT_ADMIN', 'DIRECTOR', 'FLEET_MANAGER', 'MAINTENANCE_MANAGER', 'FINANCE', 'OPERATIONS', 'MECHANIC', 'DRIVER')
);

-- 3. Update register_new_tenant to assign TENANT_ADMIN instead of SUPER_ADMIN
CREATE OR REPLACE FUNCTION public.register_new_tenant(
    p_company_name TEXT,
    p_full_name    TEXT,
    p_email        TEXT DEFAULT NULL,
    p_region       TEXT DEFAULT 'North Africa'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id    UUID := auth.uid();
    v_company_id UUID := gen_random_uuid();
    v_tenant_id  UUID := gen_random_uuid();
    v_sub_id     UUID := gen_random_uuid();
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'register_new_tenant: not authenticated'; END IF;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND tenant_id IS NOT NULL AND tenant_id != 'c0a80101-0000-0000-0000-000000000001'::uuid) THEN
        RAISE EXCEPTION 'register_new_tenant: user already provisioned';
    END IF;

    INSERT INTO public.companies (id, name) VALUES (v_company_id, p_company_name);
    INSERT INTO public.tenants (id, name, company_id, operating_region, is_configured) VALUES (v_tenant_id, p_company_name, v_company_id, p_region, FALSE);
    INSERT INTO public.subscriptions (id, company_id, tenant_id, plan, status, current_period_end) VALUES (v_sub_id, v_company_id, v_tenant_id, 'enterprise_trial', 'trial', NOW() + INTERVAL '30 days');

    UPDATE public.profiles
    SET tenant_id = v_tenant_id, company_id = v_company_id, role = 'TENANT_ADMIN',
        full_name = COALESCE(p_full_name, full_name), email = COALESCE(p_email, email), updated_at = NOW()
    WHERE id = v_user_id;

    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('tenant_id', v_tenant_id::text, 'role', 'TENANT_ADMIN', 'company_id', v_company_id::text)
    WHERE id = v_user_id;

    RETURN jsonb_build_object('tenant_id', v_tenant_id, 'company_id', v_company_id, 'subscription_id', v_sub_id);
END;
$$;

-- 4. Update tenants RLS (Remove SUPER_ADMIN generic access, replace with platform_admins)
DROP POLICY IF EXISTS "Authenticated User Select Own Tenant" ON public.tenants;
CREATE POLICY "Authenticated User Select Own Tenant"
  ON public.tenants FOR SELECT TO authenticated
  USING (
    id::text = public.get_current_tenant_id()::text
    OR EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "SuperAdmin Manage Tenants" ON public.tenants;
CREATE POLICY "PlatformAdmin Manage Tenants"
  ON public.tenants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.platform_admins WHERE id = auth.uid()));

CREATE POLICY "TenantAdmin Update Own Tenant"
  ON public.tenants FOR UPDATE TO authenticated
  USING (id::text = public.get_current_tenant_id()::text AND public.get_current_user_role() = 'TENANT_ADMIN')
  WITH CHECK (id::text = public.get_current_tenant_id()::text AND public.get_current_user_role() = 'TENANT_ADMIN');

-- 5. Add TENANT_ADMIN to tenant-scoped RLS policies
DROP POLICY IF EXISTS "SUPER_ADMIN manages tenant profiles" ON public.profiles;
CREATE POLICY "TENANT_ADMIN manages tenant profiles"
    ON public.profiles FOR UPDATE
    USING (tenant_id IS NOT NULL AND tenant_id = public.get_current_tenant_id() AND public.get_current_user_role() IN ('SUPER_ADMIN', 'TENANT_ADMIN'))
    WITH CHECK (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "RLS_WorkOrders_Select_Policy" ON public.work_orders;
CREATE POLICY "RLS_WorkOrders_Select_Policy" ON public.work_orders FOR SELECT
  USING (tenant_id::text = public.get_current_tenant_id()::text AND (
      public.get_current_user_role() IN ('SUPER_ADMIN', 'TENANT_ADMIN', 'DIRECTOR', 'FLEET_MANAGER', 'MAINTENANCE_MANAGER', 'FINANCE', 'OPERATIONS')
      OR (public.get_current_user_role() = 'MECHANIC' AND assigned_mechanic_id::text = auth.uid()::text)
      OR (public.get_current_user_role() = 'DRIVER' AND vehicle_id IN (SELECT id FROM public.vehicles WHERE assigned_driver_id::text = auth.uid()::text))
  ));

DROP POLICY IF EXISTS "RLS_FleetAlerts_Select_Policy" ON public.fleet_alerts;
CREATE POLICY "RLS_FleetAlerts_Select_Policy" ON public.fleet_alerts FOR SELECT
  USING (tenant_id::text = public.get_current_tenant_id()::text AND (
      public.get_current_user_role() IN ('SUPER_ADMIN', 'TENANT_ADMIN', 'DIRECTOR', 'FLEET_MANAGER', 'MAINTENANCE_MANAGER', 'FINANCE', 'OPERATIONS')
      OR (public.get_current_user_role() = 'DRIVER' AND vehicle_id IN (SELECT id FROM public.vehicles WHERE assigned_driver_id::text = auth.uid()::text))
      OR (public.get_current_user_role() = 'MECHANIC' AND vehicle_id IN (SELECT id FROM public.vehicles WHERE assigned_mechanic_id::text = auth.uid()::text))
  ));

DROP POLICY IF EXISTS "RLS_Inventory_Select_Policy" ON public.inventory_items;
CREATE POLICY "RLS_Inventory_Select_Policy" ON public.inventory_items FOR SELECT
  USING (tenant_id::text = public.get_current_tenant_id()::text AND (
      public.get_current_user_role() IN ('SUPER_ADMIN', 'TENANT_ADMIN', 'DIRECTOR', 'FLEET_MANAGER', 'MAINTENANCE_MANAGER', 'FINANCE', 'OPERATIONS', 'MECHANIC')
  ));

-- 6. Data Migration
-- Update profiles
UPDATE public.profiles SET role = 'TENANT_ADMIN' WHERE role = 'SUPER_ADMIN' AND id NOT IN (SELECT id FROM public.platform_admins);

-- Update users table (legacy - removed since table does not exist)

-- Update invitations
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invitations') THEN
        UPDATE public.invitations SET role = 'TENANT_ADMIN' WHERE role = 'SUPER_ADMIN';
    END IF;
END $$;

-- Update auth.users app_metadata
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(raw_app_meta_data, '{role}', '"TENANT_ADMIN"')
WHERE raw_app_meta_data->>'role' = 'SUPER_ADMIN' AND id NOT IN (SELECT id FROM public.platform_admins);
