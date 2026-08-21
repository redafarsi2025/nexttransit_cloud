-- =========================================================
-- ANON DEMO ACCESS TO telemetry_events (fixes empty Control Room live map in demo mode)
-- =========================================================
--
-- vehicle_latest_position (20260827000000_vehicle_latest_position.sql) is a plain view over
-- telemetry_events, so it inherits that table's RLS. telemetry_events only has a tenant-scoped
-- policy keyed off get_current_tenant_id() (reads a JWT claim) -- for the anonymous "Try Demo"
-- session (src/components/screens/LandingPage.tsx's enterDemoMode(), no sign-in, anon key only)
-- that claim is NULL, so tenant_id = NULL never matches and RLS denies every row. Every other
-- demo-relevant table (vehicles, warranties, fuel_logs, work_orders, fleet_alerts, inventory_items,
-- driver_incidents, tenants) already has an explicit "Anon Demo Select ..." policy hardcoded to the
-- demo tenant ID for exactly this reason (see 20260807000000_demo_tenant_and_anonymous_rls.sql and
-- 20260808000000_tenants_rls_security.sql) -- telemetry_events was simply missed when that pattern
-- was established, since it didn't exist yet at the time.

DROP POLICY IF EXISTS "Anon Demo Select TelemetryEvents" ON public.telemetry_events;

CREATE POLICY "Anon Demo Select TelemetryEvents"
  ON public.telemetry_events FOR SELECT TO anon
  USING (tenant_id = 'c0a80101-0000-0000-0000-000000000001'::uuid);

-- The RLS policy above only unblocks the underlying table; the view itself also needs its own
-- grant (20260827000000_vehicle_latest_position.sql only granted it to authenticated, matching
-- local's deliberately minimal anon surface -- but the demo flow is anonymous, so anon needs it too,
-- same as it already has SELECT on vehicles/warranties/fuel_logs/etc.).
GRANT SELECT ON public.vehicle_latest_position TO anon;
