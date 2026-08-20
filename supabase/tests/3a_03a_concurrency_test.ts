// @ts-nocheck
import { Client } from 'pg';

const DB_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:54322/postgres'; // Default Supabase local DB URL

async function runConcurrencyTest() {
  console.log('--- Phase 3A-03A Concurrency Test ---');
  console.log(`Connecting to: ${DB_URL}`);

  const client1 = new Client({ connectionString: DB_URL });
  const client2 = new Client({ connectionString: DB_URL });

  try {
    await client1.connect();
    await client2.connect();

    // 1. Setup Test Data (using client1)
    console.log('Setting up test data...');
    await client1.query(`
      INSERT INTO public.tenants (id, name, currency) VALUES ('c0a80101-0000-0000-0000-000000000001', 'Test Tenant', 'USD') ON CONFLICT DO NOTHING;
      INSERT INTO public.profiles (id, tenant_id, role, is_active) VALUES 
        ('d1000000-0000-0000-0000-000000000001', 'c0a80101-0000-0000-0000-000000000001', 'DRIVER', true),
        ('d2000000-0000-0000-0000-000000000001', 'c0a80101-0000-0000-0000-000000000001', 'DRIVER', true)
      ON CONFLICT DO NOTHING;
      INSERT INTO public.drivers (id, tenant_id, operational_status, license_number, license_expiration, medical_certificate_expiration) VALUES 
        ('d1000000-0000-0000-0000-000000000001', 'c0a80101-0000-0000-0000-000000000001', 'AVAILABLE', 'LIC-1', CURRENT_DATE + 365, CURRENT_DATE + 365),
        ('d2000000-0000-0000-0000-000000000001', 'c0a80101-0000-0000-0000-000000000001', 'AVAILABLE', 'LIC-2', CURRENT_DATE + 365, CURRENT_DATE + 365)
      ON CONFLICT DO NOTHING;
      INSERT INTO public.vehicles (id, tenant_id, plate, name, lifecycle_status) VALUES 
        ('b1000000-0000-0000-0000-000000000001', 'c0a80101-0000-0000-0000-000000000001', 'PLATE-CONC', 'Concurrency Truck', 'IN_SERVICE')
      ON CONFLICT DO NOTHING;
      
      -- Clear existing assignments for this vehicle just in case
      DELETE FROM public.vehicle_assignments WHERE vehicle_id = 'b1000000-0000-0000-0000-000000000001';

      -- Ensure permissions (Normally done in roles.sql or migrations)
      GRANT ALL ON public.vehicle_assignments TO authenticated;
      GRANT ALL ON public.vehicle_assignments TO service_role;
    `);

    // We must act as authenticated user to pass RLS and use the RPC properly
    const setAuthStr = `
      SET SESSION ROLE authenticated;
      SELECT set_config('request.jwt.claims', '{"tenant_id": "c0a80101-0000-0000-0000-000000000001", "role": "FLEET_MANAGER", "sub": "a0000000-0000-0000-0000-000000000001"}', false);
    `;
    await client1.query(setAuthStr);
    await client2.query(setAuthStr);

    console.log('Firing parallel assign_driver_to_vehicle RPCs...');

    // 2. Fire concurrently
    const p1 = client1.query(`SELECT public.assign_driver_to_vehicle('b1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001')`);
    const p2 = client2.query(`SELECT public.assign_driver_to_vehicle('b1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001')`);

    const results = await Promise.allSettled([p1, p2]);
    
    console.log('Results of parallel execution:');
    results.forEach((r, idx) => {
      if (r.status === 'fulfilled') {
        console.log(`Connection ${idx + 1}: SUCCESS`);
      } else {
        console.log(`Connection ${idx + 1}: ERROR -> ${r.reason.message}`);
      }
    });

    // 3. Assert Results
    console.log('Verifying final state...');
    await client1.query('SET SESSION ROLE postgres');
    const res = await client1.query(`
      SELECT driver_id FROM public.vehicle_assignments 
      WHERE vehicle_id = 'b1000000-0000-0000-0000-000000000001' 
      AND unassigned_at IS NULL
    `);

    const activeAssignments = res.rows;
    console.log(`Active assignments count: ${activeAssignments.length}`);
    
    if (activeAssignments.length === 1) {
      console.log(`✅ CONCURRENCY TEST PASSED! Exactly one driver remains assigned: ${activeAssignments[0].driver_id}`);
    } else {
      console.error(`❌ CONCURRENCY TEST FAILED! Found ${activeAssignments.length} active assignments.`);
      process.exit(1);
    }

  } catch (err) {
    console.error('Fatal Test Error:', err);
    process.exit(1);
  } finally {
    await client1.end();
    await client2.end();
  }
}

runConcurrencyTest();
