-- ==============================================================================
-- PHASE 3A-01: VEHICLE ASSIGNMENT CLEAN REFACTOR
-- ==============================================================================

-- 1. Create the new vehicle_assignments table
CREATE TABLE IF NOT EXISTS public.vehicle_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unassigned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT vehicle_assignment_dates_valid CHECK (
        unassigned_at IS NULL OR unassigned_at > assigned_at
    )
);

-- 2. Enforce Database Integrity: Max one active assignment per vehicle
CREATE UNIQUE INDEX IF NOT EXISTS vehicle_assignments_one_active_vehicle
ON public.vehicle_assignments(vehicle_id)
WHERE unassigned_at IS NULL;

-- 3. Tenant Integrity: Trigger to ensure vehicle, driver, and assignment are in the same tenant
CREATE OR REPLACE FUNCTION public.check_vehicle_assignment_tenant()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant UUID;
    d_tenant UUID;
BEGIN
    SELECT tenant_id INTO v_tenant FROM public.vehicles WHERE id = NEW.vehicle_id;
    SELECT tenant_id INTO d_tenant FROM public.profiles WHERE id = NEW.driver_id;
    
    IF NEW.tenant_id != v_tenant OR NEW.tenant_id != d_tenant THEN
        RAISE EXCEPTION 'Cross-tenant assignment is prohibited (assignment tenant: %, vehicle: %, driver: %)', NEW.tenant_id, v_tenant, d_tenant;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.check_vehicle_assignment_tenant() FROM PUBLIC;
-- This function is called by a trigger, so we don't necessarily need to GRANT to roles explicitly, but it's safe to give Postgres execute access to roles that interact with the table.
GRANT EXECUTE ON FUNCTION public.check_vehicle_assignment_tenant() TO postgres, service_role, authenticated;

DROP TRIGGER IF EXISTS trg_check_vehicle_assignment_tenant ON public.vehicle_assignments;
CREATE TRIGGER trg_check_vehicle_assignment_tenant
BEFORE INSERT OR UPDATE ON public.vehicle_assignments
FOR EACH ROW
EXECUTE FUNCTION public.check_vehicle_assignment_tenant();

ALTER TABLE public.vehicle_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access vehicle assignments within their tenant" ON public.vehicle_assignments;
CREATE POLICY "Users can access vehicle assignments within their tenant"
ON public.vehicle_assignments
FOR ALL
USING (tenant_id = public.get_current_tenant_id());

-- 5. Additional Indexing
CREATE INDEX IF NOT EXISTS vehicle_assignments_vehicle_history_idx ON public.vehicle_assignments(vehicle_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS vehicle_assignments_driver_history_idx ON public.vehicle_assignments(driver_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS vehicle_assignments_tenant_idx ON public.vehicle_assignments(tenant_id);

-- 6. Drop dependent policies first
DROP POLICY IF EXISTS "RLS_WorkOrders_Select_Policy" ON public.work_orders;
DROP POLICY IF EXISTS "Users can read work orders for their tenant or assigned vehicles" ON public.work_orders;

DROP POLICY IF EXISTS "RLS_FleetAlerts_Select_Policy" ON public.fleet_alerts;
DROP POLICY IF EXISTS "Users can read fleet alerts for their tenant or assigned vehicles" ON public.fleet_alerts;

DROP POLICY IF EXISTS "RLS_Vehicles_Select_Policy" ON public.vehicles;
DROP POLICY IF EXISTS "Users can view vehicles in their tenant or assigned to them" ON public.vehicles;

-- 7. Remove Legacy Model (assigned_driver_id from vehicles)
ALTER TABLE public.vehicles DROP COLUMN IF EXISTS assigned_driver_id CASCADE;

-- 8. Recreate updated RLS policies replacing assigned_driver_id with vehicle_assignments logic

CREATE POLICY "RLS_WorkOrders_Select_Policy" ON public.work_orders
    FOR SELECT USING (
      tenant_id = public.get_current_tenant_id()
      OR (public.get_current_user_role() = 'DRIVER' AND vehicle_id IN (
          SELECT vehicle_id FROM public.vehicle_assignments 
          WHERE driver_id = auth.uid() AND unassigned_at IS NULL
      ))
    );

CREATE POLICY "RLS_FleetAlerts_Select_Policy" ON public.fleet_alerts
    FOR SELECT USING (
      tenant_id = public.get_current_tenant_id()
      OR (public.get_current_user_role() = 'DRIVER' AND vehicle_id IN (
          SELECT vehicle_id FROM public.vehicle_assignments 
          WHERE driver_id = auth.uid() AND unassigned_at IS NULL
      ))
    );

CREATE POLICY "RLS_Vehicles_Select_Policy" ON public.vehicles
    FOR SELECT USING (
      tenant_id = public.get_current_tenant_id()
      OR (
          public.get_current_user_role() = 'DRIVER' AND id IN (
              SELECT vehicle_id FROM public.vehicle_assignments 
              WHERE driver_id = auth.uid() AND unassigned_at IS NULL
          )
      )
    );

-- 8. Create RPC for atomic assignment
CREATE OR REPLACE FUNCTION public.assign_driver_to_vehicle(p_vehicle_id UUID, p_driver_id UUID)
RETURNS public.vehicle_assignments AS $$
DECLARE
    v_tenant_id UUID;
    v_assignment public.vehicle_assignments;
BEGIN
    -- Verify tenant (fallback to vehicle's tenant for service_role / background jobs)
    v_tenant_id := public.get_current_tenant_id();
    IF v_tenant_id IS NULL THEN
        SELECT tenant_id INTO v_tenant_id FROM public.vehicles WHERE id = p_vehicle_id;
    END IF;

    -- Close active assignment if exists
    UPDATE public.vehicle_assignments
    SET unassigned_at = NOW(), updated_at = NOW()
    WHERE vehicle_id = p_vehicle_id AND unassigned_at IS NULL;

    -- Create new assignment
    INSERT INTO public.vehicle_assignments (tenant_id, vehicle_id, driver_id, assigned_at)
    VALUES (v_tenant_id, p_vehicle_id, p_driver_id, NOW())
    RETURNING * INTO v_assignment;

    RETURN v_assignment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.assign_driver_to_vehicle(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_driver_to_vehicle(UUID, UUID) TO postgres, service_role, authenticated;
