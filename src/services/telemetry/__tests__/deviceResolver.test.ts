import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveDevice, invalidateDeviceCache } from '../DeviceResolver';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { TelematicsProviderType } from '../../../types';

import { supabaseMock, setMockData, setMockError, setMockEmpty, resetSupabaseMock } from '../../../../tests/setup/supabaseMock';

// Mock Supabase Client
vi.mock('../../../lib/supabaseAdmin', async () => {
  const { supabaseMock } = await import('../../../../tests/setup/supabaseMock');
  return { __esModule: true, supabaseAdmin: supabaseMock };
});

describe('DeviceResolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSupabaseMock();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should resolve a valid provider and external_device_id', async () => {
    const extId = 'valid-123';
    invalidateDeviceCache(extId, 'flespi');
    
    setMockData({
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
    setMockEmpty();

    const result = await resolveDevice(extId, 'flespi');
    expect(result).toBeNull();
  });

  it('should reject if mapping query fails', async () => {
    const extId = 'error-123';
    invalidateDeviceCache(extId, 'flespi');
    
    // DB returns error
    setMockError(new Error('DB Error'));

    const result = await resolveDevice(extId, 'flespi');
    expect(result).toBeNull();
  });

  it('should reject wrong provider (cross-provider isolation)', async () => {
    const extId = 'provider-mismatch';
    invalidateDeviceCache(extId, 'flespi');
    
    setMockEmpty();

    await resolveDevice(extId, 'flespi');
    
    // Ensure the query includes the provider in the WHERE clause
    expect(supabaseMock.from().eq).toHaveBeenCalledWith('provider', 'flespi');
  });

  it('should use cache for subsequent resolutions to avoid DB roundtrips', async () => {
    const extId = 'cached-123';
    invalidateDeviceCache(extId, 'wialon');
    
    setMockData({
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
