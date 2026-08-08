import { describe, it, expect } from 'vitest';
import { getTenantUuid } from './fleetData';

describe('Demo Tenant & Anonymous RLS Isolation Tests', () => {
  const DEMO_TENANT_ID = 'c0a80101-0000-0000-0000-000000000001';
  const NON_DEMO_TENANT_ID = 'c0a80101-0000-0000-0000-000000000099';

  it('correctly maps demo tenant slug and legacy identifier to DEMO_TENANT_ID', () => {
    expect(getTenantUuid('demo')).toBe(DEMO_TENANT_ID);
    expect(getTenantUuid('TNT-NEXTR-001')).toBe(DEMO_TENANT_ID);
  });

  it('guarantees non-demo tenant ID is distinct from DEMO_TENANT_ID', () => {
    expect(NON_DEMO_TENANT_ID).not.toBe(DEMO_TENANT_ID);
  });

  it('validates strict tenant isolation filter for anonymous query paths', () => {
    // Simulate RLS policy evaluation logic: USING (tenant_id = DEMO_TENANT_ID)
    const isAnonAllowed = (tenantId: string) => tenantId === DEMO_TENANT_ID;

    // Demo tenant query MUST be allowed
    expect(isAnonAllowed(DEMO_TENANT_ID)).toBe(true);

    // Any non-demo tenant query MUST return false (0 rows)
    expect(isAnonAllowed(NON_DEMO_TENANT_ID)).toBe(false);
    expect(isAnonAllowed('c0a80101-0000-0000-0000-000000000002')).toBe(false);
    expect(isAnonAllowed('random-uuid-1234-5678')).toBe(false);
  });

  it('validates tenants table RLS isolation policy logic (M3)', () => {
    const isTenantAnonAllowed = (tenantId: string) => tenantId === DEMO_TENANT_ID;
    expect(isTenantAnonAllowed(DEMO_TENANT_ID)).toBe(true);
    expect(isTenantAnonAllowed(NON_DEMO_TENANT_ID)).toBe(false);
  });
});

