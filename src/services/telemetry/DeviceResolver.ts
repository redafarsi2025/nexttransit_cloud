/**
 * DeviceResolver
 * ==============
 * Resolves a raw external_device_id (IMEI, unit_id, etc.) from an incoming
 * telemetry payload into NextTransit's internal vehicle_id and tenant_id.
 *
 * Uses device_mappings table (Supabase) with in-memory fallback.
 * Zero knowledge of device manufacturer, vehicle make/model, or provider protocol.
 */
import { DeviceMapping, TelematicsProviderType } from '../../types';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export interface ResolvedDevice {
  vehicle_id: string;
  tenant_id: string;
  mapping: DeviceMapping;
}

// In-memory cache to reduce Supabase round-trips on repeated payloads
const resolutionCache = new Map<string, ResolvedDevice>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cacheTimestamps = new Map<string, number>();

function isCacheValid(key: string): boolean {
  const ts = cacheTimestamps.get(key);
  return ts !== undefined && Date.now() - ts < CACHE_TTL_MS;
}

/**
 * Resolves an external_device_id to internal vehicle + tenant identifiers.
 * Returns null if no active mapping exists for the given device identifier.
 */
export async function resolveDevice(externalDeviceId: string, provider: TelematicsProviderType): Promise<ResolvedDevice | null> {
  if (!externalDeviceId || !provider) return null;

  const cacheKey = `${provider}:${externalDeviceId}`;

  // Cache hit
  if (resolutionCache.has(cacheKey) && isCacheValid(cacheKey)) {
    return resolutionCache.get(cacheKey)!;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('device_mappings')
      .select('*')
      .eq('external_device_id', externalDeviceId)
      .eq('provider', provider)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.warn('[DeviceResolver] Supabase query failed:', error.message);
      return null;
    }

    if (!data) {
      console.warn('[DeviceResolver] No active mapping for external_device_id:', externalDeviceId);
      return null;
    }

    const mappingData = data as unknown as DeviceMapping;

    const resolved: ResolvedDevice = {
      vehicle_id: mappingData.vehicle_id,
      tenant_id: mappingData.tenant_id,
      mapping: mappingData,
    };

    resolutionCache.set(cacheKey, resolved);
    cacheTimestamps.set(cacheKey, Date.now());

    return resolved;
  } catch (err) {
    console.warn('[DeviceResolver] Error resolving device:', err);
    return null;
  }
}

export function invalidateDeviceCache(externalDeviceId: string, provider: TelematicsProviderType): void {
  const cacheKey = `${provider}:${externalDeviceId}`;
  resolutionCache.delete(cacheKey);
  cacheTimestamps.delete(cacheKey);
}
