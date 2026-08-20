-- ==============================================================================
-- PHASE 3A-03: DRIVER MANAGEMENT & OPERATIONAL ASSIGNMENT HARDENING
-- ==============================================================================

-- 1. Create Drivers Table
CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE RESTRICT,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
    operational_status TEXT NOT NULL DEFAULT 'AVAILABLE'
        CHECK (
            operational_status IN (
                'AVAILABLE',
                'ON_LEAVE',
                'SICK',
                'SUSPENDED',
                'INACTIVE'
            )
        ),
    license_number TEXT NOT NULL,
    license_category TEXT,
    license_expiration DATE,
    medical_certificate_expiration DATE,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, license_number)
);

-- Cross-table integrity constraint using a trigger
CREATE OR REPLACE FUNCTION public.check_driver_tenant_integrity()
RETURNS TRIGGER AS $$
DECLARE
    v_profile_tenant UUID;
BEGIN
    SELECT tenant_id INTO v_profile_tenant FROM public.profiles WHERE id = NEW.id;
    IF v_profile_tenant != NEW.tenant_id THEN
        RAISE EXCEPTION 'Driver tenant_id (%) must match Profile tenant_id (%)', NEW.tenant_id, v_profile_tenant;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.check_driver_tenant_integrity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_driver_tenant_integrity() TO postgres, service_role, authenticated;

DROP TRIGGER IF EXISTS trg_check_driver_tenant_integrity ON public.drivers;
CREATE TRIGGER trg_check_driver_tenant_integrity
BEFORE INSERT OR UPDATE ON public.drivers
FOR EACH ROW
EXECUTE FUNCTION public.check_driver_tenant_integrity();

-- RLS for drivers
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant Isolation SELECT for drivers" ON public.drivers FOR SELECT USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant Isolation INSERT for drivers" ON public.drivers FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant Isolation UPDATE for drivers" ON public.drivers FOR UPDATE USING (tenant_id = public.get_current_tenant_id()) WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant Isolation DELETE for drivers" ON public.drivers FOR DELETE USING (tenant_id = public.get_current_tenant_id());

-- Attach updated_at trigger
DROP TRIGGER IF EXISTS set_updated_at ON public.drivers;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.drivers
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 2. Alter vehicle_assignments to add assignment_type and unassignment_reason
ALTER TABLE public.vehicle_assignments
ADD COLUMN IF NOT EXISTS assignment_type TEXT NOT NULL DEFAULT 'PRIMARY'
    CHECK (assignment_type IN ('PRIMARY', 'SECONDARY', 'TEMPORARY')),
ADD COLUMN IF NOT EXISTS unassignment_reason TEXT
    CHECK (unassignment_reason IN ('MANUAL', 'REASSIGNED', 'DRIVER_DEACTIVATED', 'DRIVER_SUSPENDED', 'VEHICLE_ARCHIVED', 'SYSTEM'));

-- Drop old assign_driver_to_vehicle function to replace with new signature
DROP FUNCTION IF EXISTS public.assign_driver_to_vehicle(UUID, UUID);

-- 3. Hardened assign_driver_to_vehicle RPC
CREATE OR REPLACE FUNCTION public.assign_driver_to_vehicle(
    p_vehicle_id UUID, 
    p_driver_id UUID,
    p_assignment_type TEXT DEFAULT 'PRIMARY'
)
RETURNS public.vehicle_assignments AS $$
DECLARE
    v_tenant_id UUID;
    v_profile_active BOOLEAN;
    v_driver_status TEXT;
    v_license_exp DATE;
    v_medical_exp DATE;
    v_assignment public.vehicle_assignments;
    v_vehicle_locked RECORD;
