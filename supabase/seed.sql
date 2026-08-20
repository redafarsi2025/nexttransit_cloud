-- supabase/seed.sql
-- Run automatically by `supabase db reset` (local and --linked) after all migrations apply.
--
-- Deliberately minimal: the actual demo dataset (vehicles, warranties, fuel_logs) already lives
-- as JSON in public.demo_seed_snapshot, populated by migration
-- 20260807000000_demo_tenant_and_anonymous_rls.sql, and the demo tenant row itself is created by
-- that same migration. The only piece that was missing is calling the reset function that copies
-- the snapshot into the live operational tables — previously only reachable via the
-- reset-demo-tenant edge function, never invoked automatically after a fresh migration replay.
-- Re-implementing the seed data here as raw INSERTs would create a second source of truth for the
-- same demo fleet, which is exactly the class of problem this audit spent most of its time on
-- elsewhere (audit/03_ARCHITECTURE_QUALITE.md D1). Reuse the existing function instead.

SELECT public.reset_demo_tenant_data();
