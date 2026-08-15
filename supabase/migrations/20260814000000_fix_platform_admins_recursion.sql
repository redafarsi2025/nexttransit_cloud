-- =========================================================
-- NEXTTRANSIT
-- Fix: Infinite recursion in platform_admins RLS
-- Migration: 20260814000000_fix_platform_admins_recursion.sql
-- =========================================================

-- L'ancienne policy utilisait un EXISTS(SELECT 1 FROM platform_admins...) qui, 
-- lors de l'évaluation sur la table platform_admins elle-même, provoquait une boucle infinie.
-- Postgres lève alors l'erreur 42P17 (infinite recursion detected).
-- La correction consiste à vérifier directement `id = auth.uid()` sans sous-requête.

DROP POLICY IF EXISTS "Platform admins can read platform_admins" ON public.platform_admins;

CREATE POLICY "Platform admins can read platform_admins" 
ON public.platform_admins 
FOR SELECT 
TO authenticated 
USING (id = auth.uid());
