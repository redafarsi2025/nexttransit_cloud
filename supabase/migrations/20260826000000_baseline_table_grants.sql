-- =========================================================
-- BASELINE POSTGREST TABLE GRANTS FOR anon / authenticated
-- =========================================================
--
-- Every table in this schema has RLS enabled, but RLS only filters which rows a role
-- can see among the rows it is already privileged to touch -- it does not grant table
-- access by itself. No migration before this one ever issued a baseline
-- GRANT SELECT/INSERT/UPDATE/DELETE for anon/authenticated on any table except
-- login_attempts (20260809000000_login_attempts_table.sql:15-16).
--
-- Confirmed by direct query against a freshly-reset local stack: every other table's
-- entry in information_schema.role_table_grants for anon/authenticated only listed
-- TRUNCATE/REFERENCES/TRIGGER, inherited from schema public's default ACL for role
-- postgres (pg_default_acl: postgres=arwdDxtm, anon/authenticated=Dxtm -- i.e. every
-- privilege except SELECT/INSERT/UPDATE/DELETE). That's why
-- `SET LOCAL ROLE authenticated; SELECT * FROM vehicles;` fails with
-- "permission denied for table vehicles" even though a matching RLS policy exists --
-- this migration grants the access RLS was always assumed to be gating.
-- On the hosted Supabase project this went unnoticed because Supabase Cloud's own
-- project bootstrap applies these grants outside of versioned migrations; a
-- self-hosted instance (the real production target, see audit/07_ROADMAP_MVP.md
-- Phase 4) has no such implicit bootstrap, so it must be explicit and versioned here.

-- authenticated: full CRUD baseline on every table in public. RLS policies (already
-- verified enabled on every table, and audited live as free of unscoped/insecure
-- policies by supabase/tests/rls-isolation-test.sql) remain the real per-row gate.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Keep this true for tables created by future migrations too -- they're created by the
-- same role (postgres) whose default ACL is currently missing SELECT/INSERT/UPDATE/DELETE.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- anon: SELECT only, and only on the tables that already have an explicit
-- "Anon Demo Select ..." RLS policy scoped to the demo tenant (see
-- 20260807000000_demo_tenant_and_anonymous_rls.sql and
-- 20260808000000_tenants_rls_security.sql). Deliberately not broadened to every table
-- or defaulted for future tables, so anything without an explicit anon policy stays
-- unreachable by anon at the grant level too, not just the policy level.
GRANT SELECT ON
  public.vehicles,
  public.warranties,
  public.fuel_logs,
  public.work_orders,
  public.fleet_alerts,
  public.inventory_items,
  public.driver_incidents,
  public.tenants
TO anon;
