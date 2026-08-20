#!/usr/bin/env node
// Compares the schema reachable at a given Postgres connection string against
// what the app's migrations/tests assume. Intended to be run against the local
// `supabase start` stack (default) and, once available, the hosted project, so
// the two can be diffed by hand in audit/08_RECONCILIATION.md.
//
// Usage: node scripts/diag/compare-schemas.cjs [connectionString]
// Defaults to the local Supabase CLI stack's fixed dev connection string.

const { Client } = require('pg');

const connectionString = process.argv[2] || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const PM_TABLES = ['pm_vehicle_subscriptions', 'pm_schedule_rules', 'pm_evaluation_events'];
const GRANT_CHECK_TABLES = ['work_orders', 'fleet_alerts', 'inventory_items'];

(async () => {
  const client = new Client({ connectionString });
  await client.connect();

  console.log(`=== Schema snapshot for ${connectionString.replace(/:[^:@]+@/, ':***@')} ===\n`);

  console.log('--- 1. All public tables: RLS status ---');
  const rls = await client.query(`
    SELECT relname, relrowsecurity
    FROM pg_class
    JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
    WHERE pg_namespace.nspname = 'public' AND pg_class.relkind = 'r'
    ORDER BY relname;
  `);
  for (const row of rls.rows) {
    console.log(`  ${row.relname.padEnd(35)} rls=${row.relrowsecurity}`);
  }
  const noRls = rls.rows.filter(r => !r.relrowsecurity);
  console.log(`\n  Tables WITHOUT RLS enabled (${noRls.length}): ${noRls.map(r => r.relname).join(', ') || '(none)'}`);

  console.log('\n--- 2. Table names the test suite assumes, vs what actually exists ---');
  const assumedByTests = ['incidents', 'driver_incidents', 'audit_log', 'audit_logs'];
  for (const t of assumedByTests) {
    const exists = rls.rows.some(r => r.relname === t);
    console.log(`  ${t.padEnd(20)} ${exists ? 'EXISTS' : 'DOES NOT EXIST'}`);
  }

  console.log(`\n--- 3. GRANTs for anon/authenticated on ${GRANT_CHECK_TABLES.join(', ')} ---`);
  const grants = await client.query(
    `SELECT table_name, grantee, privilege_type FROM information_schema.role_table_grants
     WHERE table_schema='public' AND table_name = ANY($1) AND grantee IN ('anon','authenticated')
     ORDER BY table_name, grantee, privilege_type;`,
    [GRANT_CHECK_TABLES]
  );
  if (grants.rows.length === 0) {
    console.log('  (none found)');
  } else {
    for (const row of grants.rows) {
      console.log(`  ${row.table_name.padEnd(20)} ${row.grantee.padEnd(15)} ${row.privilege_type}`);
    }
  }

  console.log(`\n--- 4. PM Schedules tables existence (${PM_TABLES.join(', ')}) ---`);
  for (const t of PM_TABLES) {
    const exists = rls.rows.some(r => r.relname === t);
    console.log(`  ${t.padEnd(30)} ${exists ? 'EXISTS' : 'DOES NOT EXIST'}`);
  }

  await client.end();
})().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
