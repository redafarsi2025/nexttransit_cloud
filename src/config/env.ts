import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL must be a valid URL').optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL').optional(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, 'VITE_SUPABASE_PUBLISHABLE_KEY is required').optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required').optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required').optional(),
  SUPABASE_SERVICE_KEY: z.string().min(1, 'SUPABASE_SERVICE_KEY is required').optional(),
});

// We only parse what's currently in process.env.
// In test environments, we allow missing variables at boot time.
export const envConfig = {
  get NODE_ENV() { return process.env.NODE_ENV || 'development'; },
  
  get supabaseUrl(): string {
    const url = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url && process.env.NODE_ENV !== 'test') {
      throw new Error('FATAL: Supabase URL (VITE_SUPABASE_URL) is missing from environment.');
    }
    return url || '';
  },

  get supabaseAnonKey(): string {
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!key && process.env.NODE_ENV !== 'test') {
      throw new Error('FATAL: Supabase Anon Key (VITE_SUPABASE_PUBLISHABLE_KEY) is missing from environment.');
    }
    return key || '';
  },

  get supabaseServiceRoleKey(): string {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    if (!key && process.env.NODE_ENV !== 'test') {
      throw new Error('FATAL: Supabase Service Role Key (SUPABASE_SERVICE_ROLE_KEY) is missing from environment.');
    }
    return key || '';
  }
};

// In production, we force early evaluation to crash fail-fast on boot
if (process.env.NODE_ENV === 'production') {
  envConfig.supabaseUrl;
  envConfig.supabaseAnonKey;
  envConfig.supabaseServiceRoleKey;
}
