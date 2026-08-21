-- =========================================================
-- SECURITY FIX: vehicle_latest_position was bypassing RLS entirely
-- =========================================================
--
-- 20260827000000_vehicle_latest_position.sql created this view with a comment claiming "runs with
-- the invoker's own privileges... RLS on the underlying telemetry_events table still applies". That
-- claim was wrong. PostgreSQL views default security_invoker to false (this project runs PG 17,
-- where the option exists but is NOT the default) -- without it, a view executes against its
-- underlying tables AS THE VIEW'S OWNER, not as the querying role. Since the view owner (postgres)
-- isn't subject to the tenant_id = get_current_tenant_id() RLS policy on telemetry_events the way a
-- real anon/authenticated session is, ANY caller with SELECT on the view saw EVERY tenant's vehicle
-- positions, not just their own -- a real tenant-isolation bypass, not a hypothetical one. Confirmed
-- by direct testing: before this fix, `SET ROLE anon` could read all rows with zero matching RLS
-- policy; after, it correctly reads 0 until 20260828000000's demo-scoped policy allows exactly the
-- demo tenant's rows.
--
-- Fix: explicitly opt into invoker-rights execution, which is what the original comment assumed by
-- default.

ALTER VIEW public.vehicle_latest_position SET (security_invoker = true);
