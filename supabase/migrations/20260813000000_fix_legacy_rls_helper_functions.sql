-- Remplace les fonctions RLS legacy pour qu'elles lisent profiles au lieu de l'ancienne table users.
-- Aucune policy n'a besoin d'être modifiée : CREATE OR REPLACE propage le correctif
-- à toutes les policies qui appellent ces fonctions (companies, subscriptions, users, invitations).

CREATE OR REPLACE FUNCTION public.get_current_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;
