import { supabase } from '../lib/supabase';
import { FuelLog } from '../types';

export interface CalculatedFuelLog {
  log: FuelLog;
  distanceKm: number | null;
  consumptionLPer100Km: number | null;
  isAnomalous: boolean;
  trailing90DayAvg?: number | null;
}

// Initial seed fuel logs for demo / fallback
export const INITIAL_SEED_FUEL_LOGS: FuelLog[] = [
  {
    id: 'FL-001',
    tenant_id: 'c0a80101-0000-0000-0000-000000000001',
    vehicle_id: 'V-024',
    liters: 120,
    cost: 180,
    odometer_km: 125000,
    logged_at: '2026-05-01T08:00:00Z',
    anomaly_flag: false,
    created_at: '2026-05-01T08:00:00Z',
  },
  {
    id: 'FL-002',
    tenant_id: 'c0a80101-0000-0000-0000-000000000001',
    vehicle_id: 'V-024',
    liters: 130,
    cost: 195,
    odometer_km: 125400, // 400 km -> 32.5 L/100km
    logged_at: '2026-05-15T08:00:00Z',
    anomaly_flag: false,
    created_at: '2026-05-15T08:00:00Z',
  },
  {
    id: 'FL-003',
    tenant_id: 'c0a80101-0000-0000-0000-000000000001',
    vehicle_id: 'V-024',
    liters: 125,
    cost: 187.5,
    odometer_km: 125800, // 400 km -> 31.25 L/100km
    logged_at: '2026-06-01T08:00:00Z',
    anomaly_flag: false,
    created_at: '2026-06-01T08:00:00Z',
  },
  {
    id: 'FL-004',
    tenant_id: 'c0a80101-0000-0000-0000-000000000001',
    vehicle_id: 'V-024',
    liters: 180,
    cost: 270,
    odometer_km: 126200, // 400 km -> 45.0 L/100km (> 1.2 * ~31.875) -> ANOMALY!
    logged_at: '2026-06-15T08:00:00Z',
    anomaly_flag: true,
    created_at: '2026-06-15T08:00:00Z',
  },
  {
    id: 'FL-005',
    tenant_id: 'c0a80101-0000-0000-0000-000000000001',
    vehicle_id: 'V-018',
    liters: 95,
    cost: 142.5,
    odometer_km: 98000,
    logged_at: '2026-05-10T08:00:00Z',
    anomaly_flag: false,
    created_at: '2026-05-10T08:00:00Z',
  },
  {
    id: 'FL-006',
    tenant_id: 'c0a80101-0000-0000-0000-000000000001',
    vehicle_id: 'V-018',
    liters: 100,
    cost: 150,
    odometer_km: 98500, // 500 km -> 20.0 L/100km
    logged_at: '2026-05-25T08:00:00Z',
    anomaly_flag: false,
    created_at: '2026-05-25T08:00:00Z',
  },
];

let inMemoryFuelLogs: FuelLog[] = [...INITIAL_SEED_FUEL_LOGS];

