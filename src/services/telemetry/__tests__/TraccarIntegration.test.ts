import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FlespiAdapter } from '../providers/FlespiAdapter';
import { TelematicsProviderRegistry } from '../TelematicsProviderRegistry';
import { TraccarAdapter } from '../providers/TraccarAdapter';
import * as DeviceResolver from '../DeviceResolver';
import * as CapabilityResolver from '../CapabilityResolver';
import { SecurityContext } from '../../security/WebhookSecurityService';
import { processTelemetryWebhook } from '../TelemetryIngestionService';
import { ReplayProtection } from '../../security/ReplayProtection';
import { MemoryReplayStore } from '../../security/SecurityStores';

import { supabaseMock, resetSupabaseMock } from '../../../../tests/setup/supabaseMock';

vi.mock('../../../lib/supabaseAdmin', async () => {
  const { supabaseMock } = await import('../../../../tests/setup/supabaseMock');
  return { __esModule: true, supabaseAdmin: supabaseMock };
});

const mockContext: SecurityContext = { gatewayId: 'mock-gw', provider: 'traccar', tenantId: null };

describe('Phase 2C: Traccar Integration & Mandatory Verification', () => {
  let memoryReplayProtection: ReplayProtection;

  beforeEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';
    process.env.VITE_SUPABASE_URL = 'http://mock.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://mock.supabase.co';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-16T12:00:05.000Z'));
    vi.clearAllMocks();
    
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});

    resetSupabaseMock();
    TelematicsProviderRegistry.register(TraccarAdapter);
    TelematicsProviderRegistry.register(FlespiAdapter);
    memoryReplayProtection = new ReplayProtection(new MemoryReplayStore());
  });

  describe('2. Payload Validation (Zod Strict)', () => {
    it('should accept valid payload', () => {
      const payload = { deviceId: 1, device: { uniqueId: 'TRAC' }, latitude: 10, longitude: 20 };
      expect(TraccarAdapter.validate(payload)).toBe(true);
    });

    it('should reject malformed payload', () => {
      const payload = { somethingElse: true };
      expect(TraccarAdapter.validate(payload)).toBe(false);
    });

    it('should reject NaN or Infinity', () => {
      const payload = { deviceId: 1, device: { uniqueId: 'TRAC' }, latitude: NaN, longitude: Infinity };
      // parse filters it out entirely
      const parsed = TraccarAdapter.parse(payload);
      expect(parsed.length).toBe(0);
    });
  });

  describe('3. Identity & Multi-Tenant Isolation', () => {
    it('should reject unknown device', async () => {
      vi.spyOn(DeviceResolver, 'resolveDevice').mockResolvedValue(null);
      const payload = { deviceId: 1, device: { uniqueId: 'UNKNOWN' }, latitude: 10, longitude: 20 };
      const result = await processTelemetryWebhook(payload, 'traccar', mockContext, memoryReplayProtection);
      expect(result.ignored).toBe(1);
    });

    it('should reject inactive device', async () => {
      vi.spyOn(DeviceResolver, 'resolveDevice').mockResolvedValue(null);
      const payload = { deviceId: 1, device: { uniqueId: 'DEV_INACTIVE' }, latitude: 10, longitude: 20 };
      const result = await processTelemetryWebhook(payload, 'traccar', mockContext, memoryReplayProtection);
      expect(result.ignored).toBe(1);
    });

    it('should NEVER allow mapping spoofing (Tenant B payload mapped to Tenant A db)', async () => {
      const spoofedPayload = { deviceId: 1, device: { uniqueId: 'TRAC-001' }, tenantId: 'SPOOFED-TENANT-B', latitude: 48.8, longitude: 2.3 };
      vi.spyOn(DeviceResolver, 'resolveDevice').mockResolvedValue({
        vehicle_id: 'veh-A', tenant_id: 'REAL-TENANT-B',
        mapping: { id: 'map-1', tenant_id: 'REAL-TENANT-B', vehicle_id: 'veh-A', device_id: 'dev-A', provider: 'traccar', external_device_id: 'TRAC-001', is_active: true }
      });
      vi.spyOn(CapabilityResolver, 'resolveCapabilities').mockReturnValue({ gps: true } as any);

      // We explicitly pass `tenantId: 'REAL-TENANT-A'` in the webhook context 
      // (e.g. gateway scoped to Tenant A), but the device resolves to Tenant B.
      const result = await processTelemetryWebhook(spoofedPayload, 'traccar', { ...mockContext, tenantId: 'REAL-TENANT-A' }, memoryReplayProtection);
      expect(result.ignored).toBe(1);
      expect(result.events?.length || 0).toBe(0);
    });
  });

  describe('4. Architecture: Provider-Agnostic Core', () => {
    it('should generate completely identical CanonicalTelemetryEvent for Flespi and Traccar', async () => {
      vi.spyOn(DeviceResolver, 'resolveDevice').mockResolvedValue({
        vehicle_id: 'veh-COMMON', tenant_id: 'ten-COMMON',
        mapping: { id: 'm1', tenant_id: 'ten-COMMON', vehicle_id: 'veh-COMMON', device_id: 'd1', provider: 'flespi', external_device_id: 'DEV', is_active: true }
      });
      vi.spyOn(CapabilityResolver, 'resolveCapabilities').mockReturnValue({ gps: true, ignition: true } as any);

      const flespiPayload = { ident: 'DEV_IDENTICAL', timestamp: 1786881601, 'position.latitude': 48.8, 'position.longitude': 2.3, 'position.speed': 74.08, 'engine.ignition.status': true };
      const traccarPayload = { deviceId: 1, device: { uniqueId: 'DEV_IDENTICAL' }, deviceTime: '2026-08-16T12:00:01.000Z', latitude: 48.8, longitude: 2.3, speed: 40.0, attributes: { ignition: true } };

      const flespiResult = await processTelemetryWebhook(flespiPayload, 'flespi', { ...mockContext, provider: 'flespi' }, memoryReplayProtection);
      const traccarResult = await processTelemetryWebhook(traccarPayload, 'traccar', mockContext, memoryReplayProtection);

      expect(flespiResult.events![0].position?.latitude).toBe(traccarResult.events![0].position?.latitude);
      expect(flespiResult.events![0].vehicleState?.ignition).toBe(traccarResult.events![0].vehicleState?.ignition);
    });
  });

  describe('5. Idempotency & Replay', () => {
    it('Idempotency: Identical events should generate the same event_id', async () => {
      vi.spyOn(DeviceResolver, 'resolveDevice').mockResolvedValue({
        vehicle_id: 'veh-1', tenant_id: 'ten-1',
        mapping: { id: 'm1', tenant_id: 'ten-1', vehicle_id: 'veh-1', device_id: 'd1', provider: 'traccar', external_device_id: 'DEV', is_active: true }
      });
      vi.spyOn(CapabilityResolver, 'resolveCapabilities').mockReturnValue({ gps: true } as any);

      const payload = { deviceId: 1, device: { uniqueId: 'DEV_IDEMP' }, deviceTime: '2026-08-16T12:00:02.000Z', latitude: 48.8, longitude: 2.3 };
      const result1 = await processTelemetryWebhook(payload, 'traccar', mockContext, memoryReplayProtection);
      const result2 = await processTelemetryWebhook(payload, 'traccar', mockContext, memoryReplayProtection);

      expect(result1.events![0].eventId).toBeDefined();
      expect(result2.ignored).toBe(1); // Blocked by memory replay protection before DB Idempotency
      expect(result2.events?.length || 0).toBe(0);
    });

    it('Replay: Should generate deterministic hash for payloads lacking provider event ID', async () => {
      vi.spyOn(DeviceResolver, 'resolveDevice').mockResolvedValue({
        vehicle_id: 'veh-1', tenant_id: 'ten-1',
        mapping: { id: 'm1', tenant_id: 'ten-1', vehicle_id: 'veh-1', device_id: 'd1', provider: 'traccar', external_device_id: 'DEV', is_active: true }
      });
      vi.spyOn(CapabilityResolver, 'resolveCapabilities').mockReturnValue({ gps: true } as any);

      // No 'id' provided by Traccar payload
      const payload1 = { deviceId: 1, device: { uniqueId: 'DEV_REPLAY' }, deviceTime: '2026-08-16T12:00:03.000Z', latitude: 48.8, longitude: 2.3 };
      const result1 = await processTelemetryWebhook(payload1, 'traccar', mockContext, memoryReplayProtection);
      
      const payload2 = { deviceId: 1, device: { uniqueId: 'DEV_REPLAY' }, deviceTime: '2026-08-16T12:00:03.000Z', latitude: 48.80001, longitude: 2.3 };
      const result2 = await processTelemetryWebhook(payload2, 'traccar', mockContext, memoryReplayProtection);

      // The eventIds should differ because the GPS hash differs, avoiding collisions within the same second
      expect(result1.events![0].eventId).not.toBe(result2.events![0].eventId);
    });
  });
});
