-- NextTransit RLS Role-Based Policy Verification Tests
-- Validates role-level access restrictions for work_orders, fleet_alerts, and inventory_items

BEGIN;

-- 1. Setup temporary test users simulating authenticated session with JWT claims
CREATE USER test_fleet_manager WITH PASSWORD 'test_pwd';
CREATE USER test_mechanic WITH PASSWORD 'test_pwd';
CREATE USER test_driver WITH PASSWORD 'test_pwd';

GRANT authenticated TO test_fleet_manager, test_mechanic, test_driver;
GRANT USAGE ON SCHEMA public TO test_fleet_manager, test_mechanic, test_driver;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO test_fleet_manager, test_mechanic, test_driver;

-- Ensure RLS is enabled
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- 2. TEST CASE 1: FLEET_MANAGER (Full Tenant Set Access)
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"tenant_id": "c0a80101-0000-0000-0000-000000000001", "role": "FLEET_MANAGER", "sub": "f1000000-0000-0000-0000-000000000001"}', true);

-- FLEET_MANAGER sees all tenant work orders
SELECT COUNT(*) FROM public.work_orders;

-- FLEET_MANAGER sees all tenant fleet alerts
SELECT COUNT(*) FROM public.fleet_alerts;

-- FLEET_MANAGER sees all tenant inventory items
SELECT COUNT(*) FROM public.inventory_items;


-- 3. TEST CASE 2: MECHANIC (Assigned Work Orders & Dispatched Alerts & Needed Inventory Only)
SELECT set_config('request.jwt.claims', '{"tenant_id": "c0a80101-0000-0000-0000-000000000001", "role": "MECHANIC", "sub": "e1000000-0000-0000-0000-000000000001"}', true);

-- MECHANIC sees only assigned work orders
SELECT COUNT(*) FROM public.work_orders 
WHERE assigned_mechanic_id != 'e1000000-0000-0000-0000-000000000001'; -- Expected count: 0

-- MECHANIC sees only alerts on dispatched vehicles
SELECT COUNT(*) FROM public.fleet_alerts;

-- MECHANIC sees stock levels only for parts linked to their assigned work orders
SELECT COUNT(*) FROM public.inventory_items;


-- 4. TEST CASE 3: DRIVER (Assigned Vehicle Work Orders & Alerts Only, 0 Inventory Access)
SELECT set_config('request.jwt.claims', '{"tenant_id": "c0a80101-0000-0000-0000-000000000001", "role": "DRIVER", "sub": "d1000000-0000-0000-0000-000000000001"}', true);

-- DRIVER sees only work orders on their assigned vehicle
SELECT COUNT(*) FROM public.work_orders;

-- DRIVER sees only alerts on their assigned vehicle
SELECT COUNT(*) FROM public.fleet_alerts;

-- DRIVER has ZERO access to inventory items
DO $$
DECLARE
  item_count INT;
BEGIN
  SELECT COUNT(*) INTO item_count FROM public.inventory_items;
  IF item_count > 0 THEN
    RAISE EXCEPTION 'TEST FAILED: DRIVER should have 0 access to inventory_items, but saw % rows', item_count;
  ELSE
    RAISE NOTICE 'TEST PASSED: DRIVER has 0 access to inventory_items.';
  END IF;
END;
$$;

ROLLBACK;
