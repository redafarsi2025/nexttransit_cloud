-- ==============================================================================
-- MIGRATION 20260812000000_finalize_tenant_architecture.sql
-- ==============================================================================

-- 1. Suppression stricte et définitive de la dépendance circulaire
ALTER TABLE public.companies DROP COLUMN IF EXISTS tenant_id;

-- 2. Sécurisation de l'accès public au RPC
REVOKE ALL ON FUNCTION public.provision_tenant(TEXT, TEXT) FROM PUBLIC;

-- 3. Fonction Transactionnelle et Idempotente (Avec Verrou FOR UPDATE)
CREATE OR REPLACE FUNCTION public.provision_tenant(
    p_company_name TEXT,
    p_email TEXT DEFAULT NULL -- Conservé pour compatibilité frontend, mais l'identité est issue de auth.users.email
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_tenant_id UUID;
    v_company_id UUID;
    v_sub_id UUID;
    v_slug TEXT;
    v_user_email TEXT;
    v_existing_profile RECORD;
    v_tenant RECORD;
    v_company RECORD;
    v_subscription RECORD;
BEGIN
    -- A. Validation stricte
    IF p_company_name IS NULL OR trim(p_company_name) = '' THEN
        RAISE EXCEPTION 'provision_tenant: p_company_name ne peut être vide';
    END IF;

    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'provision_tenant: non authentifié';
    END IF;

    -- B. L'identité Auth est la seule source de vérité pour l'email initial
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'provision_tenant: email introuvable dans auth.users';
    END IF;

    -- C. Idempotence & Réconciliation avec Verrou exclusif (Prévention Concurrence)
    SELECT * INTO v_existing_profile 
    FROM public.profiles 
    WHERE id = v_user_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PROFILE_NOT_FOUND';
    END IF;

    IF v_existing_profile.tenant_id IS NOT NULL THEN
        -- 1. Le tenant référencé doit exister
        SELECT * INTO v_tenant FROM public.tenants WHERE id = v_existing_profile.tenant_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'INCONSISTENT: tenant introuvable pour ce profil';
        END IF;

        -- 2. Concordance company_id entre profil et tenant
        IF v_existing_profile.company_id IS DISTINCT FROM v_tenant.company_id THEN
            RAISE EXCEPTION 'INCONSISTENT: company_id du profil diverge de celui du tenant';
        END IF;

        -- 3. La company doit exister
        SELECT * INTO v_company FROM public.companies WHERE id = v_tenant.company_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'INCONSISTENT: company introuvable pour ce tenant';
        END IF;
        
        -- 4 & 5. Vérification ou création de la subscription
        SELECT * INTO v_subscription FROM public.subscriptions WHERE tenant_id = v_tenant.id LIMIT 1;
        
        IF FOUND THEN
            IF v_subscription.company_id IS DISTINCT FROM v_tenant.company_id THEN
                RAISE EXCEPTION 'INCONSISTENT: subscription liée à une mauvaise company';
            END IF;
            v_sub_id := v_subscription.id;
        ELSE
            v_sub_id := gen_random_uuid();
            INSERT INTO public.subscriptions (id, company_id, tenant_id, plan, status, current_period_end)
            VALUES (v_sub_id, v_company.id, v_tenant.id, 'enterprise_trial', 'trial', NOW() + INTERVAL '30 days');
        END IF;
        
        RETURN json_build_object(
            'tenant_id', v_tenant.id,
            'company_id', v_company.id,
            'subscription_id', v_sub_id,
            'slug', v_tenant.slug
        );
    END IF;

    -- D. Nouveau Provisioning : Génération d'IDs uniques
    v_tenant_id := gen_random_uuid();
    v_company_id := gen_random_uuid();
    v_sub_id := gen_random_uuid();
    
    -- E. Création du slug (la contrainte UNIQUE sur la table protégera contre la collision finale)
    v_slug := regexp_replace(lower(trim(p_company_name)), '[^a-z0-9]+', '-', 'g');
    IF v_slug = '' THEN v_slug := 'tenant'; END IF;
    WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = v_slug) LOOP
        v_slug := v_slug || '-' || substr(md5(random()::text), 1, 4);
    END LOOP;

    -- F. Transaction (Le SECURITY DEFINER outrepasse les RLS pour ces INSERTS initiaux)
    INSERT INTO public.companies (id, name, billing_email)
    VALUES (v_company_id, trim(p_company_name), v_user_email);

    INSERT INTO public.tenants (id, company_id, name, slug)
    VALUES (v_tenant_id, v_company_id, trim(p_company_name), v_slug);

    INSERT INTO public.subscriptions (id, company_id, tenant_id, plan, status, current_period_end)
    VALUES (v_sub_id, v_company_id, v_tenant_id, 'enterprise_trial', 'trial', NOW() + INTERVAL '30 days');

    UPDATE public.profiles 
    SET 
        tenant_id = v_tenant_id,
        company_id = v_company_id,
        role = 'TENANT_ADMIN',
        full_name = COALESCE(full_name, split_part(v_user_email, '@', 1)),
        email = COALESCE(email, v_user_email)
    WHERE id = v_user_id;

    RETURN json_build_object(
        'tenant_id', v_tenant_id,
        'company_id', v_company_id,
        'subscription_id', v_sub_id,
        'slug', v_slug
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.provision_tenant(TEXT, TEXT) TO authenticated;
