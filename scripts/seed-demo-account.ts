/**
 * One-time (idempotent, re-runnable) provisioning script for the public live-demo account.
 *
 * Creates/repairs, in order:
 *   1. A `companies` row for the demo company.
 *   2. The `tenants` row for DEMO_TENANT_ID (already exists from prior migrations, this
 *      backfills `company_id`/`is_configured` which the original anon-only demo tenant
 *      never needed until now).
 *   3. A `subscriptions` row linking company <-> tenant.
 *   4. The Supabase Auth user (DEMO_EMAIL / DEMO_PASSWORD).
 *   5. The `profiles` row: tenant_id=DEMO_TENANT_ID, company_id=<demo company>, role=TENANT_ADMIN.
 *
 * Steps 1-3 exist because `ensureTenantProvisioned()` (src/services/authService.ts), which
 * every login must pass, requires a full companies -> tenants -> subscriptions chain. The
 * demo tenant was originally seeded only for anonymous read-only RLS access and never had
 * this chain — without it, a real login for the demo account throws AuthProvisioningError.
 *
 * Usage: npm run seed:demo-account   (requires SUPABASE_SERVICE_ROLE_KEY in .env — service
 * role only, never run this from client code or expose the key to the browser.)
 */
import { supabaseAdmin } from '../src/lib/supabaseAdmin';
import { DEMO_TENANT_ID, DEMO_EMAIL, DEMO_PASSWORD } from '../src/config/demoAccount';

const DEMO_COMPANY_ID = 'c0a80101-0000-0000-0000-0000000000c0';
const DEMO_COMPANY_NAME = 'Numilog Logistics Spa';

async function main() {
  console.log('[seed-demo-account] Starting...');

  // 1. Company
  const { data: existingCompany } = await supabaseAdmin
    .from('companies')
    .select('id')
    .eq('id', DEMO_COMPANY_ID)
    .maybeSingle();

  if (!existingCompany) {
    const { error } = await supabaseAdmin.from('companies').insert({
      id: DEMO_COMPANY_ID,
      name: DEMO_COMPANY_NAME,
      billing_email: DEMO_EMAIL,
    });
    if (error) throw new Error(`Failed to create demo company: ${error.message}`);
    console.log('[seed-demo-account] Created companies row.');
  } else {
    console.log('[seed-demo-account] companies row already present.');
  }

  // 2. Tenant — row already exists (20260807000000_demo_tenant_and_anonymous_rls.sql),
  // backfill the company link + configured flag so ensureTenantProvisioned() passes.
  const { data: tenant, error: tenantFetchError } = await supabaseAdmin
    .from('tenants')
    .select('id, company_id')
    .eq('id', DEMO_TENANT_ID)
    .maybeSingle();

  if (tenantFetchError || !tenant) {
    throw new Error(
      `Demo tenant row ${DEMO_TENANT_ID} not found — expected to exist from prior migrations. ` +
      `${tenantFetchError?.message || ''}`
    );
  }

  if (tenant.company_id !== DEMO_COMPANY_ID) {
    const { error } = await supabaseAdmin
      .from('tenants')
      .update({ company_id: DEMO_COMPANY_ID, is_configured: true })
      .eq('id', DEMO_TENANT_ID);
    if (error) throw new Error(`Failed to link demo tenant to company: ${error.message}`);
    console.log('[seed-demo-account] Linked tenants.company_id and set is_configured.');
  } else {
    console.log('[seed-demo-account] tenants row already linked.');
  }

  // 3. Subscription
  const { data: existingSub } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('tenant_id', DEMO_TENANT_ID)
    .maybeSingle();

  if (!existingSub) {
    const { error } = await supabaseAdmin.from('subscriptions').insert({
      company_id: DEMO_COMPANY_ID,
      tenant_id: DEMO_TENANT_ID,
      plan: 'enterprise_trial',
      status: 'active',
      current_period_end: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (error) throw new Error(`Failed to create demo subscription: ${error.message}`);
    console.log('[seed-demo-account] Created subscriptions row.');
  } else {
    console.log('[seed-demo-account] subscriptions row already present.');
  }

  // 4. Auth user (idempotent: create, or resync password if it already exists)
  let authUserId: string;
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Visiteur Démo NextTransit' },
  });

  if (created?.user) {
    authUserId = created.user.id;
    console.log('[seed-demo-account] Created Supabase Auth user.');
  } else {
    // Already exists — look it up and resync its password so the published
    // credentials always work even if the auth user was created differently before.
    const { data: page, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw new Error(`Failed to create or find demo auth user: ${createError?.message} / ${listError.message}`);
    const found = page.users.find((u) => u.email?.toLowerCase() === DEMO_EMAIL.toLowerCase());
    if (!found) throw new Error(`Demo auth user creation failed and no existing user found: ${createError?.message}`);
    authUserId = found.id;
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (updateError) throw new Error(`Failed to resync demo auth user password: ${updateError.message}`);
    console.log('[seed-demo-account] Demo auth user already existed — resynced password.');
  }

  // 5. Profile
  const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
    id: authUserId,
    tenant_id: DEMO_TENANT_ID,
    company_id: DEMO_COMPANY_ID,
    role: 'TENANT_ADMIN',
    is_active: true,
    full_name: 'Visiteur Démo NextTransit',
    email: DEMO_EMAIL,
  });
  if (profileError) throw new Error(`Failed to upsert demo profile: ${profileError.message}`);
  console.log('[seed-demo-account] Upserted profiles row (TENANT_ADMIN on demo tenant).');

  // Safety: this account must never be a platform admin.
  const { error: platformAdminDeleteError } = await supabaseAdmin
    .from('platform_admins')
    .delete()
    .eq('id', authUserId);
  if (platformAdminDeleteError) {
    console.warn('[seed-demo-account] Could not verify platform_admins exclusion:', platformAdminDeleteError.message);
  }

  console.log(`[seed-demo-account] Done. Demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main().catch((err) => {
  console.error('[seed-demo-account] FAILED:', err);
  process.exit(1);
});
