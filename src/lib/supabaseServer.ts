import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client (Node.js CJS build via esbuild)
// Uses process.env ONLY — no import.meta which is not available in CJS.
const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://placeholder-tenant.supabase.co';

const supabaseKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDA0OTY0MDAsImV4cCI6MTkxNjA3MjQwMH0.placeholder';

if (!supabaseUrl || supabaseUrl === 'https://placeholder-tenant.supabase.co') {
  console.warn('[NextTransit Server] VITE_SUPABASE_URL is missing. Running in demo fallback mode.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
