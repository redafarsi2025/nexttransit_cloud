-- =========================================================
-- NEXTTRANSIT SECURITY HARDENING — Auth & Multi-Tenant
-- Migration: 20260810000000_security_hardening.sql
--
-- Fixes:
--   1. handle_new_user trigger no longer reads role/tenant_id from
--      raw_user_meta_data (privilege escalation vector patched)
--   2. public.profiles extended with full_name, email, company_id
--   3. register_new_tenant() SECURITY DEFINER — server-side provisioning
--   4. accept_tenant_invitation() SECURITY DEFINER — atomic token claim
--   5. Remove permissive INSERT policies on companies/tenants
--   6. Fix profiles SELECT policy: own-profile readable with NULL tenant
--   7. get_current_tenant_id() improved fallback chain
-- =========================================================

-- ──────────────────────────────────────────────────────────
-- 1. PATCH handle_new_user TRIGGER
-- ──────────────────────────────────────────────────────────
-- SECURITY: Never read 'role' or 'tenant_id' from raw_user_meta_data.
-- Any caller of supabase.auth.signUp() controls those fields freely.
-- New users always start as DRIVER with NULL tenant_id (pending provisioning).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, tenant_id, role, is_active)
    VALUES (
        new.id,
        NULL,      -- Provisioned AFTER auth via register_new_tenant() or accept_tenant_invitation()
        'DRIVER',  -- Never elevated via client-supplied metadata
        TRUE
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ──────────────────────────────────────────────────────────
-- 2. EXTEND public.profiles
-- ──────────────────────────────────────────────────────────
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS full_name  TEXT,
    ADD COLUMN IF NOT EXISTS email      TEXT,
    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- tenant_id can now be NULL (= pending provisioning state)
ALTER TABLE public.profiles ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN tenant_id DROP DEFAULT;

-- Ensure tenants has company_id, operating_region, is_configured
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS company_id       UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS operating_region TEXT NOT NULL DEFAULT 'North Africa';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS is_configured    BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure subscriptions has tenant_id
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- ──────────────────────────────────────────────────────────
-- 3. register_new_tenant() — SECURITY DEFINER
-- ──────────────────────────────────────────────────────────
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
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'register_new_tenant: not authenticated';
    END IF;

    -- Prevent double provisioning
    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = v_user_id
          AND tenant_id IS NOT NULL
          AND tenant_id != 'c0a80101-0000-0000-0000-000000000001'::uuid
    ) THEN
        RAISE EXCEPTION 'register_new_tenant: user already provisioned';
    END IF;

    INSERT INTO public.companies (id, name) VALUES (v_company_id, p_company_name);

    INSERT INTO public.tenants (id, name, company_id, operating_region, is_configured)
    VALUES (v_tenant_id, p_company_name, v_company_id, p_region, FALSE);

    INSERT INTO public.subscriptions (id, company_id, tenant_id, plan, status, current_period_end)
    VALUES (v_sub_id, v_company_id, v_tenant_id, 'enterprise_trial', 'trial', NOW() + INTERVAL '30 days');

    UPDATE public.profiles
    SET
        tenant_id  = v_tenant_id,
        company_id = v_company_id,
        role       = 'SUPER_ADMIN',
        full_name  = COALESCE(p_full_name, full_name),
        email      = COALESCE(p_email, email),
        updated_at = NOW()
    WHERE id = v_user_id;

    -- Propagate to JWT claims via app_metadata
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object(
            'tenant_id',  v_tenant_id::text,
            'role',       'SUPER_ADMIN',
            'company_id', v_company_id::text
        )
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'tenant_id',       v_tenant_id,
        'company_id',      v_company_id,
        'subscription_id', v_sub_id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.register_new_tenant(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_new_tenant(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ──────────────────────────────────────────────────────────
-- 4. accept_tenant_invitation() — SECURITY DEFINER, atomic token claim
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.accept_tenant_invitation(
    p_token     TEXT,
    p_full_name TEXT,
    p_email     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_invite  RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'accept_tenant_invitation: not authenticated';
    END IF;

    -- Atomic token claim: prevents concurrent double-accept race condition
    UPDATE public.invitations
    SET accepted_at = NOW()
    WHERE token       = p_token
      AND accepted_at IS NULL
      AND expires_at  > NOW()
    RETURNING id, tenant_id, company_id, role, email
    INTO v_invite;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'accept_tenant_invitation: invalid, expired, or already used token';
    END IF;

    -- Provision profile with role/tenant from DB, NEVER from client input
    UPDATE public.profiles
    SET
        tenant_id  = v_invite.tenant_id,
        company_id = v_invite.company_id,
        role       = v_invite.role,
        full_name  = COALESCE(p_full_name, full_name),
        email      = COALESCE(p_email, v_invite.email, email),
        updated_at = NOW()
    WHERE id = v_user_id;

    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object(
            'tenant_id', v_invite.tenant_id::text,
            'role',      v_invite.role
        )
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'tenant_id', v_invite.tenant_id,
        'role',      v_invite.role
    );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_tenant_invitation(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_tenant_invitation(TEXT, TEXT, TEXT) TO authenticated;

-- ──────────────────────────────────────────────────────────
-- 5. REMOVE permissive INSERT policies on companies/tenants
-- ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Tenant Isolation INSERT for companies" ON public.companies;
DROP POLICY IF EXISTS "Tenant Isolation INSERT for tenants"   ON public.tenants;
DROP POLICY IF EXISTS "Authenticated can insert companies"    ON public.companies;
DROP POLICY IF EXISTS "Authenticated can insert tenants"      ON public.tenants;

-- ──────────────────────────────────────────────────────────
-- 6. FIX profiles RLS policies
-- ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Tenant Isolation SELECT for profiles"  ON public.profiles;
DROP POLICY IF EXISTS "Tenant Isolation UPDATE for profiles"  ON public.profiles;
DROP POLICY IF EXISTS "User reads own profile"                ON public.profiles;
DROP POLICY IF EXISTS "Tenant members read profiles"          ON public.profiles;
DROP POLICY IF EXISTS "User updates own profile"              ON public.profiles;
DROP POLICY IF EXISTS "SUPER_ADMIN manages tenant profiles"   ON public.profiles;

-- Own profile: always readable regardless of tenant_id (critical for pending-provisioning state)
CREATE POLICY "User reads own profile"
    ON public.profiles FOR SELECT
    USING (id = auth.uid());

-- Tenant members see other profiles in their tenant
CREATE POLICY "Tenant members read profiles"
    ON public.profiles FOR SELECT
    USING (
        tenant_id IS NOT NULL
        AND tenant_id = public.get_current_tenant_id()
    );

-- Own non-privileged fields update (name, etc.) — role and tenant_id cannot be self-changed
CREATE POLICY "User updates own profile"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid()
        AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
        AND (tenant_id IS NOT DISTINCT FROM (SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()))
    );

-- SUPER_ADMIN role management in their tenant
CREATE POLICY "SUPER_ADMIN manages tenant profiles"
    ON public.profiles FOR UPDATE
    USING (
        tenant_id IS NOT NULL
        AND tenant_id = public.get_current_tenant_id()
        AND public.get_current_user_role() = 'SUPER_ADMIN'
    )
    WITH CHECK (tenant_id = public.get_current_tenant_id());

-- ──────────────────────────────────────────────────────────
-- 7. IMPROVE get_current_tenant_id() fallback chain
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- 1. JWT app_metadata (fastest, set after provisioning)
    v_tenant_id := (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
    IF v_tenant_id IS NOT NULL THEN RETURN v_tenant_id; END IF;

    -- 2. JWT top-level tenant_id
    v_tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;
    IF v_tenant_id IS NOT NULL THEN RETURN v_tenant_id; END IF;

    -- 3. Profiles table (handles first login before JWT refresh)
    SELECT tenant_id INTO v_tenant_id
    FROM public.profiles WHERE id = auth.uid() LIMIT 1;
    IF v_tenant_id IS NOT NULL THEN RETURN v_tenant_id; END IF;

    -- 4. Demo/anonymous fallback
    RETURN 'c0a80101-0000-0000-0000-000000000001'::uuid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

