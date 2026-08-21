-- NextTransit RLS Role-Based Policy Verification Tests
-- Validates role-level access restrictions for work_orders, fleet_alerts, and inventory_items
--
-- Every role section below asserts against a ground-truth baseline computed by bypassing RLS
-- (queried while still running as the migration/table-owner role, before SET LOCAL ROLE
-- authenticated). This is required, not cosmetic: a plain "SELECT COUNT(*)" with no comparison
-- "passes" even when tenant/role resolution silently fails and every policy branch evaluates to
-- false (e.g. get_current_tenant_id() returning NULL) — the query just returns 0 rows and no
-- error is raised. Comparing against the RLS-bypassed baseline catches that silent-empty-result
-- failure mode instead of rubber-stamping it.

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

-- 2. Capture RLS-bypassed ground-truth baselines while still running as the table-owner role
--    (before SET LOCAL ROLE authenticated below). Stored via set_config so they remain readable
--    after the role switch, mirroring how request.jwt.claims is threaded through this file.
DO $$
DECLARE
  v_tenant_id   TEXT := 'c0a80101-0000-0000-0000-000000000001';
  v_mechanic_id TEXT := 'e1000000-0000-0000-0000-000000000001';
  v_driver_id   TEXT := 'd1000000-0000-0000-0000-000000000001';
  v_count       INT;
BEGIN
  -- FLEET_MANAGER: full tenant visibility
  SELECT COUNT(*) INTO v_count FROM public.work_orders WHERE tenant_id::text = v_tenant_id;
  PERFORM set_config('rls_test.fm_work_orders', v_count::text, true);

  SELECT COUNT(*) INTO v_count FROM public.fleet_alerts WHERE tenant_id::text = v_tenant_id;
  PERFORM set_config('rls_test.fm_fleet_alerts', v_count::text, true);

  SELECT COUNT(*) INTO v_count FROM public.inventory_items WHERE tenant_id::text = v_tenant_id;
  PERFORM set_config('rls_test.fm_inventory_items', v_count::text, true);

  -- MECHANIC: assigned work orders only
  SELECT COUNT(*) INTO v_count
  FROM public.work_orders
  WHERE tenant_id::text = v_tenant_id AND assigned_mechanic_id::text = v_mechanic_id;
  PERFORM set_config('rls_test.mech_work_orders', v_count::text, true);

  -- MECHANIC: alerts on vehicles they're dispatched to or have an assigned work order for
  SELECT COUNT(*) INTO v_count
  FROM public.fleet_alerts fa
  WHERE fa.tenant_id::text = v_tenant_id
    AND fa.vehicle_id::text IN (
      SELECT id::text FROM public.vehicles WHERE assigned_mechanic_id::text = v_mechanic_id
      UNION
      SELECT vehicle_id::text FROM public.work_orders WHERE assigned_mechanic_id::text = v_mechanic_id
    );
  PERFORM set_config('rls_test.mech_fleet_alerts', v_count::text, true);

  -- MECHANIC: inventory for parts linked to their assigned work orders (mirrors RLS_Inventory_Select_Policy)
  SELECT COUNT(*) INTO v_count
  FROM public.inventory_items ii
  WHERE ii.tenant_id::text = v_tenant_id
    AND (
      ii.id::text IN (
        SELECT DISTINCT p->>'part_id'
        FROM public.work_orders wo, jsonb_array_elements(COALESCE(wo.parts_used, wo.reserved_parts, '[]'::jsonb)) p
        WHERE wo.assigned_mechanic_id::text = v_mechanic_id AND p->>'part_id' IS NOT NULL
      )
      OR ii.sku IN (
        SELECT DISTINCT p->>'sku'
        FROM public.work_orders wo, jsonb_array_elements(COALESCE(wo.parts_used, wo.reserved_parts, '[]'::jsonb)) p
        WHERE wo.assigned_mechanic_id::text = v_mechanic_id AND p->>'sku' IS NOT NULL
      )
    );
  PERFORM set_config('rls_test.mech_inventory_items', v_count::text, true);

  -- DRIVER: work orders / alerts on their assigned vehicle only
  SELECT COUNT(*) INTO v_count
  FROM public.work_orders wo
  WHERE wo.tenant_id::text = v_tenant_id
    AND wo.vehicle_id::text IN (SELECT id::text FROM public.vehicles WHERE assigned_driver_id::text = v_driver_id);
  PERFORM set_config('rls_test.driver_work_orders', v_count::text, true);

  SELECT COUNT(*) INTO v_count
  FROM public.fleet_alerts fa
  WHERE fa.tenant_id::text = v_tenant_id
    AND fa.vehicle_id::text IN (SELECT id::text FROM public.vehicles WHERE assigned_driver_id::text = v_driver_id);
  PERFORM set_config('rls_test.driver_fleet_alerts', v_count::text, true);

  RAISE NOTICE 'Baselines captured (bypassing RLS): FM wo=%, alerts=%, inv=% | MECH wo=%, alerts=%, inv=% | DRIVER wo=%, alerts=%',
    current_setting('rls_test.fm_work_orders'), current_setting('rls_test.fm_fleet_alerts'), current_setting('rls_test.fm_inventory_items'),
    current_setting('rls_test.mech_work_orders'), current_setting('rls_test.mech_fleet_alerts'), current_setting('rls_test.mech_inventory_items'),
    current_setting('rls_test.driver_work_orders'), current_setting('rls_test.driver_fleet_alerts');
