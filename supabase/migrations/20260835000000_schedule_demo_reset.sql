-- =========================================================
-- SCHEDULE DEMO TENANT RESET (every 45 minutes)
-- =========================================================
-- Keeps the public demo tenant's displayed data fresh and bounds the impact of any residual
-- write path (e.g. a future code change that forgets the isDemoMode guard) to a 45-minute
-- window, on top of the database-level read-only lockdown in
-- 20260834000000_demo_tenant_readonly_lockdown.sql (the actual security boundary — this
-- schedule is a freshness/hygiene measure, not itself a safety-critical control).
--
-- REQUIRES the pg_cron extension to be enabled on this Supabase project (Database ->
-- Extensions -> pg_cron in the dashboard, or a project with pg_cron already available).
-- This migration will fail with "schema \"cron\" does not exist" if pg_cron isn't enabled —
-- enable it first, then re-run this migration.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Idempotent: unschedule any prior run of this job name before (re-)scheduling.
DO $$
BEGIN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'reset-demo-tenant-data';
EXCEPTION WHEN undefined_table THEN
    NULL; -- pg_cron not enabled yet; the CREATE EXTENSION above will have already failed first
END;
$$;

SELECT cron.schedule(
    'reset-demo-tenant-data',
    '*/45 * * * *',
    $$SELECT public.reset_demo_tenant_data();$$
);
