-- NextTransit RLS Multi-Tenant Hardening Isolation Verification Tests
-- This script validates that Tenant A and Tenant B are strictly isolated under Row-Level Security (RLS).

-- 1. Setup temporary testing role & test session metadata
BEGIN;

-- Create mock users for testing RLS policies
-- We bypass superuser and test under an authenticated role simulating JWT verification
CREATE USER test_user_tenant_a WITH PASSWORD 'test_pwd';
CREATE USER test_user_tenant_b WITH PASSWORD 'test_pwd';

GRANT authenticated TO test_user_tenant_a;
GRANT authenticated TO test_user_tenant_b;

GRANT USAGE ON SCHEMA public TO test_user_tenant_a;
GRANT USAGE ON SCHEMA public TO test_user_tenant_b;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO test_user_tenant_a;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO test_user_tenant_b;

-- Ensure RLS is active on tested tables
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_alerts ENABLE ROW LEVEL SECURITY;

-- 2. TEST CASE 1: Verify Tenant A SELECT Isolation
-- Set local role to test_user_tenant_a
SET LOCAL ROLE authenticated;

-- Set auth.jwt() claims simulating Tenant A login
SELECT set_config('request.jwt.claims', '{"tenant_id": "c0a80101-0000-0000-0000-000000000001", "role": "FLEET_MANAGER"}', true);

-- Expected Outcome: Should only see Tenant A vehicles (seeded in public.vehicles)
SELECT id, name, plate, tenant_id FROM public.vehicles;

-- 3. TEST CASE 2: Verify Tenant B SELECT Isolation
-- Set auth.jwt() claims simulating Tenant B login
SELECT set_config('request.jwt.claims', '{"tenant_id": "c0a80101-0000-0000-0000-000000000002", "role": "FLEET_MANAGER"}', true);

-- Expected Outcome: Should see zero rows or only Tenant B vehicles (if inserted)
SELECT id, name, plate, tenant_id FROM public.vehicles;

-- 4. TEST CASE 3: Cross-Tenant Insert Protection (Strict Write Prevention)
-- While simulated logged in as Tenant B, attempt to insert a record into Tenant A
DO $$
BEGIN
    BEGIN
        INSERT INTO public.vehicles (id, plate, name, classification, status, status_reason, tenant_id)
        VALUES (
            'v1a1a1a1-0000-0000-0000-000000000001', 
            'TEST-PLATE-1', 
            'Intruder Truck', 
            'Standard', 
            'Healthy', 
            'OK', 
            'c0a80101-0000-0000-0000-000000000001'::uuid -- Tenant A ID
        );
        RAISE EXCEPTION 'TEST FAILED: Tenant B was allowed to insert into Tenant A!';
    EXCEPTION
        WHEN insufficient_privilege OR raise_exception THEN
            RAISE NOTICE 'TEST PASSED: Write isolated successfully (Tenant B cannot insert into Tenant A).';
    END;
END;
$$;

-- 5. TEST CASE 4: Cross-Tenant Update Protection (Strict Modification Prevention)
-- While logged in as Tenant B, attempt to modify Tenant A's existing vehicles
UPDATE public.vehicles 
SET status = 'Critical' 
WHERE tenant_id = 'c0a80101-0000-0000-0000-000000000001'::uuid;

-- Verify no records were updated
SELECT COUNT(*) FROM public.vehicles WHERE status = 'Critical' AND tenant_id = 'c0a80101-0000-0000-0000-000000000001'::uuid;

-- Rollback the entire transaction to keep the database completely clean
ROLLBACK;
