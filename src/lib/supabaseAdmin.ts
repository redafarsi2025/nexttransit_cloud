import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';
import { envConfig } from '../config/env';

// SERVER-ONLY Supabase client initialized with the Service Role Key.
// WARNING: NEVER import this file in any React component or frontend code.

// Ensure it's not being executed in the browser
if (typeof window !== 'undefined') {
  throw new Error('SECURITY BREACH: supabaseAdmin.ts must only be used on the server.');
}

let clientInstance: SupabaseClient<Database> | null = null;

// Use a Proxy to lazily initialize the client only when it is actually accessed.
// This prevents immediate crashes in test environments, while still adhering to
// strict fail-fast rules in production via envConfig.
export const supabaseAdmin: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get(target, prop) {
    if (!clientInstance) {
      const url = envConfig.supabaseUrl;
      const key = envConfig.supabaseServiceRoleKey;
      
      if (!url || !key) {
        throw new Error('FATAL: SUPABASE_SERVICE_ROLE_KEY is missing. Cannot execute platform admin actions.');
      }
      
      clientInstance = createClient<Database>(url, key, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
    return (clientInstance as any)[prop];
  }
});
