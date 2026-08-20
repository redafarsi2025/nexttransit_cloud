import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL must be a valid URL').optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL').optional(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, 'VITE_SUPABASE_PUBLISHABLE_KEY is required').optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required').optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required').optional(),
  SUPABASE_SERVICE_KEY: z.string().min(1, 'SUPABASE_SERVICE_KEY is required').optional(),
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL').optional(),
});

// We strictly parse what's currently in process.env.
// In test environments, we allow missing variables at boot time.
export const envConfig = {
  get NODE_ENV() { return process.env.NODE_ENV || 'development'; },
  
  get supabaseUrl(): string {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url && process.env.NODE_ENV !== 'test') {
      console.error('\nENVIRONMENT_CONFIGURATION_ERROR\nMissing required variable: SUPABASE_URL / VITE_SUPABASE_URL\nAPI/Worker cannot start.\n');
      process.exit(1);
    }
    return url || '';
  },

  get supabaseAnonKey(): string {
    const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!key && process.env.NODE_ENV !== 'test') {
      console.error('\nENVIRONMENT_CONFIGURATION_ERROR\nMissing required variable: SUPABASE_ANON_KEY / VITE_SUPABASE_PUBLISHABLE_KEY\nAPI/Worker cannot start.\n');
      process.exit(1);
    }
    return key || '';
  },

  get supabaseServiceRoleKey(): string {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    if (!key && process.env.NODE_ENV !== 'test') {
      console.error('\nENVIRONMENT_CONFIGURATION_ERROR\nMissing required variable: SUPABASE_SERVICE_ROLE_KEY\nAPI/Worker cannot start.\n');
      process.exit(1);
    }
    return key || '';
  },
  
  get redisUrl(): string {
    const url = process.env.REDIS_URL;
    if (!url && process.env.NODE_ENV !== 'test') {
      console.error('\nENVIRONMENT_CONFIGURATION_ERROR\nMissing required variable: REDIS_URL\nAPI/Worker cannot start.\n');
      process.exit(1);
    }
    return url || '';
  }
};

// Force early evaluation to crash fail-fast on boot in Docker / Production
if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development') {
  // We access getters to trigger the validation
  envConfig.supabaseUrl;
  envConfig.supabaseAnonKey;
  envConfig.supabaseServiceRoleKey;
  envConfig.redisUrl;
}
