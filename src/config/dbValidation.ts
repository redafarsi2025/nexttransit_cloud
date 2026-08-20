import { supabaseAdmin } from '../lib/supabaseAdmin';

export async function validateDatabaseContract(): Promise<void> {
  // If we are in tests, we skip early validation to allow mocks
  if (process.env.NODE_ENV === 'test') return;

  console.log('[DB Contract] Validating Supabase database connectivity and schema compatibility...');
  try {
    // We do a lightweight query on a core table that must exist.
    // This proves connectivity, auth credentials validity, and schema baseline.
    const { error } = await supabaseAdmin.from('telematics_gateways').select('id').limit(1);
    
    if (error) {
      console.error('\nDATABASE_CONTRACT_ERROR\nFailed to validate database schema/connectivity:\n', error);
      process.exit(1);
    }
    
    console.log('[DB Contract] Database validation successful.');
  } catch (err) {
    console.error('\nDATABASE_CONTRACT_ERROR\nFatal error during database validation:\n', err);
    process.exit(1);
  }
}