BEGIN
    -- Resolve Current Tenant
    v_tenant_id := public.get_current_tenant_id();

    -- Verify Vehicle exists, get tenant and lock row
    SELECT id, tenant_id INTO v_vehicle_locked 
    FROM public.vehicles 
    WHERE id = p_vehicle_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vehicle % not found', p_vehicle_id;
    END IF;

    IF v_tenant_id IS NULL THEN
        v_tenant_id := v_vehicle_locked.tenant_id;
    END IF;

    IF v_tenant_id != v_vehicle_locked.tenant_id THEN
        RAISE EXCEPTION 'Security Error: Vehicle tenant mismatch';
    END IF;

    -- Validate Profile
    SELECT is_active INTO v_profile_active 
    FROM public.profiles 
    WHERE id = p_driver_id AND tenant_id = v_tenant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Driver Profile not found or tenant mismatch';
    END IF;

    IF NOT v_profile_active THEN
        RAISE EXCEPTION 'Driver Profile is not active';
    END IF;

    -- Validate Driver Qualifications
    SELECT operational_status, license_expiration, medical_certificate_expiration 
    INTO v_driver_status, v_license_exp, v_medical_exp
    FROM public.drivers
    WHERE id = p_driver_id AND tenant_id = v_tenant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Driver qualifications not found. Driver subsystem initialization required.';
    END IF;

    IF v_driver_status != 'AVAILABLE' THEN
        RAISE EXCEPTION 'Driver is not AVAILABLE (Status: %)', v_driver_status;
    END IF;

    IF v_license_exp IS NOT NULL AND v_license_exp < CURRENT_DATE THEN
        RAISE EXCEPTION 'Driver license has expired';
    END IF;

    IF v_medical_exp IS NOT NULL AND v_medical_exp < CURRENT_DATE THEN
        RAISE EXCEPTION 'Driver medical certificate has expired';
    END IF;

    -- Close current assignment for THIS VEHICLE ONLY
    UPDATE public.vehicle_assignments
    SET unassigned_at = NOW(), 
        updated_at = NOW(),
        unassignment_reason = 'REASSIGNED'
    WHERE vehicle_id = p_vehicle_id AND unassigned_at IS NULL;

    -- Note: We DO NOT unassign the driver from other vehicles per NextTransit specifications.

    -- Create new assignment
    INSERT INTO public.vehicle_assignments (
        tenant_id, vehicle_id, driver_id, assignment_type, assigned_at
    )
    VALUES (
        v_tenant_id, p_vehicle_id, p_driver_id, p_assignment_type, NOW()
    )
    RETURNING * INTO v_assignment;

    -- Generate Business Audit Event
    INSERT INTO public.audit_logs (
        tenant_id, action, entity_name, entity_id, new_value, user_role, user_email
    ) VALUES (
        v_tenant_id, 'DRIVER_ASSIGNED', 'vehicle_assignments', v_assignment.id::text, 
        jsonb_build_object('vehicle_id', p_vehicle_id, 'driver_id', p_driver_id, 'type', p_assignment_type)::text,
        COALESCE(public.get_current_user_role(), 'SYSTEM'),
        COALESCE((auth.jwt() ->> 'email'), 'system@nexttransit.com')
    );

    RETURN v_assignment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.assign_driver_to_vehicle(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_driver_to_vehicle(UUID, UUID, TEXT) TO postgres, service_role, authenticated;

-- 4. Driver Deactivation RPC
CREATE OR REPLACE FUNCTION public.deactivate_driver(p_driver_id UUID)
RETURNS void AS $$
DECLARE
    v_tenant_id UUID;
    v_profile_exists BOOLEAN;
BEGIN
    v_tenant_id := public.get_current_tenant_id();

    -- Ensure driver exists in current tenant
    SELECT TRUE INTO v_profile_exists FROM public.profiles WHERE id = p_driver_id AND tenant_id = v_tenant_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Driver not found or tenant mismatch';
    END IF;

    -- 1. profiles.is_active = false
    UPDATE public.profiles SET is_active = FALSE, updated_at = NOW() WHERE id = p_driver_id;

    -- 2. drivers.operational_status = INACTIVE
    UPDATE public.drivers SET operational_status = 'INACTIVE', updated_at = NOW(), archived_at = NOW() WHERE id = p_driver_id;

    -- 3. Close all active assignments
    UPDATE public.vehicle_assignments
    SET unassigned_at = NOW(),
        updated_at = NOW(),
        unassignment_reason = 'DRIVER_DEACTIVATED'
    WHERE driver_id = p_driver_id AND unassigned_at IS NULL;

    -- 4. Audit
    INSERT INTO public.audit_logs (
        tenant_id, action, entity_name, entity_id, new_value, user_role, user_email
    ) VALUES (
        v_tenant_id, 'DRIVER_DEACTIVATED', 'profiles', p_driver_id::text, 
        jsonb_build_object('reason', 'Driver deactivated operationally')::text,
        COALESCE(public.get_current_user_role(), 'SYSTEM'),
        COALESCE((auth.jwt() ->> 'email'), 'system@nexttransit.com')
    );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.deactivate_driver(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deactivate_driver(UUID) TO postgres, service_role, authenticated;
