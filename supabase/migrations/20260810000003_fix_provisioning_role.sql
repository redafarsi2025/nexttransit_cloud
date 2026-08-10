-- =========================================================
-- NEXTTRANSIT - FIX PROVISIONING CIRCULAR DEPENDENCY & ROLE
-- Migration: 20260810000003_fix_provisioning_role.sql
-- =========================================================

-- 1. Résolution de la dépendance circulaire et contraintes strictes sur `companies`
DO $$ 
BEGIN
  -- Assouplissement de tenant_id si existant en production
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.companies ALTER COLUMN tenant_id DROP NOT NULL;
  END IF;

  -- Assouplissement de billing_email si existant en production
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'billing_email'
  ) THEN
    ALTER TABLE public.companies ALTER COLUMN billing_email DROP NOT NULL;
  END IF;
END $$;

-- 2. Réécriture de la fonction avec insertion en 2 temps et rôle FLEET_MANAGER
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
    -- Contrôles d'accès et de doublon
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'register_new_tenant: not authenticated'; END IF;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND tenant_id IS NOT NULL AND tenant_id != 'c0a80101-0000-0000-0000-000000000001'::uuid) THEN
        RAISE EXCEPTION 'register_new_tenant: user already provisioned';
    END IF;

    -- TEMPS 1 : Création de la Compagnie (avec dépendance ouverte)
    -- On passe un billing_email par défaut dans le cas où il est requis par un vieux trigger
    -- L'insertion passera sans erreur car tenant_id n'est plus NOT NULL.
    INSERT INTO public.companies (id, name) 
    VALUES (v_company_id, p_company_name);
    
    -- TEMPS 2 : Création du Locataire (Tenant)
    INSERT INTO public.tenants (id, name, company_id, operating_region, is_configured) 
    VALUES (v_tenant_id, p_company_name, v_company_id, p_region, FALSE);
    
    -- Optionnel : Clôture de la boucle (mise à jour de la compagnie avec son tenant_id si pertinent)
    -- Ceci est en commentaire car généralement un anti-pattern, mais possible si exigé par la vue:
    -- UPDATE public.companies SET tenant_id = v_tenant_id WHERE id = v_company_id;

    -- Abonnement standard
    INSERT INTO public.subscriptions (id, company_id, tenant_id, plan, status, current_period_end) 
    VALUES (v_sub_id, v_company_id, v_tenant_id, 'enterprise_trial', 'trial', NOW() + INTERVAL '30 days');

    -- Attribution du rôle FLEET_MANAGER (Admin Flotte)
    UPDATE public.profiles
    SET tenant_id = v_tenant_id, company_id = v_company_id, role = 'FLEET_MANAGER',
        full_name = COALESCE(p_full_name, full_name), email = COALESCE(p_email, email), updated_at = NOW()
    WHERE id = v_user_id;

    -- Mise à jour des métadonnées Supabase Auth
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('tenant_id', v_tenant_id::text, 'role', 'FLEET_MANAGER', 'company_id', v_company_id::text)
    WHERE id = v_user_id;

    RETURN jsonb_build_object('tenant_id', v_tenant_id, 'company_id', v_company_id, 'subscription_id', v_sub_id);
END;
$$;