export const fuelService = {
  /**
   * Helper to compute consumption in L/100km for a list of logs sorted ascending by date/odometer
   */
  computeConsumption(logs: FuelLog[]): CalculatedFuelLog[] {
    const sorted = [...logs].sort(
      (a, b) =>
        new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime() ||
        a.odometer_km - b.odometer_km
    );

    const results: CalculatedFuelLog[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      if (i === 0) {
        results.push({
          log: current,
          distanceKm: null,
          consumptionLPer100Km: null,
          isAnomalous: current.anomaly_flag || false,
        });
        continue;
      }

      const previous = sorted[i - 1];
      const distance = current.odometer_km - previous.odometer_km;

      if (distance > 0) {
        const consumption = (current.liters / distance) * 100;
        results.push({
          log: current,
          distanceKm: distance,
          consumptionLPer100Km: parseFloat(consumption.toFixed(2)),
          isAnomalous: current.anomaly_flag || false,
        });
      } else {
        results.push({
          log: current,
          distanceKm: distance <= 0 ? 0 : null,
          consumptionLPer100Km: null,
          isAnomalous: current.anomaly_flag || false,
        });
      }
    }

    return results;
  },

  /**
   * Anomaly detection: flag a fuel log as anomalous when its computed consumption exceeds
   * the vehicle's trailing 90-day average by more than 20% (> 1.20 * trailing_90d_avg).
   */
  detectAnomalies(logs: FuelLog[]): CalculatedFuelLog[] {
    const withConsumption = this.computeConsumption(logs);

    return withConsumption.map((item, i) => {
      if (item.consumptionLPer100Km === null) {
        return { ...item, isAnomalous: false, trailing90DayAvg: null };
      }

      const currentDate = new Date(item.log.logged_at).getTime();
      const NinetyDaysMs = 90 * 24 * 60 * 60 * 1000;

      // Find all preceding valid consumptions within 90 days before currentDate
      const trailingLogs = withConsumption.slice(0, i).filter((prev) => {
        if (prev.consumptionLPer100Km === null) return false;
        const prevDate = new Date(prev.log.logged_at).getTime();
        const diff = currentDate - prevDate;
        return diff >= 0 && diff <= NinetyDaysMs;
      });

      if (trailingLogs.length === 0) {
        return { ...item, isAnomalous: false, trailing90DayAvg: null };
      }

      const sum = trailingLogs.reduce((acc, curr) => acc + (curr.consumptionLPer100Km || 0), 0);
      const avg = sum / trailingLogs.length;

      // > 20% over trailing 90-day average
      const isAnomalous = item.consumptionLPer100Km > avg * 1.20;

      return {
        ...item,
        isAnomalous,
        trailing90DayAvg: parseFloat(avg.toFixed(2)),
        log: {
          ...item.log,
          anomaly_flag: isAnomalous,
        },
      };
    });
  },

  /**
   * Get fuel logs (from Supabase with in-memory fallback)
   */
  async getFuelLogs(vehicleId?: string): Promise<FuelLog[]> {
    try {
      let query = supabase.from('fuel_logs').select('*');
      if (vehicleId) {
        query = query.eq('vehicle_id', vehicleId);
      }
      const { data, error } = await query.order('logged_at', { ascending: true });

      if (error) {
        throw new Error(`fetchFuelLogs failed: ${error.message}`);
      }
      if (!data) {
        return [];
      }

      const mapped: FuelLog[] = data.map((d: any) => ({
        id: d.id,
        tenant_id: d.tenant_id,
        vehicle_id: d.vehicle_id,
        liters: Number(d.liters),
        cost: Number(d.cost),
        odometer_km: d.odometer_km || d.odometer || 0,
        logged_at: d.logged_at || d.date || new Date().toISOString(),
        anomaly_flag: Boolean(d.anomaly_flag),
        created_at: d.created_at,
        updated_at: d.updated_at,
      }));

      return mapped;
    } catch (e) {
      throw e;
    }
  },

  /**
   * Add a new fuel log, checking anomaly flag first
   */
  async addFuelLog(logInput: {
    vehicle_id: string;
    tenant_id?: string;
    liters: number;
    cost: number;
    odometer_km: number;
    logged_at?: string;
  }): Promise<FuelLog> {
    const loggedAt = logInput.logged_at || new Date().toISOString();
    const existingLogs = await this.getFuelLogs(logInput.vehicle_id);

    const tempNewLog: FuelLog = {
      id: `FL-${Date.now()}`,
      tenant_id: logInput.tenant_id || 'c0a80101-0000-0000-0000-000000000001',
      vehicle_id: logInput.vehicle_id,
      liters: logInput.liters,
      cost: logInput.cost,
      odometer_km: logInput.odometer_km,
      logged_at: loggedAt,
      anomaly_flag: false,
      created_at: new Date().toISOString(),
    };

    // Calculate anomaly flag
    const allLogs = [...existingLogs, tempNewLog];
    const evaluated = this.detectAnomalies(allLogs);
    const lastEvaluated = evaluated.find((e) => e.log.id === tempNewLog.id);
    const isAnomalous = lastEvaluated?.isAnomalous || false;

    tempNewLog.anomaly_flag = isAnomalous;

    try {
      const { data, error } = await supabase
        .from('fuel_logs')
        .insert({
          tenant_id: tempNewLog.tenant_id,
          vehicle_id: tempNewLog.vehicle_id,
          liters: tempNewLog.liters,
          cost: tempNewLog.cost,
          odometer_km: tempNewLog.odometer_km,
          logged_at: tempNewLog.logged_at,
          anomaly_flag: tempNewLog.anomaly_flag,
        })
        .select()
        .single();

      if (!error && data) {
        const savedLog: FuelLog = {
          id: data.id,
          tenant_id: data.tenant_id,
          vehicle_id: data.vehicle_id,
          liters: Number(data.liters),
          cost: Number(data.cost),
          odometer_km: data.odometer_km,
          logged_at: data.logged_at,
          anomaly_flag: data.anomaly_flag,
          created_at: data.created_at,
        };
        inMemoryFuelLogs.push(savedLog);
        return savedLog;
      }
    } catch (e) {
      console.warn('Fallback to in-memory addFuelLog:', e);
    }

    inMemoryFuelLogs.push(tempNewLog);
    return tempNewLog;
  },
};
