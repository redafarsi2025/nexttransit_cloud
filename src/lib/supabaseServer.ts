import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { envConfig } from '../config/env';

// Server-side Supabase client (Node.js CJS build via esbuild)
// Uses Proxy for lazy initialization. This prevents immediate crashes in test environments
// while still adhering to strict fail-fast rules in production.

let clientInstance: SupabaseClient | null = null;

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    if (!clientInstance) {
      const url = envConfig.supabaseUrl;
      const key = envConfig.supabaseAnonKey;
      
      if (!url || !key) {
        throw new Error('FATAL: Supabase Anon credentials missing.');
      }
      
      clientInstance = createClient(url, key);
    }
    return (clientInstance as any)[prop];
  }
});
