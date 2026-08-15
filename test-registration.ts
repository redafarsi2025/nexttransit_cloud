import { registerPublicCompany, ensureTenantProvisioned } from './src/services/authService';
import { supabase } from './src/lib/supabase';

async function testRegistration() {
  const timestamp = Date.now();
  const testEmail = `test.staging.${timestamp}@example.com`;
  const testPassword = 'TestPassword123!';
  const testCompany = `Staging Test Company ${timestamp}`;
  const testName = 'Test User';

  console.log('--- STARTING STAGING REGISTRATION TEST ---');
  console.log(`Registering with email: ${testEmail}`);
  console.log(`Company: ${testCompany}`);

  try {
    // 1. Call registerPublicCompany (this triggers signUp and provision_tenant RPC)
    const result = await registerPublicCompany({
      email: testEmail,
      password: testPassword,
      fullName: testName,
      companyName: testCompany
    });

    // In authService.ts, registerPublicCompany might return void or throw if session is null
    console.log(`\nUser registered successfully.`);
    
    // We need the user ID to check ensureTenantProvisioned, but if registerPublicCompany returns void,
    // we can try to sign in or get the user if email confirm is not required.
    // Let's just sign in to get the session and user.
    console.log('\nSigning in to get the user ID...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (signInError || !signInData.user) {
      console.log('Login failed (likely email confirmation required):', signInError?.message);
      console.log('Cannot verify ensureTenantProvisioned without the user ID. We must query the DB directly, but we can only do so with RLS if we have the token.');
      return;
    }

    console.log(`User ID obtained: ${signInData.user.id}`);

    const { data: profile, error: profileErr } = await supabase.from('profiles').select('*').eq('id', signInData.user.id).single();
    console.log('Profile from DB:', profile);
    if (profileErr) console.log('Profile Error:', profileErr);

    const { data: tenant, error: tenantErr } = await supabase.from('tenants').select('*').eq('id', profile?.tenant_id).single();
    console.log('Tenant from DB:', tenant);
    if (tenantErr) console.log('Tenant Error:', tenantErr);

    const { data: company, error: companyErr } = await supabase.from('companies').select('*').eq('id', profile?.company_id).single();
    console.log('Company from DB:', company);
    if (companyErr) console.log('Company Error:', companyErr);

    console.log('\nCalling ensureTenantProvisioned...');
    const status = await ensureTenantProvisioned(signInData.user.id, testEmail, { company_name: testCompany, full_name: testName });
    
    console.log(`\n===========================================`);
    console.log(`FINAL PROVISIONING STATUS: ${status}`);
    console.log(`===========================================`);

    if (status === 'READY') {
      console.log('✅ TEST PASSED: The legacy RLS helper fix is working! The tenant is accessible via RLS policies.');
    } else {
      console.log('❌ TEST FAILED: The status is not READY.');
    }

  } catch (error: any) {
    console.error('❌ ERROR DURING REGISTRATION TEST:', error.message || error);
    
    // We can fetch profile manually if we have an idea of the user email
    console.log('\n--- FETCHING STATE MANUALLY USING ANON KEY ---');
    const { data: profile } = await supabase.from('profiles').select('*').eq('email', testEmail).single();
    console.log('Profile from DB:', profile);
    if (profile) {
      const { data: tenant } = await supabase.from('tenants').select('*').eq('id', profile.tenant_id).single();
      console.log('Tenant from DB:', tenant);
      const { data: company } = await supabase.from('companies').select('*').eq('id', profile.company_id).single();
      console.log('Company from DB:', company);
      const { data: subscription, error: subErr } = await supabase.from('subscriptions').select('*').eq('tenant_id', profile.tenant_id).single();
      console.log('Subscription from DB:', subscription);
      if (subErr) console.log('Subscription Error:', subErr);
    }
  }
}

testRegistration();
