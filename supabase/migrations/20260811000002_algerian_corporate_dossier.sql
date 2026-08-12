-- ==============================================================================
-- MIGRATION 20260811000002_algerian_corporate_dossier.sql
-- PHASE D : Modèle métier du Dossier Entreprise Algérien
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 1. Référentiel Géographique (Wilayas & Communes) - PUBLIC, LECTURE SEULE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wilayas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(2) NOT NULL UNIQUE,
    name_fr VARCHAR(128) NOT NULL,
    name_ar VARCHAR(128),
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.communes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wilaya_id UUID NOT NULL REFERENCES public.wilayas(id) ON DELETE CASCADE,
    code VARCHAR(5) NOT NULL UNIQUE,
    name_fr VARCHAR(128) NOT NULL,
    name_ar VARCHAR(128),
    active BOOLEAN DEFAULT TRUE
);

ALTER TABLE public.wilayas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique pour les wilayas" ON public.wilayas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture publique pour les communes" ON public.communes FOR SELECT TO authenticated USING (true);

-- -----------------------------------------------------------------------------
-- 2. Profil Fiscal (Tax Profiles)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tax_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
    tax_regime VARCHAR(32) DEFAULT 'REAL', -- REAL, REAL_SIMPLIFIED, IFU, SPECIAL, OTHER
    nif VARCHAR(64),
    tax_article_number VARCHAR(64),
    vat_subject BOOLEAN DEFAULT TRUE,
    vat_status VARCHAR(32) DEFAULT 'ACTIVE',
    ibs_subject BOOLEAN DEFAULT TRUE,
    ifu_subject BOOLEAN DEFAULT FALSE,
    tax_authority_type VARCHAR(64),
    tax_authority_code VARCHAR(32),
    tax_authority_name VARCHAR(255),
    tax_registration_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tax_profiles_tenant_nif ON public.tax_profiles(tenant_id, nif);

-- -----------------------------------------------------------------------------
-- 3. Registre de Commerce (Commercial Registrations)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commercial_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    rc_number VARCHAR(128),
    rc_date DATE,
    rc_status VARCHAR(32) DEFAULT 'ACTIVE',
    rc_authority VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_comm_reg_tenant_rc ON public.commercial_registrations(tenant_id, rc_number);

-- -----------------------------------------------------------------------------
-- 4. Profil Statistique (Statistical Profiles)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.statistical_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
    nis VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_stat_profiles_tenant_nis ON public.statistical_profiles(tenant_id, nis);

-- -----------------------------------------------------------------------------
-- 5. Profils de Sécurité Sociale (CNAS / CASNOS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_security_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    institution VARCHAR(32) NOT NULL, -- CNAS, CASNOS
    registration_number VARCHAR(128),
    employer_number VARCHAR(128),
    affiliation_center VARCHAR(255),
    status VARCHAR(32) DEFAULT 'ACTIVE',
    affiliation_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_social_profiles_tenant ON public.social_security_profiles(tenant_id);

-- -----------------------------------------------------------------------------
-- 6. Comptes Bancaires
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    bank_name VARCHAR(255) NOT NULL,
    bank_code VARCHAR(32),
    branch_code VARCHAR(32),
    account_holder VARCHAR(255),
    account_number VARCHAR(128),
    rib VARCHAR(128),
    currency VARCHAR(16) DEFAULT 'DZD',
    status VARCHAR(32) DEFAULT 'ACTIVE',
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, rib)
);