END;
$$;


-- 3. TEST CASE 1: FLEET_MANAGER (Full Tenant Set Access)
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"tenant_id": "c0a80101-0000-0000-0000-000000000001", "role": "FLEET_MANAGER", "sub": "f1000000-0000-0000-0000-000000000001"}', true);

DO $$
DECLARE
  v_wo INT; v_alerts INT; v_inv INT;
  v_expected_wo INT := current_setting('rls_test.fm_work_orders')::int;
  v_expected_alerts INT := current_setting('rls_test.fm_fleet_alerts')::int;
  v_expected_inv INT := current_setting('rls_test.fm_inventory_items')::int;
BEGIN
  SELECT COUNT(*) INTO v_wo FROM public.work_orders;
  SELECT COUNT(*) INTO v_alerts FROM public.fleet_alerts;
  SELECT COUNT(*) INTO v_inv FROM public.inventory_items;

  IF v_wo != v_expected_wo THEN
    RAISE EXCEPTION 'TEST FAILED: FLEET_MANAGER should see all % tenant work orders, saw % (tenant/role resolution may have failed silently)', v_expected_wo, v_wo;
  END IF;
  IF v_alerts != v_expected_alerts THEN
    RAISE EXCEPTION 'TEST FAILED: FLEET_MANAGER should see all % tenant fleet alerts, saw % (tenant/role resolution may have failed silently)', v_expected_alerts, v_alerts;
  END IF;
  IF v_inv != v_expected_inv THEN
    RAISE EXCEPTION 'TEST FAILED: FLEET_MANAGER should see all % tenant inventory items, saw % (tenant/role resolution may have failed silently)', v_expected_inv, v_inv;
  END IF;

  RAISE NOTICE 'TEST PASSED: FLEET_MANAGER has full tenant visibility (wo=%, alerts=%, inv=%).', v_wo, v_alerts, v_inv;
END;
$$;


-- 4. TEST CASE 2: MECHANIC (Assigned Work Orders & Dispatched Alerts & Needed Inventory Only)
SELECT set_config('request.jwt.claims', '{"tenant_id": "c0a80101-0000-0000-0000-000000000001", "role": "MECHANIC", "sub": "e1000000-0000-0000-0000-000000000001"}', true);

