import { supabase } from '../src/lib/supabase';

async function checkPolicies() {
  const testEmail = 'test.staging.1786750910567@example.com';
  const testPassword = 'TestPassword123!';
  await supabase.auth.signInWithPassword({ email: testEmail, password: testPassword });

  const { data: allTenants, error: errAll } = await supabase.from('tenants').select('*');
  console.log('All Tenants:', allTenants?.length, errAll);

  const { data: specificTenant, error: errSpec } = await supabase.from('tenants').select('*').eq('id', '02131ab9-171b-4744-b374-4ff6c2db4d0c');
  console.log('Specific Tenant:', specificTenant?.length, errSpec);
}

checkPolicies();
