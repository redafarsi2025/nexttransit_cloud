import { describe, it, expect, vi, beforeEach } from 'vitest';
import { platformAdminService } from './platformAdminService.server';
import { supabaseAdmin } from '../lib/supabaseAdmin';

import { supabaseMock, resetSupabaseMock } from '../../tests/setup/supabaseMock';

// Mock the internal supabaseAdmin client
vi.mock('../lib/supabaseAdmin', async () => {
  const { supabaseMock } = await import('../../tests/setup/supabaseMock');
  return { __esModule: true, supabaseAdmin: supabaseMock };
});

describe('platformAdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSupabaseMock();
  });

  it('getPlatformStats should aggregate stats correctly and estimate MRR', async () => {
    // Setup mock returns for the 3 queries in getPlatformStats by mocking the thenable
    (supabaseMock.from().then as any)
      .mockImplementationOnce((resolve: any) => resolve({ count: 10, error: null, data: null })) // tenants
      .mockImplementationOnce((resolve: any) => resolve({ count: 50, error: null, data: null })) // profiles
      .mockImplementationOnce((resolve: any) => resolve({ 
        error: null, 
        data: [
          { plan: 'enterprise', status: 'active' },
          { plan: 'professional', status: 'active' },
          { plan: 'professional', status: 'past_due' },
          { plan: 'startup', status: 'trial' }
        ] 
      })); // subscriptions

    const stats = await platformAdminService.getPlatformStats();

    expect(stats.tenantsTotal).toBe(10);
    expect(stats.usersTotal).toBe(50);
    expect(stats.activeSubscriptions).toBe(2);
    expect(stats.pastDueSubscriptions).toBe(1);
    expect(stats.trialSubscriptions).toBe(1);
    
    // Enterprise = 50k, Prof = 15k
    expect(stats.estimatedMrr).toBe(65000);
  });
});
