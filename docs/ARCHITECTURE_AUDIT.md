# Architecture Audit & Cleanup Candidates

## Legacy Tables to Decommission

### `public.users`
- **Current Status**: Obsolete. Replaced by `public.profiles`.
- **Reason**: All registration and tenant provisioning flows (via `provision_tenant`) now exclusively populate and rely on `public.profiles`. 
- **Recent Fixes**: Legacy RLS helper functions (`get_current_user_company_id` and `get_current_user_tenant_id`) have been migrated to read from `profiles` instead of `users` (via migration `20260813000000_fix_legacy_rls_helper_functions.sql`).
- **Audit findings**: No active TypeScript code uses `.from('users')` except isolated legacy references in `authService.test.ts`, which simulate the legacy state, and `invitationService` which was previously refactored.
- **Action Required**: Safe for deletion in a future cleanup phase once legacy environments are purged. Do not delete immediately to avoid breaking any lingering undocumented direct SQL views if any exist.
