-- Migration: 20260824000000_demo_seed_snapshot_rls.sql
-- Description: Enable RLS on public.demo_seed_snapshot, restricted to service_role only.
--
-- Context: this table stores JSON snapshots of demo-tenant seed data (vehicles,
-- warranties, fuel_logs) used to reset the demo tenant. It was created in
-- 20260807000000_demo_tenant_and_anonymous_rls.sql without RLS ever being enabled
-- on it — the only table in the schema in that state, confirmed by direct query
-- against pg_class (see scripts/diag/compare-schemas.cjs), consistent with
-- audit/02_SECURITE.md C2-1. It only needs to be read/written by the server-side
-- demo-reset routine, never by an anon/authenticated client, so the fix is to
-- enable RLS with no policy for anon/authenticated (default-deny) and an explicit
-- policy for service_role.

ALTER TABLE public.demo_seed_snapshot ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only access to demo_seed_snapshot" ON public.demo_seed_snapshot;
CREATE POLICY "Service role only access to demo_seed_snapshot"
  ON public.demo_seed_snapshot
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
