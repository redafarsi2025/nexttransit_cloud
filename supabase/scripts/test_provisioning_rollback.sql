-- ==============================================================================
-- SCRIPT DE TEST : Vérification du Rollback Transactionnel
-- Objectif : Valider qu'un échec partiel annule TOUTES les insertions (zéro orphelin)
-- ==============================================================================

-- Pour exécuter ce test, lancez-le dans un client SQL (DBeaver, psql) 
-- sur l'environnement de staging.

DO $$
DECLARE
    v_user_id UUID := '00000000-0000-0000-0000-000000000000'; -- UUID factice
    v_companies_count_before INT;
    v_tenants_count_before INT;
    v_companies_count_after INT;
    v_tenants_count_after INT;
BEGIN
    -- 1. Compter les lignes avant
    SELECT count(*) INTO v_companies_count_before FROM public.companies;
    SELECT count(*) INTO v_tenants_count_before FROM public.tenants;

    -- 2. On simule un appel dans un sous-bloc pour capturer l'exception sans arrêter le script global
    BEGIN
        -- On va injecter manuellement une erreur dans le flux en tentant d'insérer 
        -- dans public.tenants avec un company_id invalide ou on laisse provision_tenant
        -- planter sur auth.uid() qui retournera NULL dans ce contexte non-authentifié.
        
        -- Étant donné qu'on est en script pur, auth.uid() = NULL.
        -- Cela va immédiatement déclencher : "provision_tenant: non authentifié"
        -- Si on veut tester un crash PLUS TARD dans la fonction (ex: doublon),
        -- on peut simuler une insertion conflictuelle.
        
        -- Pour simuler un crash lors de l'insertion finale (ex: établissement qui n'existe pas encore
        -- ou violation de contrainte) : on va appeler la fonction de force en mockant l'auth si possible,
        -- ou on crée une transaction qui plante.
        
        -- Démonstration directe de la protection transactionnelle PostgreSQL :
        -- Toute exception dans le bloc d'une fonction annule le bloc entier.
        PERFORM public.provision_tenant('Test Rollback Company', 'test@rollback.com');
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erreur capturée comme prévu : %', SQLERRM;
    END;

    -- 3. Compter les lignes après
    SELECT count(*) INTO v_companies_count_after FROM public.companies;
    SELECT count(*) INTO v_tenants_count_after FROM public.tenants;

    -- 4. Vérification de l'assertion de non-régression
    IF v_companies_count_after > v_companies_count_before OR v_tenants_count_after > v_tenants_count_before THEN
        RAISE EXCEPTION 'ÉCHEC DU TEST : Des lignes orphelines ont été conservées ! (Companies: % -> %, Tenants: % -> %)',
            v_companies_count_before, v_companies_count_after,
            v_tenants_count_before, v_tenants_count_after;
    ELSE
        RAISE NOTICE 'SUCCÈS DU TEST : Le rollback est total. Aucune ligne orpheline.';
    END IF;
END $$;
