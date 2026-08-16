import { describe, it, expect } from 'vitest';
import { TraccarAdapter } from '../providers/TraccarAdapter';

describe('TraccarAdapter', () => {
  it('should have correct provider name', () => {
    expect(TraccarAdapter.provider).toBe('traccar');
  });

  describe('canHandle and validate', () => {
    it('should handle a valid single Traccar position payload', () => {
      const payload = {
        id: 12345,
        deviceId: 1,
        device: { uniqueId: 'TRAC-001' },
        protocol: 'osmand',
        serverTime: '2026-08-16T10:00:00.000Z',
        deviceTime: '2026-08-16T10:00:00.000Z',
        fixTime: '2026-08-16T10:00:00.000Z',
        valid: true,
        latitude: 48.8566,
        longitude: 2.3522,
        altitude: 35.0,
        speed: 40.5,
        course: 120.0,
        attributes: {
          ignition: true,
          rpm: 2500,
          coolantTemp: 85,
          fuelLevel: 75
        }
      };
      
      expect(TraccarAdapter.canHandle(payload)).toBe(true);
      expect(TraccarAdapter.validate(payload)).toBe(true);
    });

    it('should reject a malformed payload', () => {
      const payload = {
        wrongField: 'flespi',
        lat: 48.8,
        lon: 2.3
      };
      expect(TraccarAdapter.canHandle(payload)).toBe(false);
    });

    it('should reject NaN or Infinity coordinates during parse', () => {
      const payload = {
        deviceId: 1,
        device: { uniqueId: 'TRAC-NAN' },
        latitude: NaN,
        longitude: Infinity
      };
      // canHandle might pass since they are technically numbers in JS if not strictly filtered by schema before parse
      // But parse should filter them out.
      const parsed = TraccarAdapter.parse(payload);
      expect(parsed).toHaveLength(0);
    });
  });

  describe('parse', () => {
    it('should extract externalDeviceId and map attributes correctly', () => {
      const payload = {
        id: 999,
        deviceId: 1,
        device: { uniqueId: 'TRAC-001' },
        deviceTime: '2026-08-16T12:00:00.000Z', // 1786881600 Unix
        latitude: 36.7525,
        longitude: 3.04197, // Algiers
        speed: 50.0, // knots -> ~92.6 km/h
        course: 90,
        attributes: {
          ignition: false,
          totalDistance: 150000, // meters -> 150 km
          hours: 36000000, // ms -> 10 hours
          power: 12.5,
          obd: 'P0100'
        }
      };

      const results = TraccarAdapter.parse(payload);
      expect(results).toHaveLength(1);
      
      const { externalDeviceId, parsedData } = results[0];
      expect(externalDeviceId).toBe('TRAC-001');
      expect(parsedData.external_device_id).toBe('TRAC-001');
      expect(parsedData.eventId).toBe('999');
      expect(parsedData.timestamp_unix).toBe(new Date('2026-08-16T12:00:00.000Z').getTime() / 1000);
      expect(parsedData.latitude).toBe(36.7525);
      expect(parsedData.longitude).toBe(3.04197);
      expect(parsedData.speed).toBeCloseTo(92.6, 1);
      expect(parsedData.heading).toBe(90);
      
      expect(parsedData.ignition).toBe(false);
      expect(parsedData.odometer).toBe(150);
      expect(parsedData.engineHours).toBe(10);
      expect(parsedData.batteryVoltage).toBe(12.5);
      
      expect(parsedData.dtc).toBeDefined();
      expect(parsedData.dtc?.[0].code).toBe('P0100');
    });

    it('should support array payloads', () => {
      const payload = [
        { deviceId: 1, device: { uniqueId: 'DEV-1' }, latitude: 10, longitude: 10 },
        { deviceId: 2, device: { uniqueId: 'DEV-2' }, latitude: 20, longitude: 20 }
      ];
      const results = TraccarAdapter.parse(payload);
      expect(results).toHaveLength(2);
      expect(results[0].externalDeviceId).toBe('DEV-1');
      expect(results[1].externalDeviceId).toBe('DEV-2');
    });
  });

  describe('normalize', () => {
    it('should generate CanonicalTelemetryEvent filtering by capabilities', () => {
      const parsedData = {
        external_device_id: 'TRAC-001',
        provider: 'traccar' as const,
        latitude: 10,
        longitude: 20,
        speed: 50,
        ignition: true,
        engineTemperature: 90
      };

      const context = {
        tenantId: 'tenant-123',
        vehicleId: 'vehicle-456',
        deviceId: 'device-789',
        capabilities: {
          gps: true,
          ignition: true // Intentionally missing engineTemperature
        } as any
      };

      const event = TraccarAdapter.normalize(parsedData, context);

      expect(event.tenant_id).toBe('tenant-123');
      expect(event.vehicle_id).toBe('vehicle-456');
      expect(event.provider).toBe('traccar');
      expect(event.external_device_id).toBe('TRAC-001');
      
      // GPS included
      expect(event.position).toBeDefined();
      expect(event.position?.latitude).toBe(10);
      expect(event.position?.speed).toBe(50);
      
      // Ignition included, temp filtered out
      expect(event.vehicleState).toBeDefined();
      expect(event.vehicleState?.ignition).toBe(true);
      expect(event.vehicleState?.engineTemperature).toBeUndefined();
    });
  });
});
