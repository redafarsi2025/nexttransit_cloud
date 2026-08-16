import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveDevice, invalidateDeviceCache } from '../DeviceResolver';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { TelematicsProviderType } from '../../../types';

// Mock Supabase Client
vi.mock('../../../lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

describe('DeviceResolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to mock the chain: .from().select().eq().eq().eq().maybeSingle()
  const mockSupabaseQuery = (data: any, error: any = null) => {
    const maybeSingle = vi.fn().mockResolvedValue({ data, error });
    const eqIsActive = vi.fn().mockReturnValue({ maybeSingle });
    const eqProvider = vi.fn().mockReturnValue({ eq: eqIsActive });
    const eqDeviceId = vi.fn().mockReturnValue({ eq: eqProvider });
    const select = vi.fn().mockReturnValue({ eq: eqDeviceId });
    (supabaseAdmin.from as any).mockReturnValue({ select });
    return { select, eqDeviceId, eqProvider, eqIsActive, maybeSingle };
  };

  it('should resolve a valid provider and external_device_id', async () => {
    const extId = 'valid-123';
    invalidateDeviceCache(extId, 'flespi');
    
    mockSupabaseQuery({
      tenant_id: 'tenant-123',
      vehicle_id: 'vehicle-456',
      external_device_id: extId,
      provider: 'flespi',
      is_active: true
    });

    const result = await resolveDevice(extId, 'flespi');
    expect(result).not.toBeNull();
    expect(result?.tenant_id).toBe('tenant-123');
    expect(result?.vehicle_id).toBe('vehicle-456');
    expect(supabaseAdmin.from).toHaveBeenCalledWith('device_mappings');
  });

  it('should reject and return null for unknown device', async () => {
    const extId = 'unknown-123';
    invalidateDeviceCache(extId, 'flespi');
    
    // DB returns null
    mockSupabaseQuery(null);

    const result = await resolveDevice(extId, 'flespi');
    expect(result).toBeNull();
  });

  it('should reject if mapping query fails', async () => {
    const extId = 'error-123';
    invalidateDeviceCache(extId, 'flespi');
    
    // DB returns error
    mockSupabaseQuery(null, new Error('DB Error'));

    const result = await resolveDevice(extId, 'flespi');
    expect(result).toBeNull();
  });

  it('should reject wrong provider (cross-provider isolation)', async () => {
    const extId = 'provider-mismatch';
    invalidateDeviceCache(extId, 'flespi');
    
    const mocks = mockSupabaseQuery(null);

    await resolveDevice(extId, 'flespi');
    
    // Ensure the query includes the provider in the WHERE clause
    expect(mocks.eqProvider).toHaveBeenCalledWith('provider', 'flespi');
  });

  it('should use cache for subsequent resolutions to avoid DB roundtrips', async () => {
    const extId = 'cached-123';
    invalidateDeviceCache(extId, 'wialon');
    
    mockSupabaseQuery({
      tenant_id: 'tenant-123',
      vehicle_id: 'vehicle-456',
      external_device_id: extId,
      provider: 'wialon',
      is_active: true
    });

    const firstCall = await resolveDevice(extId, 'wialon');
    expect(firstCall?.tenant_id).toBe('tenant-123');
    expect(supabaseAdmin.from).toHaveBeenCalledTimes(1);

    const secondCall = await resolveDevice(extId, 'wialon');
    expect(secondCall?.tenant_id).toBe('tenant-123');
    // Supabase should not be called again
    expect(supabaseAdmin.from).toHaveBeenCalledTimes(1);
  });
});
