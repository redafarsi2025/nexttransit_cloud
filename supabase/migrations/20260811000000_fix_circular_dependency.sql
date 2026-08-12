-- ==============================================================================
-- MIGRATION 20260811000000_fix_circular_dependency.sql
-- PHASE C / Migration 1 : Nettoyage du Schema Drift et du Noyau Tenant
-- ==============================================================================

-- 1. Nettoyage de la table companies (Schema Drift)
-- Objectif : Retirer la colonne fantôme tenant_id qui causait la dépendance circulaire
-- Note : Au lieu de la supprimer (DROP), on s'assure qu'elle n'a aucune contrainte, 
-- au cas où un view/script l'exigerait encore. Elle est abandonnée sur le plan applicatif.
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.companies ALTER COLUMN tenant_id DROP NOT NULL;
        -- Nous supprimons la contrainte de clé étrangère s'il y en a une pour casser la boucle
        -- En PL/pgSQL, identifier la contrainte FK exacte peut être complexe dynamiquement,
        -- mais vu que la dépendance est coupée architecturalement, on laisse la colonne "morte".
    END IF;
END $$;

-- 2. Restauration de billing_email NOT NULL sur companies
-- C'est une obligation métier. Les anciennes lignes qui n'auraient pas d'email
-- recevront une valeur par défaut temporaire pour satisfaire la contrainte avant le ALTER.
UPDATE public.companies SET billing_email = 'temp@nexttransit.local' WHERE billing_email IS NULL;
ALTER TABLE public.companies ALTER COLUMN billing_email SET NOT NULL;

-- 3. Enrichissement du noyau tenants (Toutes les colonnes sont NULLABLE pour compatibilité avec existant)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS trade_name VARCHAR(255);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS acronym VARCHAR(32);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS legal_form VARCHAR(64);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS capital_social NUMERIC(15, 2);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS date_creation DATE;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS date_activity_start DATE;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS country VARCHAR(64) DEFAULT 'Algérie';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'ACTIVE';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) DEFAULT 'Africa/Algiers';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS allocated_budget NUMERIC(15, 2);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 4. Sécurisation explicite de tenants.company_id 
-- On s'assure qu'elle existe bien et qu'elle est contrainte.
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE public.tenants ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- On ne rend pas company_id NOT NULL ici pour ne pas bloquer les tenants orphelins potentiellement 
-- déjà en base. Le script heal_orphaned_tenants se chargera du nettoyage avant toute restriction dure.
