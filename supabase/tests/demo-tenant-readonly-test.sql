-- NextTransit Demo Tenant Read-Only Lockdown Verification Test
-- Validates supabase/migrations/20260834000000_demo_tenant_readonly_lockdown.sql:
--   1. An authenticated TENANT_ADMIN write to the DEMO tenant is rejected at the DB level,
--      even though tenant-isolation RLS alone would otherwise permit it (same-tenant match).
--   2. The identical write against a NON-demo tenant still succeeds (the lockdown is scoped
--      to the demo tenant only, not a regression on real tenants).
--   3. reset_demo_tenant_data() can still write to the demo tenant despite the lockdown
--      (its own bypass flag), and restores the expected row counts from demo_seed_snapshot.
--
-- Run with: psql "$DATABASE_URL" -f supabase/tests/demo-tenant-readonly-test.sql

BEGIN;

CREATE USER test_demo_tenant_admin WITH PASSWORD 'test_pwd';
GRANT authenticated TO test_demo_tenant_admin;
GRANT USAGE ON SCHEMA public TO test_demo_tenant_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO test_demo_tenant_admin;

-- A throwaway non-demo tenant + vehicle to prove the lockdown doesn't overreach.
INSERT INTO public.tenants (id, name, currency)
VALUES ('e1a1a1a1-0000-0000-0000-000000000099'::uuid, 'RLS Test Tenant (non-demo)', 'USD ($)')
ON CONFLICT (id) DO NOTHING;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"tenant_id": "c0a80101-0000-0000-0000-000000000001", "role": "TENANT_ADMIN"}', true);

-- 1. Demo tenant write must be rejected (insufficient_privilege from block_demo_tenant_writes).
DO $$
BEGIN
    BEGIN
        INSERT INTO public.vehicles (id, plate, name, classification, status, status_reason, tenant_id)
        VALUES (
            'b2b2b2b2-0000-0000-0000-000000000001'::uuid,
            'DEMO-WRITE-TEST', 'Intruder Vehicle', 'Standard', 'Healthy', 'OK',
            'c0a80101-0000-0000-0000-000000000001'::uuid
        );
        RAISE EXCEPTION 'TEST FAILED: write to the demo tenant was allowed — read-only lockdown is not enforced.';
    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE NOTICE 'TEST PASSED: demo tenant INSERT correctly rejected by block_demo_tenant_writes.';
    END;
END;
$$;

-- 2. Same operation against a non-demo tenant must still succeed (no regression).
SELECT set_config('request.jwt.claims', '{"tenant_id": "e1a1a1a1-0000-0000-0000-000000000099", "role": "TENANT_ADMIN"}', true);
DO $$
BEGIN
    INSERT INTO public.vehicles (id, plate, name, classification, status, status_reason, tenant_id)
    VALUES (
        'b2b2b2b2-0000-0000-0000-000000000002'::uuid,
        'REAL-TENANT-WRITE-TEST', 'Legit Vehicle', 'Standard', 'Healthy', 'OK',
        'e1a1a1a1-0000-0000-0000-000000000099'::uuid
    );
    RAISE NOTICE 'TEST PASSED: non-demo tenant INSERT succeeded (lockdown correctly scoped).';
END;
$$;

RESET ROLE;

-- 3. reset_demo_tenant_data() must still be able to write to the demo tenant (its own bypass),
-- and must restore at least the snapshot's vehicle count.
DO $$
DECLARE
    expected_vehicle_count INTEGER;
    actual_vehicle_count INTEGER;
BEGIN
    SELECT jsonb_array_length(snapshot_data) INTO expected_vehicle_count
    FROM public.demo_seed_snapshot WHERE table_name = 'vehicles';

    PERFORM public.reset_demo_tenant_data();

    SELECT COUNT(*) INTO actual_vehicle_count
    FROM public.vehicles WHERE tenant_id = 'c0a80101-0000-0000-0000-000000000001'::uuid;

    IF expected_vehicle_count IS NULL THEN
        RAISE NOTICE 'SKIPPED: demo_seed_snapshot has no vehicles row to compare against yet (run scripts/sync-demo-snapshot.ts first).';
    ELSIF actual_vehicle_count <> expected_vehicle_count THEN
        RAISE EXCEPTION 'TEST FAILED: reset_demo_tenant_data() restored % vehicles, snapshot has %.', actual_vehicle_count, expected_vehicle_count;
    ELSE
        RAISE NOTICE 'TEST PASSED: reset_demo_tenant_data() restored exactly % vehicles from snapshot.', actual_vehicle_count;
    END IF;
END;
$$;

ROLLBACK;
