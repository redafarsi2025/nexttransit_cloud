/**
 * DeviceResolver
 * ==============
 * Resolves a raw external_device_id (IMEI, unit_id, etc.) from an incoming
 * telemetry payload into NextTransit's internal vehicle_id and tenant_id.
 *
 * Uses device_mappings table (Supabase) with in-memory fallback.
 * Zero knowledge of device manufacturer, vehicle make/model, or provider protocol.
 */
import { DeviceMapping } from '../../types';
import { supabase } from '../../lib/supabase';

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
export async function resolveDevice(externalDeviceId: string): Promise<ResolvedDevice | null> {
  if (!externalDeviceId) return null;

  // Cache hit
  if (resolutionCache.has(externalDeviceId) && isCacheValid(externalDeviceId)) {
    return resolutionCache.get(externalDeviceId)!;
  }

  try {
    const { data, error } = await supabase
      .from('device_mappings')
      .select('*')
      .eq('external_device_id', externalDeviceId)
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

    const resolved: ResolvedDevice = {
      vehicle_id: data.vehicle_id,
      tenant_id: data.tenant_id,
      mapping: data as DeviceMapping,
    };

    resolutionCache.set(externalDeviceId, resolved);
    cacheTimestamps.set(externalDeviceId, Date.now());

    return resolved;
  } catch (err) {
    console.warn('[DeviceResolver] Error resolving device:', err);
    return null;
  }
}

/** Invalidate cache for a specific device (call after mapping updates). */
export function invalidateDeviceCache(externalDeviceId: string): void {
  resolutionCache.delete(externalDeviceId);
  cacheTimestamps.delete(externalDeviceId);
}
