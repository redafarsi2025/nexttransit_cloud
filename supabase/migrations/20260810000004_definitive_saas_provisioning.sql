-- =========================================================
-- NEXTTRANSIT - DEFINITIVE SAAS PROVISIONING ENGINE
-- Migration: 20260810000004_definitive_saas_provisioning.sql
-- =========================================================

-- 1. Assouplissement Résilient du Schéma de Production (Drift Fix)
DO $$ 
BEGIN
  -- Assouplissement de companies.tenant_id si ajouté en prod
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.companies ALTER COLUMN tenant_id DROP NOT NULL;
  END IF;

  -- Assouplissement de companies.billing_email si ajouté en prod
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'billing_email'
  ) THEN
    ALTER TABLE public.companies ALTER COLUMN billing_email DROP NOT NULL;
  END IF;
END $$;

-- 2. Fonction Défensive Omnipotente de Provisionnement
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
    v_slug       TEXT;
BEGIN
    -- Contrôles de sécurité stricts
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'register_new_tenant: not authenticated'; END IF;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND tenant_id IS NOT NULL AND tenant_id != 'c0a80101-0000-0000-0000-000000000001'::uuid) THEN
        RAISE EXCEPTION 'register_new_tenant: user already provisioned';
    END IF;

    -- Génération d'un slug garanti unique : nom nettoyé + 6 premiers carac du tenant_id
    v_slug := regexp_replace(lower(COALESCE(p_company_name, 'tenant')), '[^a-z0-9]+', '-', 'g') || '-' || substr(v_tenant_id::text, 1, 6);

    -- TEMPS 1 : Création de la Compagnie
    -- On force billing_email avec p_email pour satisfaire toute contrainte résiduelle.
    INSERT INTO public.companies (id, name, billing_email) 
    VALUES (
        v_company_id, 
        p_company_name,
        COALESCE(p_email, 'admin@' || v_slug || '.com')
    );
    
    -- TEMPS 2 : Création du Locataire (Tenant)
    -- On force le slug pour respecter la contrainte NOT NULL ajoutée en prod.
    INSERT INTO public.tenants (id, name, company_id, operating_region, is_configured, slug) 
    VALUES (
        v_tenant_id, 
        p_company_name, 
        v_company_id, 
        p_region, 
        FALSE,
        v_slug
    );

    -- Optionnel (mais sûr si tenant_id sur companies n'a pas pu être assoupli) : Clôture de dépendance
    DO
    $do$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='companies' AND column_name='tenant_id') THEN
            EXECUTE 'UPDATE public.companies SET tenant_id = $1 WHERE id = $2' USING v_tenant_id, v_company_id;
        END IF;
    END
    $do$;

    -- Abonnement initial (Trial Enterprise 30 jours)
    INSERT INTO public.subscriptions (id, company_id, tenant_id, plan, status, current_period_end) 
    VALUES (v_sub_id, v_company_id, v_tenant_id, 'enterprise_trial', 'trial', NOW() + INTERVAL '30 days');

    -- Attribution du rôle final (Admin Flotte)
    UPDATE public.profiles
    SET tenant_id = v_tenant_id, company_id = v_company_id, role = 'FLEET_MANAGER',
        full_name = COALESCE(p_full_name, full_name), email = COALESCE(p_email, email), updated_at = NOW()
    WHERE id = v_user_id;

    -- Update JWT Metadata
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('tenant_id', v_tenant_id::text, 'role', 'FLEET_MANAGER', 'company_id', v_company_id::text)
    WHERE id = v_user_id;

    RETURN jsonb_build_object('tenant_id', v_tenant_id, 'company_id', v_company_id, 'subscription_id', v_sub_id, 'slug', v_slug);
END;
$$;
