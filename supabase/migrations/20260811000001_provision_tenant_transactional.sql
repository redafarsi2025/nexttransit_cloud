-- ==============================================================================
-- MIGRATION 20260811000001_provision_tenant_transactional.sql
-- PHASE C / Migration 3 : Provisionnement transactionnel
-- ==============================================================================

-- 1. Fonction provision_tenant (Remplace register_new_tenant)
CREATE OR REPLACE FUNCTION public.provision_tenant(
    p_company_name TEXT,
    p_email TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_tenant_id UUID;
    v_company_id UUID;
    v_slug TEXT;
    v_billing_email TEXT;
BEGIN
    -- A. Récupération et vérification de l'utilisateur authentifié
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'provision_tenant: non authentifié';
    END IF;

    -- Vérifier s'il n'a pas déjà un profil avec tenant non par défaut
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = v_user_id 
          AND tenant_id != 'c0a80101-0000-0000-0000-000000000001'::uuid
    ) THEN
        RAISE EXCEPTION 'provision_tenant: utilisateur a déjà un tenant';
    END IF;

    -- B. Fallback d'email robuste (Garde-fou demandé par l'architecture)
    v_billing_email := p_email;
    IF v_billing_email IS NULL OR trim(v_billing_email) = '' THEN
        SELECT email INTO v_billing_email FROM auth.users WHERE id = v_user_id;
        IF v_billing_email IS NULL THEN
            RAISE EXCEPTION 'provision_tenant: impossible de déterminer le billing_email';
        END IF;
    END IF;

    -- C. Génération d'IDs uniques
    v_tenant_id := gen_random_uuid();
    v_company_id := gen_random_uuid();
    v_slug := regexp_replace(lower(p_company_name), '[^a-z0-9]+', '-', 'g');

    -- Assurer l'unicité du slug
    WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = v_slug) LOOP
        v_slug := v_slug || '-' || substr(md5(random()::text), 1, 4);
    END LOOP;

    -- D. TRANSACTION (L'ordre linéaire)
    -- 1. Companies (Sans dépendance externe)
    INSERT INTO public.companies (id, name, billing_email)
    VALUES (v_company_id, p_company_name, v_billing_email);

    -- 2. Tenants (Dépend de companies)
    INSERT INTO public.tenants (id, company_id, name, slug)
    VALUES (v_tenant_id, v_company_id, p_company_name, v_slug);

    -- 3. Profiles (Dépend de tenants) - Mise à jour du profil existant généré par le trigger
    UPDATE public.profiles 
    SET 
        tenant_id = v_tenant_id,
        role = 'TENANT_ADMIN'
    WHERE id = v_user_id;

    IF NOT FOUND THEN
        -- Si pour une raison obscure le trigger n'avait pas marché
        INSERT INTO public.profiles (id, tenant_id, role)
        VALUES (v_user_id, v_tenant_id, 'TENANT_ADMIN');
    END IF;

    -- (Les placeholders fiscaux/établissements seront ajoutés dans la Phase D quand leurs tables existeront)

    RETURN json_build_object(
        'tenant_id', v_tenant_id,
        'company_id', v_company_id,
        'slug', v_slug
    );
EXCEPTION WHEN OTHERS THEN
    -- En plpgsql, toute exception non catchée annule automatiquement la transaction courante.
    -- Nous re-levons l'exception avec les détails pour faciliter le debugging.
    RAISE EXCEPTION 'Échec du provisionnement: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- 2. Sécurisation des accès
REVOKE ALL ON FUNCTION public.provision_tenant(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provision_tenant(TEXT, TEXT) TO authenticated;

-- (Optionnel) Désactivation de l'ancien endpoint s'il est exposé pour éviter son usage
DROP FUNCTION IF EXISTS public.register_new_tenant(TEXT, TEXT, TEXT, TEXT);
