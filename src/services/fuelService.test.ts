import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fuelService } from './fuelService';
import { FuelLog } from '../types';

describe('fuelService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('computeConsumption', () => {
    it('returns null consumption for the first log', () => {
      const logs: FuelLog[] = [
        {
          id: '1',
          tenant_id: 't1',
          vehicle_id: 'v1',
          liters: 50,
          cost: 100,
          odometer_km: 10000,
          logged_at: '2026-01-01T00:00:00Z',
          anomaly_flag: false,
        },
      ];

      const result = fuelService.computeConsumption(logs);
      expect(result).toHaveLength(1);
      expect(result[0].distanceKm).toBeNull();
      expect(result[0].consumptionLPer100Km).toBeNull();
    });

    it('calculates correct L/100km between consecutive logs', () => {
      const logs: FuelLog[] = [
        {
          id: '1',
          tenant_id: 't1',
          vehicle_id: 'v1',
          liters: 50,
          cost: 100,
          odometer_km: 10000,
          logged_at: '2026-01-01T00:00:00Z',
          anomaly_flag: false,
        },
        {
          id: '2',
          tenant_id: 't1',
          vehicle_id: 'v1',
          liters: 60,
          cost: 120,
          odometer_km: 10500, // 500 km traveled with 60 liters -> 12 L/100km
          logged_at: '2026-01-10T00:00:00Z',
          anomaly_flag: false,
        },
      ];

      const result = fuelService.computeConsumption(logs);
      expect(result).toHaveLength(2);
      expect(result[1].distanceKm).toBe(500);
      expect(result[1].consumptionLPer100Km).toBe(12);
    });
  });

  describe('detectAnomalies', () => {
    it('flags log as anomalous when consumption exceeds trailing 90-day average by > 20%', () => {
      const logs: FuelLog[] = [
        {
          id: '1',
          tenant_id: 't1',
          vehicle_id: 'v1',
          liters: 50,
          cost: 100,
          odometer_km: 10000,
          logged_at: '2026-01-01T00:00:00Z',
          anomaly_flag: false,
        },
        {
          id: '2',
          tenant_id: 't1',
          vehicle_id: 'v1',
          liters: 50,
          cost: 100,
          odometer_km: 10500, // 500 km -> 10 L/100km
          logged_at: '2026-01-10T00:00:00Z',
          anomaly_flag: false,
        },
        {
          id: '3',
          tenant_id: 't1',
          vehicle_id: 'v1',
          liters: 50,
          cost: 100,
          odometer_km: 11000, // 500 km -> 10 L/100km
          logged_at: '2026-01-20T00:00:00Z',
          anomaly_flag: false,
        },
        {
          id: '4',
          tenant_id: 't1',
          vehicle_id: 'v1',
          liters: 80,
          cost: 160,
          odometer_km: 11500, // 500 km -> 16 L/100km (+60% > 20% over 10 L/100km)
          logged_at: '2026-01-30T00:00:00Z',
          anomaly_flag: false,
        },
      ];

      const evaluated = fuelService.detectAnomalies(logs);
      expect(evaluated).toHaveLength(4);
      expect(evaluated[1].isAnomalous).toBe(false);
      expect(evaluated[2].isAnomalous).toBe(false);
      expect(evaluated[3].isAnomalous).toBe(true);
      expect(evaluated[3].trailing90DayAvg).toBe(10);
    });

    it('does not flag normal consumption within 20% margin', () => {
      const logs: FuelLog[] = [
        {
          id: '1',
          tenant_id: 't1',
          vehicle_id: 'v1',
          liters: 50,
          cost: 100,
          odometer_km: 10000,
          logged_at: '2026-01-01T00:00:00Z',
          anomaly_flag: false,
        },
        {
          id: '2',
          tenant_id: 't1',
          vehicle_id: 'v1',
          liters: 50,
          cost: 100,
          odometer_km: 10500, // 10 L/100km
          logged_at: '2026-01-10T00:00:00Z',
          anomaly_flag: false,
        },
        {
          id: '3',
          tenant_id: 't1',
          vehicle_id: 'v1',
          liters: 55,
          cost: 110,
          odometer_km: 11000, // 11 L/100km (+10% < +20%)
          logged_at: '2026-01-20T00:00:00Z',
          anomaly_flag: false,
        },
      ];

      const evaluated = fuelService.detectAnomalies(logs);
      expect(evaluated[2].isAnomalous).toBe(false);
    });
  });
});
