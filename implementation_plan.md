# Plan Final avant Exécution (Validation Finale Requise)

Voici les réponses exactes aux 4 points demandés :

## A. SQL final complet de la migration (`20260812000000_finalize_tenant_architecture.sql`)

*Note sur le point 6 : Après vérification de l'existant, les seules valeurs canoniques validées par la base pour `subscriptions` sont `enterprise_trial`, `professional`, `enterprise` (pour `plan`) et `trial`, `active`, `past_due`, `cancelled` (pour `status`). Afin de ne pas altérer inutilement les CHECK constraints historiques, l'abonnement initial sera provisionné avec `'enterprise_trial'` et `'trial'`, qui correspondent au comportement par défaut de l'ERP.*

```sql
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
    p_email TEXT DEFAULT NULL
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
    v_sub_exists BOOLEAN;
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
        -- Réconciliation : on récupère les IDs existants
        SELECT company_id, slug INTO v_company_id, v_slug 
        FROM public.tenants WHERE id = v_existing_profile.tenant_id;
        
        -- Vérification et réparation de la souscription si manquante
        SELECT EXISTS(SELECT 1 FROM public.subscriptions WHERE tenant_id = v_existing_profile.tenant_id) INTO v_sub_exists;
        
        IF NOT v_sub_exists THEN
            v_sub_id := gen_random_uuid();
            INSERT INTO public.subscriptions (id, company_id, tenant_id, plan, status, current_period_end)
            VALUES (v_sub_id, v_company_id, v_existing_profile.tenant_id, 'enterprise_trial', 'trial', NOW() + INTERVAL '30 days');
        ELSE
            SELECT id INTO v_sub_id FROM public.subscriptions WHERE tenant_id = v_existing_profile.tenant_id LIMIT 1;
        END IF;
        
        RETURN json_build_object(
            'tenant_id', v_existing_profile.tenant_id,
            'company_id', v_company_id,
            'subscription_id', v_sub_id,
            'slug', v_slug
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

    -- F. Transaction (Le SECURITY DEFINER outrepasse les RLS pour ces INSERTS)
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
```

---

## B. Liste exhaustive des fichiers modifiés

1. `supabase/migrations/20260812000000_finalize_tenant_architecture.sql` (Nouveau)
2. `src/services/authService.ts` (Ajout de `ensureTenantProvisioned` et suppression du `Subscription` mocké)
3. `src/components/common/AuthModal.tsx` (Mise à jour des retours visuels et handling strict de `ensureTenantProvisioned`)
4. `src/context/AuthContext.tsx` (Traitement de l'état `INCONSISTENT` ou `NEEDS_PROVISIONING`)
5. `src/services/__tests__/auth.security.test.ts` (Mise à jour et ajout des tests)

*(Aucun autre fichier ne sera modifié).*

---

## C. Tests Prévus (`auth.security.test.ts`)

- **A.** Nouveau tenant : Création classique, validation stricte de l'existence de chaque entité.
- **B.** Double clic : Deux appels concurrents avec le même `auth.uid()`, le `FOR UPDATE` sérialise et renvoie 1 seul locataire.
- **C.** Email confirmation : `signUp` valide, sans exécution de `provision_tenant`.
- **D.** Utilisateur orphelin : Profil avec `tenant_id = NULL`, réparation complète au login.
- **E.** Erreur DB volontaire : Injection d'un paramètre invalide (ex: nom de compagnie vide) et validation du rollback.
- **F.** Refresh après onboarding : Vérification de la persistance de l'état "READY".
- **G.** `auth.users` existe mais `profile` absent : Doit lever `PROFILE_NOT_FOUND` (Rollback strict).
- **H.** Incohérence (Tenant / Company sans Subscription) : Simulation de la suppression d'une subscription, puis appel RPC pour valider la réconciliation.

---

## D. Stratégie Rollback

Si la migration échoue ou cause une régression :
1. **Frontend** : Revert du commit git via un simple `git reset --hard HEAD` (ou un checkout manuel des fichiers).
2. **Database** : Création d'une migration down `20260812000000_finalize_tenant_architecture_down.sql` (ou annulation locale) contenant :
   - `ALTER TABLE public.companies ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;`
   - Restauration de l'ancienne version de `provision_tenant` définie dans la migration `20260811000001`.
   - On utilisera `supabase db reset` en local pour revenir à un état vierge sans cette migration en cas de test échoué.
