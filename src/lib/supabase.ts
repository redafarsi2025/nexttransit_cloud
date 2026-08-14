import { createClient } from '@supabase/supabase-js';

const getEnvVar = (viteKey: string, nextKey: string) => {
  // Vite browser build context
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env[viteKey]) return import.meta.env[viteKey];
    if (import.meta.env[nextKey]) return import.meta.env[nextKey];
  }
  // Node.js server context (e.g. tsx server.ts)
  if (typeof process !== 'undefined' && process.env) {
    if (process.env[viteKey]) return process.env[viteKey];
    if (process.env[nextKey]) return process.env[nextKey];
  }
  return undefined;
};

// Frontend Supabase client (Vite ESM build & Node.js compat)
const supabaseUrl =
  getEnvVar('VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL') ||
  'https://placeholder-tenant.supabase.co';

const supabaseKey =
  getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDA0OTY0MDAsImV4cCI6MTkxNjA3MjQwMH0.placeholder';

export const isSupabaseConfigured = Boolean(
  getEnvVar('VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL') &&
  getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
);

if (!isSupabaseConfigured) {
  console.warn('[NextTransit] Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY) are missing. Running in local/demo fallback mode.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
