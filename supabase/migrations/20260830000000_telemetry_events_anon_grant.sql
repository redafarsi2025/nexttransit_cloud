-- =========================================================
-- ANON BASE GRANT ON telemetry_events (missed when the RLS policy was added)
-- =========================================================
--
-- 20260828000000_anon_demo_telemetry_events.sql added an RLS policy letting anon read the demo
-- tenant's telemetry_events rows, but never granted anon the underlying table-level SELECT itself.
-- On the reconstructed staging project this went unnoticed because Supabase Cloud's own platform
-- provisioning already grants anon broad table-level access there (see
-- audit/08_RECONCILIATION.md §6) -- but locally, where 20260826000000_baseline_table_grants.sql
-- deliberately keeps anon's grants minimal (8 specific tables, telemetry_events not among them),
-- the missing grant surfaces immediately as "permission denied for table telemetry_events" even
-- with 20260829000000's security_invoker fix and a passing RLS policy in place. GRANT is checked
-- before RLS, so both are required.

GRANT SELECT ON public.telemetry_events TO anon;
