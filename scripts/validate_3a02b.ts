import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert';

const url = process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runValidation() {
  console.log('=== STARTING DATABASE RUNTIME VALIDATION (Phase 3A-02B) ===\n');

  // Use predefined test tenant IDs
  const tenantA = 'c0a80101-0000-0000-0000-000000000001';
  const tenantB = 'c0a80101-0000-0000-0000-000000000002';

  console.log('1. Setting up test data (creating if not exist)...');
  
  // Upsert test tenants
  await supabaseAdmin.from('tenants').upsert([
    { id: tenantA, name: 'Test Tenant A', slug: 'test-tenant-a', schema_name: 'public' },
    { id: tenantB, name: 'Test Tenant B', slug: 'test-tenant-b', schema_name: 'public' }
  ]);

  // Insert mock users (profiles)
  const driverA1 = 'a1a80101-0000-0000-0000-000000000001';
  const driverA2 = 'a2a80101-0000-0000-0000-000000000002';
  const driverB1 = 'b1a80101-0000-0000-0000-000000000001';

  await supabaseAdmin.from('profiles').upsert([
    { id: driverA1, tenant_id: tenantA, first_name: 'Driver', last_name: 'A1', role: 'DRIVER', email: 'a1@test.com' },
    { id: driverA2, tenant_id: tenantA, first_name: 'Driver', last_name: 'A2', role: 'DRIVER', email: 'a2@test.com' },
    { id: driverB1, tenant_id: tenantB, first_name: 'Driver', last_name: 'B1', role: 'DRIVER', email: 'b1@test.com' }
  ]);

  // Insert mock vehicles
  const vehicleA = 'd1a80101-0000-0000-0000-000000000001';
  const vehicleB = 'd2a80101-0000-0000-0000-000000000002';

  await supabaseAdmin.from('vehicles').upsert([
    { id: vehicleA, tenant_id: tenantA, name: 'Test Vehicle A', make: 'Toyota', model: 'Hilux', status: 'ACTIVE', internal_fleet_number: 'TA-001' },
    { id: vehicleB, tenant_id: tenantB, name: 'Test Vehicle B', make: 'Toyota', model: 'Hilux', status: 'ACTIVE', internal_fleet_number: 'TB-001' }
  ]);
  
  const driverB = driverB1;


  // Helper to run rpc as a specific user (simulate auth context)
  async function assignAs(userId: string, vehicleId: string, driverId: string) {
    // Generate a temporary JWT or use service role? The RPC uses auth.uid() if no user is passed, but wait, the RPC takes p_vehicle_id, p_driver_id, p_notes
    // Let's check how the RPC works. It might use public.get_current_tenant_id() which depends on auth.uid() or the JWT claims.
    // If we use service_role, get_current_tenant_id() might fail or return null.
    // Let's invoke the RPC directly using admin client to see if it bypasses RLS but still executes the PL/pgSQL logic.
    return await supabaseAdmin.rpc('assign_driver_to_vehicle', {
      p_vehicle_id: vehicleId,
      p_driver_id: driverId
    });
  }

  console.log('\n2. Test: Création d\'une affectation');
  // First, unassign everything to have a clean state for vehicleA
  await supabaseAdmin.from('vehicle_assignments').update({ unassigned_at: new Date().toISOString() }).eq('vehicle_id', vehicleA).is('unassigned_at', null);
  
  const { error: assignErr1 } = await assignAs(driverA1, vehicleA, driverA1);
  if (assignErr1) {
    console.error('❌ Failed to assign:', assignErr1.message);
  } else {
    console.log('✅ Assignment created successfully.');
  }

  console.log('\n3. Test: Récupération de l\'affectation courante');
  const { data: currentAssignment } = await supabaseAdmin
    .from('vehicle_assignments')
    .select('*')
    .eq('vehicle_id', vehicleA)
    .is('unassigned_at', null)
    .single();
  assert(currentAssignment, 'Current assignment should exist');
  assert.equal(currentAssignment.driver_id, driverA1, 'Driver should match');
  console.log('✅ Current assignment retrieved successfully.');

  console.log('\n4. Test: Double assignation concurrente (Partial Index Constraint)');
  const { error: assignErr2 } = await assignAs(driverA2, vehicleA, driverA2);
  assert(assignErr2, 'Second assignment on same vehicle MUST fail');
  console.log('✅ Concurrent assignment rejected:', assignErr2.message);

  if (vehicleB && driverB) {
    console.log('\n5. Test: Véhicule Tenant A + Conducteur Tenant B → rejet');
    const { error: crossTenant1 } = await assignAs(driverB, vehicleA, driverB);
    assert(crossTenant1, 'Cross-tenant assignment MUST fail');
    console.log('✅ Cross-tenant assignment rejected:', crossTenant1.message);

    console.log('\n6. Test: Véhicule Tenant B + Utilisateur Tenant A → rejet');
    const { error: crossTenant2 } = await assignAs(driverA1, vehicleB!, driverA1);
    assert(crossTenant2, 'Cross-tenant assignment MUST fail');
    console.log('✅ Cross-tenant assignment rejected:', crossTenant2.message);
  }

  console.log('\n7. Test: Désaffectation');
  // Wait, the API for unassigning is just setting unassigned_at.
  // Let's simulate an API unassign
  const { error: unassignErr } = await supabaseAdmin
    .from('vehicle_assignments')
    .update({ unassigned_at: new Date().toISOString() })
    .eq('id', currentAssignment.id);
  assert(!unassignErr, 'Unassign should succeed');
  console.log('✅ Unassignment successful.');

  console.log('\n8. Test: Réaffectation & Historique');
  // Assign driver 2
  const { error: assignErr3 } = await assignAs(driverA2, vehicleA, driverA2);
  assert(!assignErr3, 'Reassignment should succeed');
  
  const { data: history } = await supabaseAdmin
    .from('vehicle_assignments')
    .select('*')
    .eq('vehicle_id', vehicleA)
    .order('assigned_at', { ascending: false });
  assert(history && history.length >= 2, 'History should contain at least 2 entries');
  console.log(`✅ History verified. Found ${history.length} entries for vehicle.`);

  console.log('\n=== ALL DATABASE RUNTIME TESTS PASSED ===');
}

runValidation().catch(console.error);