-- -----------------------------------------------------------------------------
-- 7. Établissements (Siège, Agences, Entrepôts)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.establishments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    code VARCHAR(64),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(64) DEFAULT 'HEAD_OFFICE', -- HEAD_OFFICE, AGENCY, DEPOT, WORKSHOP, LOGISTICS_BASE, OTHER
    is_head_office BOOLEAN DEFAULT FALSE,
    is_operational BOOLEAN DEFAULT TRUE,
    address_line_1 VARCHAR(255),
    address_line_2 VARCHAR(255),
    district VARCHAR(128),
    wilaya_id UUID REFERENCES public.wilayas(id) ON DELETE SET NULL,
    commune_id UUID REFERENCES public.communes(id) ON DELETE SET NULL,
    postal_code VARCHAR(32),
    phone VARCHAR(64),
    email VARCHAR(255),
    nis VARCHAR(64),
    nis_sequence VARCHAR(32),
    rc_secondary_reference VARCHAR(128),
    tax_article_number VARCHAR(64),
    activity_status VARCHAR(32) DEFAULT 'ACTIVE',
    activity_start_date DATE,
    activity_end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_establishments_tenant ON public.establishments(tenant_id);
CREATE INDEX idx_establishments_geo ON public.establishments(wilaya_id, commune_id);

-- -----------------------------------------------------------------------------
-- 8. Activités (Nomenclature d'activités)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    activity_code VARCHAR(64),
    activity_label VARCHAR(255),
    activity_type VARCHAR(32) DEFAULT 'PRIMARY', -- PRIMARY, SECONDARY
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    start_date DATE,
    end_date DATE,
    is_regulated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_activities_tenant ON public.activities(tenant_id);

-- -----------------------------------------------------------------------------
-- 9. Représentants Légaux
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_representatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    person_id UUID, -- Optionnel, lien vers une table de personnes physiques si elle existe plus tard
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(64) DEFAULT 'GERANT', -- GERANT, DIRECTOR_GENERAL, PRESIDENT, ADMINISTRATOR...
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 10. Documents Réglementaires (Centralise aussi les Licences/Agréments)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.regulatory_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
    document_type VARCHAR(64) NOT NULL, -- RC, NIF, NIS, STATUTS, AGREMENT, LICENCE, RIB...
    document_name VARCHAR(255),
    document_number VARCHAR(128),
    issuing_authority VARCHAR(255),
    issue_date DATE,
    expiry_date DATE,
    storage_path TEXT, -- Chemin dans Supabase Storage (bucket privé)
    mime_type VARCHAR(128),
    file_size INT,
    verification_status VARCHAR(32) DEFAULT 'PENDING', -- PENDING, VERIFIED, REJECTED, EXPIRED
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    status VARCHAR(32) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_documents_tenant ON public.regulatory_documents(tenant_id);

-- -----------------------------------------------------------------------------
-- RLS : Sécurité pour le multi-tenancy
-- -----------------------------------------------------------------------------

-- Fonction utilitaire de récupération du tenant (si elle n'est pas déjà dans un autre fichier)
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id 
    FROM public.profiles 
    WHERE id = auth.uid();
    RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Activation RLS
ALTER TABLE public.tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statistical_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_security_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_documents ENABLE ROW LEVEL SECURITY;

-- Politiques (CRUD limité au tenant de l'utilisateur)
DO $$
DECLARE
    t_name text;
    tables text[] := ARRAY[
        'tax_profiles', 'commercial_registrations', 'statistical_profiles', 
        'social_security_profiles', 'company_bank_accounts', 'establishments', 
        'activities', 'legal_representatives', 'regulatory_documents'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables
    LOOP
        EXECUTE format('CREATE POLICY "Tenant Isolation SELECT for %s" ON public.%s FOR SELECT TO authenticated USING (tenant_id = public.get_current_tenant_id())', t_name, t_name);
        EXECUTE format('CREATE POLICY "Tenant Isolation INSERT for %s" ON public.%s FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_current_tenant_id())', t_name, t_name);
        EXECUTE format('CREATE POLICY "Tenant Isolation UPDATE for %s" ON public.%s FOR UPDATE TO authenticated USING (tenant_id = public.get_current_tenant_id())', t_name, t_name);
        EXECUTE format('CREATE POLICY "Tenant Isolation DELETE for %s" ON public.%s FOR DELETE TO authenticated USING (tenant_id = public.get_current_tenant_id())', t_name, t_name);
    END LOOP;
END $$;
