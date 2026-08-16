import { describe, it, expect } from 'vitest';
import { normalizeTelemetryPayload, ProviderPayload } from '../TelemetryNormalizer';
import { TelematicsCapabilities } from '../../../types';

describe('TelemetryNormalizer', () => {
  const baseContext = {
    vehicle_id: 'veh-1',
    tenant_id: 'tenant-1',
    device_id: 'dev-1',
    dataSource: 'live_telematics' as const,
  };

  const defaultCapabilities: TelematicsCapabilities = {
    gps: true,
    ignition: true,
    speed: true,
    odometer: true,
    fuelLevel: false, // Explicitly disabled
    engineRpm: false,
    engineTemperature: false,
    obd2: false,
    eobd: false,
    j1939: false,
    j1708: false,
    canBus: false,
    dtc: true,
    harshDriving: false,
    batteryVoltage: false,
    digitalInputs: 0,
    analogInputs: 0,
  };

  it('should generate deterministic eventId when provider does not supply one', () => {
    const payload1: ProviderPayload = {
      external_device_id: 'ext-1',
      provider: 'flespi',
      timestamp_unix: 1672531200, // Fixed time
      latitude: 36.75,
      longitude: 3.05,
      speed: 45,
      ignition: true,
      odometer: 15000,
    };

    const payload2: ProviderPayload = { ...payload1 }; // Exact duplicate

    const event1 = normalizeTelemetryPayload(payload1, { ...baseContext, capabilities: defaultCapabilities });
    const event2 = normalizeTelemetryPayload(payload2, { ...baseContext, capabilities: defaultCapabilities });

    expect(event1.eventId).toBeDefined();
    expect(event1.eventId).toEqual(event2.eventId); // Deterministic
  });

  it('should use provider eventId if supplied', () => {
    const payload: ProviderPayload = {
      eventId: 'prov-evt-999',
      external_device_id: 'ext-1',
      provider: 'flespi',
    };

    const event = normalizeTelemetryPayload(payload, { ...baseContext, capabilities: defaultCapabilities });
    
    expect(event.eventId).toBe('flespi_ext-1_prov-evt-999');
  });

  it('should strictly filter fields based on capabilities', () => {
    const payload: ProviderPayload = {
      external_device_id: 'ext-1',
      provider: 'flespi',
      latitude: 36.75,
      longitude: 3.05,
      speed: 45,
      ignition: true,
      fuelLevel: 80, // Payload has fuelLevel
      batteryVoltage: 12.5 // Payload has battery
    };

    const event = normalizeTelemetryPayload(payload, { ...baseContext, capabilities: defaultCapabilities });

    // GPS and ignition should be present
    expect(event.position?.latitude).toBe(36.75);
    expect(event.vehicleState?.ignition).toBe(true);

    // FuelLevel and batteryVoltage must be stripped because capabilities say false
    expect(event.vehicleState?.fuelLevel).toBeUndefined();
    expect(event.vehicleState?.batteryVoltage).toBeUndefined();
  });

  it('should resolve DTC codes if dtc capability is true', () => {
    const payload: ProviderPayload = {
      external_device_id: 'ext-1',
      provider: 'flespi',
      dtc: [
        { code: 'P0115', standard: 'OBDII' }
      ]
    };

    const event = normalizeTelemetryPayload(payload, { ...baseContext, capabilities: defaultCapabilities });
    
    expect(event.raw_dtc).toBeDefined();
    expect(event.raw_dtc?.length).toBe(1);
    expect(event.raw_dtc?.[0].code).toBe('P0115');
    
    expect(event.faults).toBeDefined();
    expect(event.faults.length).toBe(1);
    expect(event.faults[0].code).toBe('P0115');
    expect(event.faults[0].severity).toBeDefined(); // Processed by resolveFaultCode
  });

  it('should NOT resolve DTC codes if dtc capability is false', () => {
    const capsNoDtc = { ...defaultCapabilities, dtc: false };
    const payload: ProviderPayload = {
      external_device_id: 'ext-1',
      provider: 'flespi',
      dtc: [
        { code: 'P0115', standard: 'OBDII' }
      ]
    };

    const event = normalizeTelemetryPayload(payload, { ...baseContext, capabilities: capsNoDtc });
    
    // Completely stripped
    expect(event.raw_dtc).toBeUndefined();
    expect(event.faults).toEqual([]);
  });
});
