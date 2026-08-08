import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ManualEntryProvider,
  TeltonikaAdapter,
  FlespiWialonAdapter,
  getProviderForVehicle,
  INITIAL_SEED_DEVICE_MAPPINGS,
} from './telematicsService';
import { TelematicsProvider, ActiveFaultCode, DeviceMapping, Vehicle } from '../types';

describe('Vendor-Agnostic Telematics Ingestion Layer', () => {
  beforeEach(() => {
    vi.resetAllMocks();
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
      const adapter = new TeltonikaAdapter('TEL-864201049281002');
      expect(adapter.providerName).toBe('teltonika');
      expect(adapter.isConnected).toBe(false);

      const faults = await adapter.getFaultCodes('V-018');
      expect(faults).toEqual([]);

      const pos = await adapter.getPosition('V-018');
      expect(pos).toBeNull();
    });
  });

  describe('FlespiWialonAdapter (Middleware Stub)', () => {
    it('returns not connected status and empty fault codes without faking vendor payload', async () => {
      const adapter = new FlespiWialonAdapter('WIA-UNIT-908123');
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
        vehicle_id: 'V-TELTONIKA',
        provider: 'teltonika',
        external_device_id: 'IMEI-99',
      },
      {
        id: 'M3',
        tenant_id: 'TNT-1',
        vehicle_id: 'V-FLESPI',
        provider: 'flespi_wialon',
        external_device_id: 'UNIT-77',
      },
    ];

    it('returns ManualEntryProvider for manual mapping or missing mapping', () => {
      const p1 = getProviderForVehicle('V-MANUAL', testMappings);
      expect(p1.providerName).toBe('manual');

      const pUnmapped = getProviderForVehicle('V-UNKNOWN', testMappings);
      expect(pUnmapped.providerName).toBe('manual');
    });

    it('returns TeltonikaAdapter for teltonika mapping', () => {
      const p2 = getProviderForVehicle('V-TELTONIKA', testMappings);
      expect(p2.providerName).toBe('teltonika');
      expect((p2 as TeltonikaAdapter).externalDeviceId).toBe('IMEI-99');
    });

    it('returns FlespiWialonAdapter for flespi_wialon mapping', () => {
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
        providerName: 'teltonika',
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
});
