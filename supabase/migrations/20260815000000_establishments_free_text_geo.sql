-- ==============================================================================
-- MIGRATION 20260815000000_establishments_free_text_geo.sql
-- Fix : Établissements — Wilaya & Commune passent en saisie libre (TEXT)
--
-- Problème : wilaya_id et commune_id étaient des UUID FK vers wilayas/communes.
-- Le formulaire front-end envoie des chaînes de texte libres, provoquant
-- une violation de contrainte FK à chaque INSERT.
--
-- Solution : ajouter wilaya_name / commune_name TEXT (label affiché) et
-- rendre wilaya_id / commune_id optionnels (drop FK, keep column pour
-- compatibilité future avec le référentiel géographique si on veut l'intégrer).
-- ==============================================================================

-- 1. Ajouter les colonnes label texte libre
ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS wilaya_name TEXT,
  ADD COLUMN IF NOT EXISTS commune_name TEXT;

-- 2. Supprimer les contraintes FK UUID sur wilaya_id / commune_id
--    (on les garde en TEXT nullable pour un éventuel lien futur)
ALTER TABLE public.establishments
  DROP CONSTRAINT IF EXISTS establishments_wilaya_id_fkey,
  DROP CONSTRAINT IF EXISTS establishments_commune_id_fkey;

-- 3. Changer le type de wilaya_id / commune_id de UUID vers TEXT
--    pour accepter soit un UUID (référentiel) soit un code libre (saisie)
ALTER TABLE public.establishments
  ALTER COLUMN wilaya_id TYPE TEXT USING wilaya_id::TEXT,
  ALTER COLUMN commune_id TYPE TEXT USING commune_id::TEXT;

-- 4. Mettre à jour l'index géo pour refléter le nouveau type
DROP INDEX IF EXISTS public.idx_establishments_geo;
CREATE INDEX idx_establishments_geo ON public.establishments(wilaya_id, commune_id);
