-- =========================================================
-- NEXTTRANSIT - HEALING SCRIPT FOR STUCK REGISTRATIONS
-- Run this in your Supabase SQL Editor
-- =========================================================

DO $$
DECLARE
    r RECORD;
    v_company_id UUID;
    v_tenant_id UUID;
    v_sub_id UUID;
    v_slug TEXT;
BEGIN
    -- On boucle sur tous les profils existants qui n'ont pas de tenant_id
    FOR r IN (
        SELECT u.id, u.email, p.full_name, u.raw_user_meta_data->>'company_name' AS company_name 
        FROM auth.users u 
        JOIN public.profiles p ON u.id = p.id 
        WHERE p.tenant_id IS NULL
    )
    LOOP
        v_company_id := gen_random_uuid();
        v_tenant_id  := gen_random_uuid();
        v_sub_id     := gen_random_uuid();
        
        -- Génération du slug d'URL
        v_slug := regexp_replace(lower(COALESCE(r.company_name, 'Compagnie de ' || r.full_name)), '[^a-z0-9]+', '-', 'g') || '-' || substr(v_tenant_id::text, 1, 6);

        -- 1. Création de la Compagnie et du Locataire avec tous les champs obligatoires (y compris slug et email)
        INSERT INTO public.companies (id, name, billing_email) 
        VALUES (
            v_company_id, 
            COALESCE(r.company_name, 'Compagnie de ' || r.full_name),
            r.email
        );
        
        INSERT INTO public.tenants (id, name, company_id, operating_region, is_configured, slug) 
        VALUES (
            v_tenant_id, 
            COALESCE(r.company_name, 'Compagnie de ' || r.full_name), 
            v_company_id, 
            'North Africa', 
            FALSE,
            v_slug
        );
        
        -- Tentative de mise à jour de tenant_id sur companies si la colonne existe (dépendance circulaire potentielle)
        BEGIN
            EXECUTE 'UPDATE public.companies SET tenant_id = $1 WHERE id = $2' USING v_tenant_id, v_company_id;
        EXCEPTION WHEN undefined_column THEN
            -- La colonne n'existe pas, on ignore
        END;

        INSERT INTO public.subscriptions (id, company_id, tenant_id, plan, status, current_period_end) 
        VALUES (v_sub_id, v_company_id, v_tenant_id, 'enterprise_trial', 'trial', NOW() + INTERVAL '30 days');

        -- 2. Mise à jour du profil et assignation du rôle
        UPDATE public.profiles
        SET tenant_id = v_tenant_id, company_id = v_company_id, role = 'FLEET_MANAGER'
        WHERE id = r.id;

        -- 3. Mise à jour des métadonnées Auth
        UPDATE auth.users
        SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('tenant_id', v_tenant_id::text, 'role', 'FLEET_MANAGER', 'company_id', v_company_id::text)
        WHERE id = r.id;
        
    END LOOP;
END $$;
