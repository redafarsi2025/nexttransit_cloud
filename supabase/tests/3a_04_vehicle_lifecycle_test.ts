import { Client } from 'pg';

async function runLifecycleTest() {
  console.log('--- Phase 3A-04 Vehicle Lifecycle Test ---');
  
  const dbUrl = process.env.DB_URL || 'postgres://postgres:postgres@localhost:54322/postgres';
  console.log(`Connecting to: ${dbUrl}`);
  
  const client = new Client(dbUrl);

  try {
    await client.connect();

    console.log('Setting up test data...');
    
    // 1. Setup minimal test data
    const setupSql = `
      -- Create a test tenant
      INSERT INTO public.tenants (id, name, currency) 
      VALUES ('c0a80101-0000-0000-0000-000000000001', 'Test Tenant', 'USD') 
      ON CONFLICT DO NOTHING;
      
      -- Create test profile to satisfy get_current_tenant_id() from algerian_corporate_dossier
      INSERT INTO public.profiles (id, tenant_id, role, is_active)
      VALUES ('a0000000-0000-0000-0000-000000000001', 'c0a80101-0000-0000-0000-000000000001', 'FLEET_MANAGER', true)
      ON CONFLICT DO NOTHING;
      
      -- Create a test vehicle starting in ORDERED state
      INSERT INTO public.vehicles (id, tenant_id, plate, name, lifecycle_status) 
      VALUES ('b2000000-0000-0000-0000-000000000001', 'c0a80101-0000-0000-0000-000000000001', 'LIFECYCLE-1', 'Lifecycle Test Truck', 'ORDERED')
      ON CONFLICT (id) DO UPDATE SET lifecycle_status = 'ORDERED';
      
      -- Clear history for this vehicle
      DELETE FROM public.vehicle_lifecycle_history WHERE vehicle_id = 'b2000000-0000-0000-0000-000000000001';
    `;
    await client.query(setupSql);

    // Helper function to execute the RPC
    const updateLifecycle = async (status: string, reason: string = 'test') => {
      await client.query(`
        SET SESSION ROLE authenticated;
        SELECT set_config('request.jwt.claims', '{"tenant_id": "c0a80101-0000-0000-0000-000000000001", "role": "FLEET_MANAGER", "sub": "a0000000-0000-0000-0000-000000000001", "email": "test@nexttransit.com"}', false);
      `);
      return client.query(`SELECT public.update_vehicle_lifecycle('b2000000-0000-0000-0000-000000000001', $1, $2)`, [status, reason]);
    };

    // Helper to expect failure
    const expectFailure = async (status: string, expectedError: string) => {
      try {
        await updateLifecycle(status);
        throw new Error(`Expected transition to ${status} to fail, but it succeeded!`);
      } catch (e: any) {
        if (!e.message.includes(expectedError)) {
          throw new Error(`Expected error containing "${expectedError}", but got: ${e.message}`);
        }
        console.log(`✅ Correctly rejected transition to ${status}`);
      }
    };

    // 2. Test Invalid Transition: ORDERED -> IN_SERVICE
    console.log('Testing invalid transition: ORDERED -> IN_SERVICE');
    await expectFailure('IN_SERVICE', 'Invalid transition from ORDERED to IN_SERVICE');

    // 3. Test Valid Transitions
    console.log('Testing valid transition: ORDERED -> PENDING_ACTIVATION');
    await updateLifecycle('PENDING_ACTIVATION', 'Delivered to yard');
    console.log('✅ Transition successful');

    console.log('Testing valid transition: PENDING_ACTIVATION -> IN_SERVICE');
    await updateLifecycle('IN_SERVICE', 'Registration complete');
    console.log('✅ Transition successful');

    console.log('Testing valid transition: IN_SERVICE -> IMMOBILIZED');
    await updateLifecycle('IMMOBILIZED', 'Engine failure');
    console.log('✅ Transition successful');

    console.log('Testing valid transition: IMMOBILIZED -> IN_SERVICE');
    await updateLifecycle('IN_SERVICE', 'Repaired');
    console.log('✅ Transition successful');

    console.log('Testing valid transition: IN_SERVICE -> RETIRED');
    await updateLifecycle('RETIRED', 'End of lease');
    console.log('✅ Transition successful');

    // 4. Test Terminal State
    console.log('Testing invalid transition from terminal state: RETIRED -> IN_SERVICE');
    await expectFailure('IN_SERVICE', 'Invalid transition: RETIRED is a terminal state');

    // 5. Verify History Records
    console.log('Verifying lifecycle history records...');
    await client.query('SET SESSION ROLE postgres');
    const historyRes = await client.query(`
      SELECT previous_status, new_status, reason, changed_by 
      FROM public.vehicle_lifecycle_history 
      WHERE vehicle_id = 'b2000000-0000-0000-0000-000000000001'
      ORDER BY changed_at ASC
    `);

    const history = historyRes.rows;
    if (history.length !== 5) {
      throw new Error(`Expected 5 history records, found ${history.length}`);
    }

    // Verify first transition
    if (history[0].previous_status !== 'ORDERED' || history[0].new_status !== 'PENDING_ACTIVATION') {
      throw new Error('History record 1 mismatch');
    }
    // Verify last transition
    if (history[4].previous_status !== 'IN_SERVICE' || history[4].new_status !== 'RETIRED') {
      throw new Error('History record 5 mismatch');
    }
    if (history[4].changed_by !== 'test@nexttransit.com') {
      throw new Error(`Expected changed_by to be test@nexttransit.com, got ${history[4].changed_by}`);
    }

    console.log('✅ Lifecycle history accurately recorded all transitions');
    console.log('\n🎉 ALL LIFECYCLE TESTS PASSED!');

  } catch (err) {
    console.error('❌ Fatal Test Error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runLifecycleTest();
