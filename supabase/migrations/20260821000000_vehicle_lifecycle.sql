-- ==============================================================================
-- PHASE 3A-04: VEHICLE LIFECYCLE MANAGEMENT
-- ==============================================================================

-- 1. Alter Vehicles Table
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS vin VARCHAR(64),
ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'IN_SERVICE'
    CHECK (lifecycle_status IN ('ORDERED', 'PENDING_ACTIVATION', 'IN_SERVICE', 'IMMOBILIZED', 'RETIRED')),
ADD COLUMN IF NOT EXISTS acquisition_date DATE,
ADD COLUMN IF NOT EXISTS acquisition_cost NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS disposal_date DATE;

-- Enforce global uniqueness of VIN if present
ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_vin_key;
CREATE UNIQUE INDEX IF NOT EXISTS vehicles_vin_idx ON public.vehicles (vin) WHERE vin IS NOT NULL;

-- Remove deprecated assigned_driver_id since vehicle_assignments handles it now
ALTER TABLE public.vehicles DROP COLUMN IF EXISTS assigned_driver_id CASCADE;

-- 2. Create Lifecycle History Table
CREATE TABLE IF NOT EXISTS public.vehicle_lifecycle_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    reason TEXT,
    changed_by VARCHAR(255) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on history table
ALTER TABLE public.vehicle_lifecycle_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation SELECT for vehicle_lifecycle_history" ON public.vehicle_lifecycle_history;
CREATE POLICY "Tenant Isolation SELECT for vehicle_lifecycle_history" 
    ON public.vehicle_lifecycle_history FOR SELECT 
    USING (tenant_id = public.get_current_tenant_id());

-- 3. Lifecycle Update RPC (Strict State Machine)
CREATE OR REPLACE FUNCTION public.update_vehicle_lifecycle(
    p_vehicle_id UUID,
    p_new_status TEXT,
    p_reason TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_tenant_id UUID;
    v_vehicle_locked RECORD;
    v_actor_email VARCHAR(255);
BEGIN
    v_tenant_id := public.get_current_tenant_id();
    v_actor_email := COALESCE((auth.jwt() ->> 'email'), 'system@nexttransit.com');

    -- Lock the vehicle row
    SELECT id, tenant_id, lifecycle_status INTO v_vehicle_locked 
    FROM public.vehicles 
    WHERE id = p_vehicle_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vehicle % not found', p_vehicle_id;
    END IF;

    IF v_vehicle_locked.tenant_id != v_tenant_id THEN
        RAISE EXCEPTION 'Security Error: Vehicle tenant mismatch';
    END IF;

    -- Strict Transition Matrix Validation
    -- Current Status -> Allowed New Statuses
    IF v_vehicle_locked.lifecycle_status = 'ORDERED' THEN
        IF p_new_status NOT IN ('PENDING_ACTIVATION', 'RETIRED') THEN
            RAISE EXCEPTION 'Invalid transition from ORDERED to %', p_new_status;
        END IF;
    ELSIF v_vehicle_locked.lifecycle_status = 'PENDING_ACTIVATION' THEN
        IF p_new_status NOT IN ('IN_SERVICE', 'RETIRED') THEN
            RAISE EXCEPTION 'Invalid transition from PENDING_ACTIVATION to %', p_new_status;
        END IF;
    ELSIF v_vehicle_locked.lifecycle_status = 'IN_SERVICE' THEN
        IF p_new_status NOT IN ('IMMOBILIZED', 'RETIRED') THEN
            RAISE EXCEPTION 'Invalid transition from IN_SERVICE to %', p_new_status;
        END IF;
    ELSIF v_vehicle_locked.lifecycle_status = 'IMMOBILIZED' THEN
        IF p_new_status NOT IN ('IN_SERVICE', 'RETIRED') THEN
            RAISE EXCEPTION 'Invalid transition from IMMOBILIZED to %', p_new_status;
        END IF;
    ELSIF v_vehicle_locked.lifecycle_status = 'RETIRED' THEN
        RAISE EXCEPTION 'Invalid transition: RETIRED is a terminal state. Cannot transition to %', p_new_status;
    ELSE
        RAISE EXCEPTION 'Unknown current lifecycle_status: %', v_vehicle_locked.lifecycle_status;
    END IF;

    -- Update status
    UPDATE public.vehicles
    SET lifecycle_status = p_new_status,
        status_reason = COALESCE(p_reason, status_reason),
        updated_at = NOW()
    WHERE id = p_vehicle_id;

    -- Record Immutable History
    INSERT INTO public.vehicle_lifecycle_history (
        tenant_id, vehicle_id, previous_status, new_status, reason, changed_by
    ) VALUES (
        v_tenant_id, p_vehicle_id, v_vehicle_locked.lifecycle_status, p_new_status, p_reason, v_actor_email
    );

    -- Cross-cutting Audit Log
    INSERT INTO public.audit_logs (
        tenant_id, action, entity_name, entity_id, previous_value, new_value, user_role, user_email
    ) VALUES (
        v_tenant_id, 'VEHICLE_LIFECYCLE_CHANGED', 'vehicles', p_vehicle_id::text, 
        v_vehicle_locked.lifecycle_status,
        p_new_status,
        COALESCE(public.get_current_user_role(), 'SYSTEM'),
        v_actor_email
    );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.update_vehicle_lifecycle(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_vehicle_lifecycle(UUID, TEXT, TEXT) TO postgres, service_role, authenticated;
