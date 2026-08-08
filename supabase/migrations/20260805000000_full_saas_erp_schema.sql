-- ============================================================
-- Migration: 20260805000000_full_saas_erp_schema.sql
-- Description: Schéma complet pour NextTransit (FlotteAkram)
-- Mode : Développement (suppression et recréation des tables)
-- ============================================================

-- 0. SUPPRESSION DES TABLES EXISTANTES (pour repartir de zéro)
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.cae_budget_metrics CASCADE;
DROP TABLE IF EXISTS public.cost_records CASCADE;
DROP TABLE IF EXISTS public.fuel_logs CASCADE;
DROP TABLE IF EXISTS public.warranties CASCADE;
DROP TABLE IF EXISTS public.work_orders CASCADE;
DROP TABLE IF EXISTS public.incidents CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;
DROP TABLE IF EXISTS public.vehicles CASCADE;
DROP TABLE IF EXISTS public.tenant_invitations CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;
DROP TABLE IF EXISTS public.fleet_alerts CASCADE;
DROP TABLE IF EXISTS public.driver_incidents CASCADE;
DROP TABLE IF EXISTS public.translation_cache CASCADE;
DROP TABLE IF EXISTS public.translation_memory CASCADE;
DROP TABLE IF EXISTS public.business_glossary CASCADE;
