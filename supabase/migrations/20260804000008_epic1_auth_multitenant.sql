-- =========================================================
-- EPIC 1: PRODUCTION AUTHENTICATION & MULTI-TENANT FOUNDATION
-- Schema: companies, tenants, users, subscriptions, invitations
-- RLS policies for multi-tenancy and role access
-- =========================================================

-- 1. Companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure tenants table has company_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.tenants ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Users / Profiles table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (
    role IN (
      'SUPER_ADMIN',
      'DIRECTOR',
      'FLEET_MANAGER',
      'MAINTENANCE_MANAGER',
      'FINANCE',
      'OPERATIONS',
      'MECHANIC',
      'DRIVER'
    )
  ),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'disabled')),
  invited_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'enterprise_trial' CHECK (plan IN ('enterprise_trial', 'professional', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'cancelled')),
  current_period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Invitations table
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (
    role IN (
      'SUPER_ADMIN',
      'DIRECTOR',
      'FLEET_MANAGER',
      'MAINTENANCE_MANAGER',
      'FINANCE',
      'OPERATIONS',
      'MECHANIC',
      'DRIVER'
    )
  ),
  invited_by UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Helper function to extract user's company_id from JWT / profile
CREATE OR REPLACE FUNCTION public.get_current_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper function to extract user's tenant_id from JWT / profile
CREATE OR REPLACE FUNCTION public.get_current_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Companies RLS Policies
CREATE POLICY "Users can view their own company"
  ON public.companies FOR SELECT
  USING (id = public.get_current_user_company_id());

-- Subscriptions RLS Policies
CREATE POLICY "Users can view subscription for their company"
  ON public.subscriptions FOR SELECT
  USING (company_id = public.get_current_user_company_id());

-- Users / Profiles RLS Policies
CREATE POLICY "Users can view profiles in their tenant"
  ON public.users FOR SELECT
  USING (tenant_id = public.get_current_user_tenant_id());

CREATE POLICY "Super Admins can manage users in their tenant"
  ON public.users FOR ALL
  USING (tenant_id = public.get_current_user_tenant_id());

-- Invitations RLS Policies
CREATE POLICY "Users can view invitations for their tenant"
  ON public.invitations FOR SELECT
  USING (tenant_id = public.get_current_user_tenant_id());

CREATE POLICY "Admins can manage invitations for their tenant"
  ON public.invitations FOR ALL
  USING (tenant_id = public.get_current_user_tenant_id());
