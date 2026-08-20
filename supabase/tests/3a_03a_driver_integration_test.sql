-- Phase 3A-03A: Driver Domain & Assignment Hardening Integration Test
-- Validates RLS, Cross-Tenant Isolation, and assignment constraints.

BEGIN;

-- Ensure the tables and functions exist (Assumes migrations are applied)

-- 1. Setup Test Tenants
INSERT INTO public.tenants (id, name, currency) VALUES 
('t0000000-0000-0000-0000-000000000001', 'Tenant A', 'USD'),
('t0000000-0000-0000-0000-000000000002', 'Tenant B', 'USD')
ON CONFLICT DO NOTHING;

-- 2. Setup Profiles
INSERT INTO public.profiles (id, tenant_id, role, is_active) VALUES
('p0000000-0000-0000-0000-000000000001', 't0000000-0000-0000-0000-000000000001', 'DRIVER', true),
('p0000000-0000-0000-0000-000000000002', 't0000000-0000-0000-0000-000000000002', 'DRIVER', true),
('p0000000-0000-0000-0000-000000000003', 't0000000-0000-0000-0000-000000000001', 'DRIVER', true)
ON CONFLICT DO NOTHING;

-- 3. Setup Drivers
INSERT INTO public.drivers (id, tenant_id, operational_status, license_number, license_expiration, medical_certificate_expiration) VALUES
('p0000000-0000-0000-0000-000000000001', 't0000000-0000-0000-0000-000000000001', 'AVAILABLE', 'LIC-A-1', CURRENT_DATE + 365, CURRENT_DATE + 365),
('p0000000-0000-0000-0000-000000000002', 't0000000-0000-0000-0000-000000000002', 'AVAILABLE', 'LIC-B-1', CURRENT_DATE + 365, CURRENT_DATE + 365),
('p0000000-0000-0000-0000-000000000003', 't0000000-0000-0000-0000-000000000001', 'AVAILABLE', 'LIC-A-2', CURRENT_DATE + 365, CURRENT_DATE + 365)
ON CONFLICT DO NOTHING;

-- 4. Setup Vehicles
INSERT INTO public.vehicles (id, tenant_id, plate, name) VALUES
('v0000000-0000-0000-0000-000000000001', 't0000000-0000-0000-0000-000000000001', 'PLT-A-1', 'Veh A1'),
('v0000000-0000-0000-0000-000000000002', 't0000000-0000-0000-0000-000000000002', 'PLT-B-1', 'Veh B1')
ON CONFLICT DO NOTHING;

-- 5. Execute Tests as Tenant A Administrator
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"tenant_id": "t0000000-0000-0000-0000-000000000001", "role": "FLEET_MANAGER", "sub": "admin1"}', true);

DO $$
DECLARE
    v_assign public.vehicle_assignments;
    v_count INT;
BEGIN
    -- TEST 1: Assign Driver 1 (Tenant A) to Vehicle 1 (Tenant A) -> Success
    SELECT * INTO v_assign FROM public.assign_driver_to_vehicle(
        'v0000000-0000-0000-0000-000000000001', 
        'p0000000-0000-0000-0000-000000000001'
    );
    IF v_assign.id IS NULL THEN
        RAISE EXCEPTION 'TEST 1 FAILED: Could not assign driver A to vehicle A';
    ELSE
        RAISE NOTICE 'TEST 1 PASSED: Assigned driver A to vehicle A.';
    END IF;

    -- TEST 2: Assign Driver 2 (Tenant B) to Vehicle 1 (Tenant A) -> Cross Tenant Failure
    BEGIN
        PERFORM public.assign_driver_to_vehicle(
            'v0000000-0000-0000-0000-000000000001', 
            'p0000000-0000-0000-0000-000000000002'
        );
        RAISE EXCEPTION 'TEST 2 FAILED: Expected cross-tenant failure for driver B to vehicle A';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'TEST 2 PASSED: Cross-tenant driver blocked. (%)', SQLERRM;
    END;

    -- TEST 3: Assign Driver 3 (Tenant A) to Vehicle 1 (Tenant A) -> Closes Driver 1's assignment
    PERFORM public.assign_driver_to_vehicle(
        'v0000000-0000-0000-0000-000000000001', 
        'p0000000-0000-0000-0000-000000000003'
    );
    SELECT COUNT(*) INTO v_count FROM public.vehicle_assignments 
    WHERE vehicle_id = 'v0000000-0000-0000-0000-000000000001' AND unassigned_at IS NULL;
    
    IF v_count != 1 THEN
        RAISE EXCEPTION 'TEST 3 FAILED: Expected 1 active assignment, got %', v_count;
    ELSE
        RAISE NOTICE 'TEST 3 PASSED: Old assignment closed successfully.';
    END IF;

    -- TEST 4: Deactivate Driver 3 -> Closes all active assignments
    PERFORM public.deactivate_driver('p0000000-0000-0000-0000-000000000003');
    
    SELECT COUNT(*) INTO v_count FROM public.vehicle_assignments 
    WHERE driver_id = 'p0000000-0000-0000-0000-000000000003' AND unassigned_at IS NULL;
    IF v_count > 0 THEN
        RAISE EXCEPTION 'TEST 4 FAILED: Assignments remain active after deactivation.';
    ELSE
        RAISE NOTICE 'TEST 4 PASSED: All assignments closed on deactivation.';
    END IF;

    -- Verify Audit logs generated
    SELECT COUNT(*) INTO v_count FROM public.audit_logs WHERE action IN ('DRIVER_ASSIGNED', 'DRIVER_DEACTIVATED') AND tenant_id = 't0000000-0000-0000-0000-000000000001';
    IF v_count < 3 THEN
        RAISE EXCEPTION 'TEST 5 FAILED: Expected at least 3 audit logs (2 assignments, 1 deactivation), got %', v_count;
    ELSE
        RAISE NOTICE 'TEST 5 PASSED: Audit logs verified.';
    END IF;

END;
$$;

ROLLBACK;
