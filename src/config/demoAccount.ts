/**
 * Single source of truth for the public live-demo account and tenant.
 * Referenced by: LandingPage's demo button, AuthContext's demo-tenant detection,
 * scripts/seed-demo-account.ts, scripts/sync-demo-snapshot.ts, and demoSeedService.ts.
 *
 * This account is real (Supabase Auth + TENANT_ADMIN profile on DEMO_TENANT_ID), not a
 * client-side simulation. Credentials are intentionally public — see the read-only RLS
 * lockdown in supabase/migrations/*_demo_tenant_readonly_lockdown.sql, which makes writes
 * to this tenant impossible at the database level regardless of who holds the JWT.
 */
export const DEMO_TENANT_ID = 'c0a80101-0000-0000-0000-000000000001';
export const DEMO_EMAIL = 'demo@nexttransit.dz';
// Must satisfy validatePasswordPolicy (src/services/authService.ts): >=10 chars, 1 digit, 1 symbol.
export const DEMO_PASSWORD = 'Demo@2026!';
