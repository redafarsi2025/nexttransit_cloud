-- Fix: PostgREST (used by supabase-js with the service role key) connects as a low-privilege
-- `authenticator` role and does `SET LOCAL ROLE service_role` per-request based on the JWT —
-- it never becomes the literal session_user. session_user stays 'authenticator' (or whatever
-- the pooler's login role is); current_user reflects the active SET ROLE and is 'service_role'
-- for these calls. The 20260834000000 lockdown triggers checked session_user and therefore
-- rejected scripts/seed-demo-account.ts's own service-role writes. Switch to current_user.

CREATE OR REPLACE FUNCTION public.block_demo_tenant_writes()
RETURNS TRIGGER AS $$
DECLARE
    DEMO_TENANT_ID CONSTANT UUID := 'c0a80101-0000-0000-0000-000000000001'::uuid;
    row_tenant_id UUID;
BEGIN
    IF current_user = 'service_role'
       OR current_setting('nexttransit.demo_reset_bypass', true) = 'true' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    row_tenant_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.tenant_id ELSE NEW.tenant_id END;

    IF row_tenant_id = DEMO_TENANT_ID THEN
        RAISE EXCEPTION 'Le tenant de démonstration publique est en lecture seule — les actions y sont simulées côté client et ne sont jamais enregistrées.'
            USING ERRCODE = '42501';
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.block_demo_tenant_row_writes()
RETURNS TRIGGER AS $$
DECLARE
    DEMO_TENANT_ID CONSTANT UUID := 'c0a80101-0000-0000-0000-000000000001'::uuid;
    target_id UUID;
BEGIN
    IF current_user = 'service_role'
       OR current_setting('nexttransit.demo_reset_bypass', true) = 'true' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    target_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;

    IF target_id = DEMO_TENANT_ID THEN
        RAISE EXCEPTION 'Le tenant de démonstration publique est en lecture seule.'
            USING ERRCODE = '42501';
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.block_demo_tenant_profile_writes()
RETURNS TRIGGER AS $$
DECLARE
    DEMO_TENANT_ID CONSTANT UUID := 'c0a80101-0000-0000-0000-000000000001'::uuid;
BEGIN
    IF current_user = 'service_role'
       OR current_setting('nexttransit.demo_reset_bypass', true) = 'true' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF (CASE WHEN TG_OP = 'DELETE' THEN OLD.tenant_id ELSE NEW.tenant_id END) = DEMO_TENANT_ID THEN
        RAISE EXCEPTION 'Le tenant de démonstration publique est en lecture seule.'
            USING ERRCODE = '42501';
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.block_demo_tenant_subscription_writes()
RETURNS TRIGGER AS $$
DECLARE
    DEMO_TENANT_ID CONSTANT UUID := 'c0a80101-0000-0000-0000-000000000001'::uuid;
BEGIN
    IF current_user = 'service_role'
       OR current_setting('nexttransit.demo_reset_bypass', true) = 'true' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF (CASE WHEN TG_OP = 'DELETE' THEN OLD.tenant_id ELSE NEW.tenant_id END) = DEMO_TENANT_ID THEN
        RAISE EXCEPTION 'Le tenant de démonstration publique est en lecture seule.'
            USING ERRCODE = '42501';
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