DO $$
DECLARE
  v_wo INT; v_leaked_wo INT; v_alerts INT; v_inv INT;
  v_expected_wo INT := current_setting('rls_test.mech_work_orders')::int;
  v_expected_alerts INT := current_setting('rls_test.mech_fleet_alerts')::int;
  v_expected_inv INT := current_setting('rls_test.mech_inventory_items')::int;
BEGIN
  -- No leakage of work orders assigned to someone else
  SELECT COUNT(*) INTO v_leaked_wo
  FROM public.work_orders
  WHERE assigned_mechanic_id != 'e1000000-0000-0000-0000-000000000001';
  IF v_leaked_wo > 0 THEN
    RAISE EXCEPTION 'TEST FAILED: MECHANIC saw % work order(s) not assigned to them', v_leaked_wo;
  END IF;

  -- And sees exactly the full set they are entitled to (not silently 0)
  SELECT COUNT(*) INTO v_wo FROM public.work_orders;
  IF v_wo != v_expected_wo THEN
    RAISE EXCEPTION 'TEST FAILED: MECHANIC should see % assigned work order(s), saw % (tenant/role resolution may have failed silently)', v_expected_wo, v_wo;
  END IF;

  SELECT COUNT(*) INTO v_alerts FROM public.fleet_alerts;
  IF v_alerts != v_expected_alerts THEN
    RAISE EXCEPTION 'TEST FAILED: MECHANIC should see % dispatched-vehicle alert(s), saw % (tenant/role resolution may have failed silently)', v_expected_alerts, v_alerts;
  END IF;

  SELECT COUNT(*) INTO v_inv FROM public.inventory_items;
  IF v_inv != v_expected_inv THEN
    RAISE EXCEPTION 'TEST FAILED: MECHANIC should see % inventory item(s) linked to their work orders, saw % (tenant/role resolution may have failed silently)', v_expected_inv, v_inv;
  END IF;

  RAISE NOTICE 'TEST PASSED: MECHANIC is scoped to assigned work orders/alerts/inventory (wo=%, alerts=%, inv=%).', v_wo, v_alerts, v_inv;
END;
$$;


-- 5. TEST CASE 3: DRIVER (Assigned Vehicle Work Orders & Alerts Only, 0 Inventory Access)
SELECT set_config('request.jwt.claims', '{"tenant_id": "c0a80101-0000-0000-0000-000000000001", "role": "DRIVER", "sub": "d1000000-0000-0000-0000-000000000001"}', true);

DO $$
DECLARE
  v_wo INT; v_alerts INT; v_inv INT;
  v_expected_wo INT := current_setting('rls_test.driver_work_orders')::int;
  v_expected_alerts INT := current_setting('rls_test.driver_fleet_alerts')::int;
BEGIN
  SELECT COUNT(*) INTO v_wo FROM public.work_orders;
  IF v_wo != v_expected_wo THEN
    RAISE EXCEPTION 'TEST FAILED: DRIVER should see % work order(s) on their assigned vehicle, saw % (tenant/role resolution may have failed silently)', v_expected_wo, v_wo;
  END IF;

  SELECT COUNT(*) INTO v_alerts FROM public.fleet_alerts;
  IF v_alerts != v_expected_alerts THEN
    RAISE EXCEPTION 'TEST FAILED: DRIVER should see % alert(s) on their assigned vehicle, saw % (tenant/role resolution may have failed silently)', v_expected_alerts, v_alerts;
  END IF;

  SELECT COUNT(*) INTO v_inv FROM public.inventory_items;
  IF v_inv > 0 THEN
    RAISE EXCEPTION 'TEST FAILED: DRIVER should have 0 access to inventory_items, but saw % rows', v_inv;
  END IF;

  RAISE NOTICE 'TEST PASSED: DRIVER is scoped to their assigned vehicle (wo=%, alerts=%) with 0 inventory access.', v_wo, v_alerts;
END;
$$;

ROLLBACK;
