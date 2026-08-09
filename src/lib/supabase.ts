import { createClient } from '@supabase/supabase-js';

const getEnvVar = (processVal?: string, viteVal?: string): string => {
  return processVal || viteVal || '';
};

const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env || {} : {};

const supabaseUrl =
  getEnvVar(process.env.VITE_SUPABASE_URL, metaEnv.VITE_SUPABASE_URL) ||
  getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL, metaEnv.NEXT_PUBLIC_SUPABASE_URL) ||
  'https://placeholder-tenant.supabase.co';

const supabaseKey =
  getEnvVar(process.env.VITE_SUPABASE_PUBLISHABLE_KEY, metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, metaEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDA0OTY0MDAsImV4cCI6MTkxNjA3MjQwMH0.placeholder';

export const isSupabaseConfigured = Boolean(
  (process.env.VITE_SUPABASE_URL || metaEnv.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || metaEnv.NEXT_PUBLIC_SUPABASE_URL) &&
  (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || metaEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
);

if (!isSupabaseConfigured) {
  console.warn('[NextTransit] Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY) are missing. Running in local/demo fallback mode.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
