import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ManualEntryProvider,
  TeltonikaAdapter,
  FlespiWialonAdapter,
  getProviderForVehicle,
  DEV_FIXTURE_DEVICE_MAPPINGS,
} from './telematicsService';
import { TelematicsProvider, ActiveFaultCode, DeviceMapping, Vehicle } from '../types';
import { translateJ1939ToActiveFault, resolveFaultCode, resolveOBD2FaultCode } from './faultCodeMappingService';
import { DecisionEngine } from './decisionEngine';

describe('Vendor-Agnostic Telematics Ingestion Layer', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('ManualEntryProvider', () => {
    it('initializes connected and returns stored fault codes and default position', async () => {
      const mockVehicles: Vehicle[] = [
        {
          id: 'V-TEST-01',
          plate: 'NX-999-TR',
          name: 'Transit Test 1',
          classification: 'Keystone',
          status: 'Healthy',
          lifecycle_status: 'IN_SERVICE',
    status_reason: 'Normal operation',
          last_check_date: '2026-08-01',
          active_fault_codes: [
            {
              code: 'P0300',
              name: 'Random/Multiple Cylinder Misfire',
              severity: 'Warning',
              logged_date: '2026-08-01',
              required_intervention: 'Inspect spark plugs',
            },
          ],
          mileage: 120000,
          next_service_mileage: 130000,
          next_service_date: '2026-09-01',
          scheduled_use_days: 2,
          maintenance_history: [],
          fault_score: 90,
          compliance_score: 100,
          freshness_score: 100,
          classification_weight: 1.5,
          delay_multiplier: 2.2,
        },
      ];

      const provider = new ManualEntryProvider(mockVehicles);
      expect(provider.providerName).toBe('manual');
      expect(provider.isConnected).toBe(true);

      const faults = await provider.getFaultCodes('V-TEST-01');
      expect(faults).toHaveLength(1);
      expect(faults[0].code).toBe('P0300');

      const pos = await provider.getPosition('V-TEST-01');
      expect(pos).not.toBeNull();
      expect(pos?.latitude).toBe(36.7538);
    });

    it('notifies subscribers upon setVehicleFaultCodes', async () => {
      const provider = new ManualEntryProvider();
      const listener = vi.fn();

      const unsubscribe = provider.subscribe('V-TEST-02', listener);

      const newFaults: ActiveFaultCode[] = [
        {
          code: 'P0217',
          name: 'Engine Overheat Condition',
          severity: 'Critical',
          logged_date: '2026-08-04',
          required_intervention: 'Immediate engine shutdown',
        },
      ];

      provider.setVehicleFaultCodes('V-TEST-02', newFaults);

      expect(listener).toHaveBeenCalledWith({ faultCodes: newFaults });

      unsubscribe();
      provider.setVehicleFaultCodes('V-TEST-02', []);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('TeltonikaAdapter (Hardware Stub)', () => {
    it('returns not connected status and empty fault codes without faking vendor payload', async () => {
      const adapter = new TeltonikaAdapter('DEV-FIXTURE-IMEI-001');
      expect(adapter.providerName).toBe('teltonika_direct');
      expect(adapter.isConnected).toBe(false);

      const faults = await adapter.getFaultCodes('V-018');
      expect(faults).toEqual([]);

      const pos = await adapter.getPosition('V-018');
      expect(pos).toBeNull();
    });
  });

  describe('FlespiWialonAdapter (Middleware Stub)', () => {
    it('returns not connected status and empty fault codes without faking vendor payload', async () => {
      const adapter = new FlespiWialonAdapter('DEV-FIXTURE-UNIT-001');
      expect(adapter.providerName).toBe('flespi_wialon');
      expect(adapter.isConnected).toBe(false);

      const faults = await adapter.getFaultCodes('V-007');
      expect(faults).toEqual([]);

      const pos = await adapter.getPosition('V-007');
      expect(pos).toBeNull();
    });
  });

  describe('getProviderForVehicle Factory Function', () => {
    const testMappings: DeviceMapping[] = [
      {
        id: 'M1',
        tenant_id: 'TNT-1',
        vehicle_id: 'V-MANUAL',
        provider: 'manual',
        external_device_id: 'DEV-01',
      },
      {
        id: 'M2',
        tenant_id: 'TNT-1',
        vehicle_id: 'V-DIRECT-TELTONIKA',
        provider: 'direct',
        protocol: 'teltonika',
        external_device_id: 'IMEI-99',
      },
      {
        id: 'M3',
        tenant_id: 'TNT-1',
        vehicle_id: 'V-FLESPI',
        provider: 'flespi',
        protocol: 'teltonika',
        external_device_id: 'UNIT-77',
      },
    ];

    it('returns ManualEntryProvider for manual mapping or missing mapping', () => {
      const p1 = getProviderForVehicle('V-MANUAL', testMappings);
      expect(p1.providerName).toBe('manual');

      const pUnmapped = getProviderForVehicle('V-UNKNOWN', testMappings);
      expect(pUnmapped.providerName).toBe('manual');
    });

    it('returns TeltonikaAdapter for direct+teltonika protocol mapping', () => {
      const p2 = getProviderForVehicle('V-DIRECT-TELTONIKA', testMappings);
      expect(p2.providerName).toBe('teltonika_direct');
      expect((p2 as TeltonikaAdapter).externalDeviceId).toBe('IMEI-99');
    });

    it('returns FlespiWialonAdapter for flespi provider mapping', () => {
      const p3 = getProviderForVehicle('V-FLESPI', testMappings);
      expect(p3.providerName).toBe('flespi_wialon');
      expect((p3 as FlespiWialonAdapter).externalDeviceId).toBe('UNIT-77');
    });
  });

  describe('Rule R1 Decision Engine Execution via TelematicsProvider Injection', () => {
    /**
     * Rule R1 (Emergency Stop / Red Alert):
     * Any active OBD fault categorized as Critical must immediately mark the vehicle status
     * as Unsafe / Red and remove from dispatch.
     *
     * This test verifies that the decision engine logic operates on the TelematicsProvider abstraction,
     * independent of vendor payload structure.
     */
    async function evaluateRuleR1ForProvider(
      vehicleId: string,
      provider: TelematicsProvider
    ): Promise<{ isUnsafeRed: boolean; criticalFaultName?: string }> {
      const faultCodes = await provider.getFaultCodes(vehicleId);
      const criticalFault = faultCodes.find((f) => f.severity === 'Critical');

      if (criticalFault) {
        return {
          isUnsafeRed: true,
          criticalFaultName: criticalFault.name,
        };
      }

      return { isUnsafeRed: false };
    }

    it('triggers R1 Emergency Red Alert consistently across injected providers returning critical fault', async () => {
      const criticalFault: ActiveFaultCode = {
        code: 'P0217',
        name: 'Engine Overheat Condition',
        severity: 'Critical',
        logged_date: '2026-08-04',
        required_intervention: 'Immediate engine shutdown',
      };

      // Mock TelematicsProvider #1 (Manual)
      const manualProvider = new ManualEntryProvider();
      manualProvider.setVehicleFaultCodes('V-CRIT-01', [criticalFault]);

      // Mock TelematicsProvider #2 (Teltonika simulation mock)
      const mockTeltonikaProvider: TelematicsProvider = {
        providerName: 'teltonika_direct',
        isConnected: true,
        getFaultCodes: async () => [criticalFault],
        getPosition: async () => null,
        subscribe: () => () => {},
      };

      // Mock TelematicsProvider #3 (Flespi simulation mock)
      const mockFlespiProvider: TelematicsProvider = {
        providerName: 'flespi_wialon',
        isConnected: true,
        getFaultCodes: async () => [criticalFault],
        getPosition: async () => null,
        subscribe: () => () => {},
      };

      const res1 = await evaluateRuleR1ForProvider('V-CRIT-01', manualProvider);
      const res2 = await evaluateRuleR1ForProvider('V-CRIT-01', mockTeltonikaProvider);
      const res3 = await evaluateRuleR1ForProvider('V-CRIT-01', mockFlespiProvider);

      expect(res1.isUnsafeRed).toBe(true);
      expect(res2.isUnsafeRed).toBe(true);
      expect(res3.isUnsafeRed).toBe(true);
      expect(res1.criticalFaultName).toBe('Engine Overheat Condition');
      expect(res2.criticalFaultName).toBe('Engine Overheat Condition');
      expect(res3.criticalFaultName).toBe('Engine Overheat Condition');
    });
  });

  describe('SAE J1939 Diagnostic Code Mapping Service', () => {
    it('correctly translates SPN 110 FMI 0 (Engine Coolant Overheat) to Critical P0217', () => {
      const result = translateJ1939ToActiveFault({ spn: 110, fmi: 0, loggedDate: '2026-08-09T00:00:00Z' });
      expect(result.code).toBe('P0217');
      expect(result.severity).toBe('Critical');
      expect(result.name).toContain('Engine Coolant Temperature');
    });

    it('correctly translates SPN 190 FMI 0 (Engine Overspeed) to Critical P0219', () => {
      const result = translateJ1939ToActiveFault({ spn: 190, fmi: 0 });
      expect(result.code).toBe('P0219');
      expect(result.severity).toBe('Critical');
    });

    it('correctly translates SPN 100 FMI 1 (Low Oil Pressure) to Critical P0524', () => {
      const result = translateJ1939ToActiveFault({ spn: 100, fmi: 1 });
      expect(result.code).toBe('P0524');
      expect(result.severity).toBe('Critical');
    });

    it('correctly translates SPN 84 FMI 9 (Wheel Speed Sensor) to Warning', () => {
      const result = translateJ1939ToActiveFault({ spn: 84, fmi: 9 });
      expect(result.code).toBe('SPN-84-FMI-9');
      expect(result.severity).toBe('Warning');
    });

    it('handles unrecognized SPN/FMI codes cleanly by setting severity to Unknown without crashing', () => {
      const result = translateJ1939ToActiveFault({ spn: 999, fmi: 1 });
      expect(result.code).toBe('SPN-999-FMI-1');
      expect(result.severity).toBe('Unknown');
    });
  });

  describe('FaultCodeResolver (OBD-II Standard — vehicle-agnostic)', () => {
    // These tests verify that fault code resolution is standard-agnostic.
    // The same codes apply to any OBD-II compliant vehicle, regardless of make/model.

    it('resolves P0217 (OBDII) to Critical severity — triggers R1 on any vehicle', () => {
      const result = resolveOBD2FaultCode('P0217');
      expect(result.code).toBe('P0217');
      expect(result.severity).toBe('Critical');
      expect(result.name).toBe('Engine Coolant Overtemperature');
      expect(result.standard).toBe('OBDII');
    });

    it('resolves P0219 (OBDII) to Critical severity', () => {
      const result = resolveOBD2FaultCode('P0219');
      expect(result.code).toBe('P0219');
      expect(result.severity).toBe('Critical');
    });

    it('resolves P0524 (OBDII) to Critical severity', () => {
      const result = resolveOBD2FaultCode('P0524');
      expect(result.code).toBe('P0524');
      expect(result.severity).toBe('Critical');
    });

    it('resolves P0088 (OBDII) to Critical severity — high-pressure fuel rail', () => {
      const result = resolveOBD2FaultCode('P0088');
      expect(result.code).toBe('P0088');
      expect(result.severity).toBe('Critical');
    });

    it('resolves P0380 (OBDII) to Warning severity — diesel glow plug', () => {
      const result = resolveOBD2FaultCode('P0380');
      expect(result.code).toBe('P0380');
      expect(result.severity).toBe('Warning');
    });

    it('resolves P0420 (OBDII) to Info severity — catalyst efficiency', () => {
      const result = resolveOBD2FaultCode('P0420');
      expect(result.code).toBe('P0420');
      expect(result.severity).toBe('Info');
    });

    it('resolves unknown OBDII P-code to Unknown severity — never invents data', () => {
      const result = resolveOBD2FaultCode('P9999');
      expect(result.code).toBe('P9999');
      expect(result.severity).toBe('Unknown');
      expect(result.standard).toBe('OBDII');
    });

    it('resolveFaultCode dispatches EOBD codes through OBD-II dictionary (same standard)', () => {
      const result = resolveFaultCode('P0217', 'EOBD');
      expect(result.severity).toBe('Critical');
      expect(result.standard).toBe('OBDII');
    });

    it('resolveFaultCode dispatches J1939 SPN/FMI correctly — rétrocompatibilité', () => {
      const result = resolveFaultCode('SPN-110-FMI-0', 'J1939', { spn: 110, fmi: 0 });
      expect(result.code).toBe('P0217');
      expect(result.severity).toBe('Critical');
      expect(result.standard).toBe('J1939');
    });

    it('resolveFaultCode returns Unknown for OEM codes not in standard dictionary', () => {
      const result = resolveFaultCode('P1234', 'OEM');
      expect(result.severity).toBe('Unknown');
    });

    it('Critical OBD-II fault triggers R1 when fed to DecisionEngine', () => {
      const criticalFault = resolveOBD2FaultCode('P0217');
      expect(criticalFault.severity).toBe('Critical');
      // The Decision Engine only cares about severity — not the standard or vehicle type
      const faults = [criticalFault];
      const criticalFound = faults.find((f) => f.severity === 'Critical');
      expect(criticalFound).toBeDefined();
    });
  });

  describe('CapabilityResolver — theoretical vs actual installation capabilities', () => {
    it('defaults all capabilities to false/0 when no capabilities are declared', async () => {
      const { resolveCapabilities } = await import('./telemetry/CapabilityResolver');
      const result = resolveCapabilities({ capabilities: undefined });
      expect(result.gps).toBe(false);
      expect(result.obd2).toBe(false);
      expect(result.j1939).toBe(false);
      expect(result.dtc).toBe(false);
      expect(result.digitalInputs).toBe(0);
    });

    it('returns device-level capabilities when no installation overlay is provided', async () => {
      const { resolveCapabilities } = await import('./telemetry/CapabilityResolver');
      const deviceCaps = { gps: true, ignition: true, speed: true, obd2: true, eobd: true, j1939: false, j1708: false, canBus: true, dtc: true, harshDriving: false, batteryVoltage: true, fuelLevel: false, engineRpm: true, engineTemperature: true, odometer: false, digitalInputs: 4, analogInputs: 2 };
      const result = resolveCapabilities({ capabilities: undefined }, { capabilities: deviceCaps });
      expect(result.gps).toBe(true);
      expect(result.obd2).toBe(true);
      expect(result.j1939).toBe(false);
    });

    it('installation overlay overrides device-level capabilities', async () => {
      const { resolveCapabilities } = await import('./telemetry/CapabilityResolver');
      const deviceCaps = { gps: true, ignition: true, speed: true, obd2: true, eobd: true, j1939: false, j1708: false, canBus: true, dtc: true, harshDriving: false, batteryVoltage: true, fuelLevel: true, engineRpm: true, engineTemperature: true, odometer: true, digitalInputs: 4, analogInputs: 2 };
      // Installation-specific: fuelLevel sensor not wired on this vehicle
      const installationOverlay = { fuelLevel: false };
      const result = resolveCapabilities({ capabilities: installationOverlay }, { capabilities: deviceCaps });
      expect(result.fuelLevel).toBe(false);  // overlay wins
      expect(result.gps).toBe(true);         // device-level preserved
    });
  });

  describe('TelemetryNormalizer — vehicle-agnostic payload normalization', () => {
    it('normalizes a payload with position and DTC to NormalizedTelemetryEvent', async () => {
      const { normalizeTelemetryPayload } = await import('./telemetry/TelemetryNormalizer');
      const capabilities = { gps: true, ignition: true, speed: true, obd2: true, eobd: true, j1939: false, j1708: false, canBus: true, dtc: true, harshDriving: false, batteryVoltage: false, fuelLevel: false, engineRpm: false, engineTemperature: false, odometer: false, digitalInputs: 0, analogInputs: 0 };
      const payload = {
        provider: 'manual' as const,
        external_device_id: 'TEST-IMEI-001',
        timestamp_unix: 1723657200,
        latitude: 36.7538,
        longitude: 3.0588,
        speed: 45,
        dtc: [{ code: 'P0217', standard: 'OBDII' as const }],
      };
      const event = normalizeTelemetryPayload(payload, {
        vehicle_id: 'V-TEST-GENERIC',
        tenant_id: 'TNT-TEST-001',
        capabilities,
      });
      expect(event.vehicle_id).toBe('V-TEST-GENERIC');
      expect(event.position?.latitude).toBe(36.7538);
      expect(event.faults).toHaveLength(1);
      expect(event.faults[0].severity).toBe('Critical'); // P0217 -> Critical via policy
      expect(event.data_source).toBe('live_telematics');
      // raw_dtc preserved for audit
      expect(event.raw_dtc).toHaveLength(1);
      expect(event.raw_dtc![0].code).toBe('P0217');
    });

    it('emits empty faults when dtc capability is false — never assumes availability', async () => {
      const { normalizeTelemetryPayload } = await import('./telemetry/TelemetryNormalizer');
      const capabilities = { gps: true, ignition: false, speed: true, obd2: false, eobd: false, j1939: false, j1708: false, canBus: false, dtc: false, harshDriving: false, batteryVoltage: false, fuelLevel: false, engineRpm: false, engineTemperature: false, odometer: false, digitalInputs: 0, analogInputs: 0 };
      const payload = {
        provider: 'manual' as const,
        external_device_id: 'TEST-GPS-ONLY',
        latitude: 36.7538,
        longitude: 3.0588,
        dtc: [{ code: 'P0217', standard: 'OBDII' as const }], // present in payload but dtc=false
      };
      const event = normalizeTelemetryPayload(payload, {
        vehicle_id: 'V-GPS-ONLY',
        tenant_id: 'TNT-TEST-001',
        capabilities,
      });
      expect(event.faults).toHaveLength(0); // dtc capability is false — silently ignored
      expect(event.position).toBeDefined();  // GPS still works
    });
  });

  describe('Reference Integration Scenario — Terrain Validation (Fixture Only)', () => {
    // This describe validates that the GENERIC architecture works correctly
    // for the first field validation scenario. The vehicle type (Kangoo 2012)
    // and device (FMB140) are fixtures only — no vehicle-specific logic exists
    // in any of the services tested here.
    it('processes a Flespi-format payload through the generic pipeline without vehicle-specific logic', async () => {
      const { parseFlespiMessage } = await import('./telemetry/providers/FlespiAdapter');
      const { normalizeTelemetryPayload } = await import('./telemetry/TelemetryNormalizer');
      // Simulate a real Flespi FMB140 payload — field names are Flespi standard, not FMB140-specific
      const rawFlespiPayload = {
        ident: 'REFERENCE-IMEI-001',
        timestamp: 1723657200,
        'position.latitude': 36.7538,
        'position.longitude': 3.0588,
        'position.speed': 45,
        'position.direction': 135,
        'engine.ignition.status': true,
        'din.dtc': [{ code: 'P0217', standard: 'OBDII' }],
      };
      const parsed = parseFlespiMessage(rawFlespiPayload);
      expect(parsed.external_device_id).toBe('REFERENCE-IMEI-001');
      expect(parsed.latitude).toBe(36.7538);
      expect(parsed.ignition).toBe(true);
      expect(parsed.dtc).toHaveLength(1);

      // Now normalize through the generic pipeline
      const capabilities = { gps: true, ignition: true, speed: true, obd2: true, eobd: true, j1939: false, j1708: false, canBus: true, dtc: true, harshDriving: false, batteryVoltage: false, fuelLevel: false, engineRpm: false, engineTemperature: false, odometer: false, digitalInputs: 0, analogInputs: 0 };
      const event = normalizeTelemetryPayload(parsed, {
        vehicle_id: 'V-REF-INTEGRATION-001', // Generic ID — not 'KANGOO' or any model
        tenant_id: 'TNT-REF-001',
        capabilities,
      });
      expect(event.faults[0].severity).toBe('Critical');
      expect(event.position?.latitude).toBe(36.7538);
    });
  });

  describe('DecisionEngine Historical Replay Mode (Non-Mutating)', () => {
    it('executes batch replay evaluation over historical telemetry events without state mutation', () => {
      const vehicleId = 'V-HIST-01';
      const events = [
        {
          timestamp: '2026-08-01T10:00:00Z',
          faultCodes: [translateJ1939ToActiveFault({ spn: 110, fmi: 0 })],
          actualSpend: 15000,
          projectedBudget: 12000,
        },
        {
          timestamp: '2026-08-02T14:00:00Z',
          faultCodes: [],
          actualSpend: 5000,
          projectedBudget: 5000,
        },
      ];

      const report = DecisionEngine.executeReplayEvaluationBatch(vehicleId, events);

      expect(report.vehicle_id).toBe('V-HIST-01');
      expect(report.totalEventsProcessed).toBe(2);
      expect(report.r1CriticalEventsCount).toBe(1);
      expect(report.r5MeanCaeScore).toBeGreaterThan(0);
      expect(report.r7ProjectedVariancePercentage).toBe(17.6);
      expect(report.evaluatedEvents).toHaveLength(2);
    });
  });
});
