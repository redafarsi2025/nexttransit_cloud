-- =========================================================
-- EPIC: CLOSE REMAINING ROLE-BASED RLS GAPS
-- Tables: work_orders, fleet_alerts, inventory_items
-- Fine-grained RBAC SELECT policies matching RLS_Finance_Select_Policy
-- Guaranteed compatibility across all schema variants (schema.sql & schema_clean.sql)
-- =========================================================

-- 1. Schema compatibility layer: Ensure required columns exist on target tables
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS assigned_driver_id VARCHAR(255);
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS assigned_mechanic_id VARCHAR(255);
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS assigned_mechanic_id VARCHAR(255);
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS parts_used JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS reserved_parts JSONB DEFAULT '[]'::jsonb;

-- 2. Helper function to extract user's role safely from profiles, users, or JWT
DROP FUNCTION IF EXISTS public.get_current_user_role() CASCADE;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS VARCHAR(64) AS $$
DECLARE
    u_role VARCHAR(64);
BEGIN
    -- 1. Try profiles table lookup by auth.uid()
    BEGIN
        SELECT role INTO u_role 
        FROM public.profiles 
        WHERE id::text = auth.uid()::text 
        LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        u_role := NULL;
    END;

    IF u_role IS NOT NULL AND u_role != '' THEN
        RETURN u_role;
    END IF;

    -- 2. Try users table lookup if present
    BEGIN
        SELECT role INTO u_role
        FROM public.users
        WHERE auth_user_id::text = auth.uid()::text OR id::text = auth.uid()::text
        LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        u_role := NULL;
    END;

    IF u_role IS NOT NULL AND u_role != '' THEN
        RETURN u_role;
    END IF;

    -- 3. Fallback to JWT claims metadata
    RETURN COALESCE(
        NULLIF(current_setting('request.jwt.claims', true)::json ->> 'role', ''),
        NULLIF(current_setting('request.jwt.claims', true)::json -> 'app_metadata' ->> 'role', ''),
        NULLIF(current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'role', ''),
        'DRIVER'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- 3. WORK ORDERS ROLE-BASED SELECT POLICY
DROP POLICY IF EXISTS "Tenant Isolation SELECT for work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "RLS_WorkOrders_Select_Policy" ON public.work_orders;

CREATE POLICY "RLS_WorkOrders_Select_Policy" ON public.work_orders
  FOR SELECT
  USING (
    tenant_id::text = public.get_current_tenant_id()::text
    AND (
      -- Full tenant visibility for managerial & operational roles
      public.get_current_user_role() IN ('SUPER_ADMIN', 'DIRECTOR', 'FLEET_MANAGER', 'MAINTENANCE_MANAGER', 'FINANCE', 'OPERATIONS')
      -- Mechanic: assigned work orders only
      OR (
        public.get_current_user_role() = 'MECHANIC'
        AND assigned_mechanic_id::text = auth.uid()::text
      )
      -- Driver: work orders for assigned vehicle only
      OR (
        public.get_current_user_role() = 'DRIVER'
        AND vehicle_id::text IN (
          SELECT id::text FROM public.vehicles WHERE assigned_driver_id::text = auth.uid()::text
        )
      )
    )
  );


-- 4. FLEET ALERTS ROLE-BASED SELECT POLICY
DROP POLICY IF EXISTS "Tenant Isolation SELECT for fleet_alerts" ON public.fleet_alerts;
DROP POLICY IF EXISTS "RLS_FleetAlerts_Select_Policy" ON public.fleet_alerts;

CREATE POLICY "RLS_FleetAlerts_Select_Policy" ON public.fleet_alerts
  FOR SELECT
  USING (
    tenant_id::text = public.get_current_tenant_id()::text
    AND (
      -- Full tenant visibility for managerial & operational roles
      public.get_current_user_role() IN ('SUPER_ADMIN', 'DIRECTOR', 'FLEET_MANAGER', 'MAINTENANCE_MANAGER', 'FINANCE', 'OPERATIONS')
      -- Mechanic: alerts on dispatched vehicles or assigned work orders
      OR (
        public.get_current_user_role() = 'MECHANIC'
        AND vehicle_id::text IN (
          SELECT id::text FROM public.vehicles WHERE assigned_mechanic_id::text = auth.uid()::text
          UNION
          SELECT vehicle_id::text FROM public.work_orders WHERE assigned_mechanic_id::text = auth.uid()::text
        )
      )
      -- Driver: alerts on assigned vehicle only
      OR (
        public.get_current_user_role() = 'DRIVER'
        AND vehicle_id::text IN (
          SELECT id::text FROM public.vehicles WHERE assigned_driver_id::text = auth.uid()::text
        )
      )
    )
  );


-- 5. INVENTORY ITEMS ROLE-BASED SELECT POLICY
DROP POLICY IF EXISTS "Tenant Isolation SELECT for inventory_items" ON public.inventory_items;
DROP POLICY IF EXISTS "RLS_Inventory_Select_Policy" ON public.inventory_items;

CREATE POLICY "RLS_Inventory_Select_Policy" ON public.inventory_items
  FOR SELECT
  USING (
    tenant_id::text = public.get_current_tenant_id()::text
    AND (
      -- Full tenant visibility for managers & operations
      public.get_current_user_role() IN ('SUPER_ADMIN', 'DIRECTOR', 'FLEET_MANAGER', 'MAINTENANCE_MANAGER', 'FINANCE', 'OPERATIONS')
      -- Mechanic: stock levels for parts linked to assigned work orders
      OR (
        public.get_current_user_role() = 'MECHANIC'
        AND (
          id::text IN (
            SELECT DISTINCT p->>'part_id'
            FROM public.work_orders wo,
                 jsonb_array_elements(COALESCE(wo.parts_used, wo.reserved_parts, '[]'::jsonb)) p
            WHERE wo.assigned_mechanic_id::text = auth.uid()::text
              AND p->>'part_id' IS NOT NULL
          )
          OR sku IN (
            SELECT DISTINCT p->>'sku'
            FROM public.work_orders wo,
                 jsonb_array_elements(COALESCE(wo.parts_used, wo.reserved_parts, '[]'::jsonb)) p
            WHERE wo.assigned_mechanic_id::text = auth.uid()::text
              AND p->>'sku' IS NOT NULL
          )
        )
      )
      -- Driver: no access to inventory (implicitly false)
    )
  );



