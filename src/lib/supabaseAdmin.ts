import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

// SERVER-ONLY Supabase client initialized with the Service Role Key.
// WARNING: NEVER import this file in any React component or frontend code.

const getSupabaseUrl = () => process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const getServiceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

if (!getSupabaseUrl() || !getServiceKey()) {
  console.warn('[NextTransit Server] SUPABASE_SERVICE_ROLE_KEY is missing. Platform admin features will fail.');
}

// Ensure it's not being executed in the browser
if (typeof window !== 'undefined') {
  throw new Error('SECURITY BREACH: supabaseAdmin.ts must only be used on the server.');
}

let clientInstance: SupabaseClient<Database> | null = null;

// Use a Proxy to lazily initialize the client only when it is actually accessed.
// This prevents the entire server from crashing on startup if the service role key is missing in .env.
export const supabaseAdmin: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get(target, prop) {
    if (!clientInstance) {
      const url = getSupabaseUrl();
      const key = getServiceKey();
      
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
