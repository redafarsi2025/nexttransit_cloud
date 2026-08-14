import {
  TelematicsProvider,
  TelematicsAdapterType,
  DeviceMapping,
  ActiveFaultCode,
  Position,
  Unsubscribe,
  Vehicle,
} from '../types';
import { supabase } from '../lib/supabase';
import { getCurrentTenantId } from './fleetData';

/**
 * NextTransit Vendor-Agnostic Telematics Ingestion Layer
 *
 * Provides a unified abstraction layer (TelematicsProvider interface) that decouples
 * the R1-R7 Decision Engine from vendor-specific telematics hardware and payload formats.
 *
 * Supported Adapters:
 * 1. ManualEntryProvider: Fully functional declarative/manual data entry provider.
 * 2. TeltonikaAdapter: Hardware stub for Teltonika FM/FMM series OBD telematics boxes.
 * 3. FlespiWialonAdapter: Middleware stub for Flespi/Wialon telematics streaming platform.
 */

/**
 * DEV/TEST FIXTURES ONLY — Not for production use.
 * In production, device mappings are created via the tenant provisioning workflow
 * (Vehicle -> Tracker -> Provider -> IMEI) and persisted in Supabase device_mappings.
 *
 * These fixtures exist solely to allow offline/demo development and unit tests
 * to exercise the telematics pipeline without a live Supabase connection.
 * No real vehicle registrations, IMEIs, or device models should appear here.
 */
export const DEV_FIXTURE_DEVICE_MAPPINGS: DeviceMapping[] = [
  {
    id: 'DM-FIXTURE-001',
    tenant_id: 'c0a80101-0000-0000-0000-000000000001',
    vehicle_id: 'V-024',
    provider: 'manual',
    external_device_id: 'MAN-V024-DEV-FIXTURE',
    is_active: true,
  },
  {
    id: 'DM-FIXTURE-002',
    tenant_id: 'c0a80101-0000-0000-0000-000000000001',
    vehicle_id: 'V-018',
    provider: 'direct',
    protocol: 'teltonika',
    external_device_id: 'DEV-FIXTURE-IMEI-001',
    is_active: true,
    capabilities: { gps: true, ignition: true, speed: true, obd2: false, eobd: false, j1939: true, dtc: true, odometer: false, fuelLevel: false, engineRpm: false, engineTemperature: false, j1708: false, canBus: true, harshDriving: false, batteryVoltage: true, digitalInputs: 2, analogInputs: 1 },
  },
  {
    id: 'DM-FIXTURE-003',
    tenant_id: 'c0a80101-0000-0000-0000-000000000001',
    vehicle_id: 'V-007',
    provider: 'flespi',
    protocol: 'teltonika',
    external_device_id: 'DEV-FIXTURE-UNIT-001',
    is_active: true,
    capabilities: { gps: true, ignition: true, speed: true, obd2: true, eobd: true, j1939: false, dtc: true, odometer: true, fuelLevel: false, engineRpm: true, engineTemperature: true, j1708: false, canBus: true, harshDriving: true, batteryVoltage: true, digitalInputs: 4, analogInputs: 2 },
  },
];

// ==========================================
// 1. MANUAL ENTRY PROVIDER (DECLARATIVE)
// ==========================================
export class ManualEntryProvider implements TelematicsProvider {
  public readonly providerName: TelematicsAdapterType = 'manual';
  public readonly isConnected: boolean = true;

  private listeners: Map<
    string,
    Set<(data: { faultCodes?: ActiveFaultCode[]; position?: Position | null }) => void>
  > = new Map();

  private vehicleFaultsMap: Map<string, ActiveFaultCode[]> = new Map();

  constructor(initialVehicles?: Vehicle[]) {
    if (initialVehicles) {
      initialVehicles.forEach((v) => {
        this.vehicleFaultsMap.set(v.id, v.active_fault_codes || []);
      });
    }
  }

  public setVehicleFaultCodes(vehicleId: string, faults: ActiveFaultCode[]): void {
    this.vehicleFaultsMap.set(vehicleId, faults);
    this.notifyUpdate(vehicleId, { faultCodes: faults });
  }

  public async getFaultCodes(vehicleId: string): Promise<ActiveFaultCode[]> {
    return this.vehicleFaultsMap.get(vehicleId) || [];
  }

  public async getPosition(vehicleId: string): Promise<Position | null> {
    // Return default fleet platform coordinates (Algiers Logistics Hub) for manual provider
    return {
      latitude: 36.7538,
      longitude: 3.0588,
      altitude_m: 25,
      speed_kmh: 0,
      heading_deg: 90,
      timestamp: new Date().toISOString(),
    };
  }

  public subscribe(
    vehicleId: string,
    onUpdate: (data: { faultCodes?: ActiveFaultCode[]; position?: Position | null }) => void
  ): Unsubscribe {
    if (!this.listeners.has(vehicleId)) {
      this.listeners.set(vehicleId, new Set());
    }
    this.listeners.get(vehicleId)!.add(onUpdate);

    return () => {
      const set = this.listeners.get(vehicleId);
      if (set) {
        set.delete(onUpdate);
        if (set.size === 0) {
          this.listeners.delete(vehicleId);
        }
      }
    };
  }

  public notifyUpdate(
    vehicleId: string,
    data: { faultCodes?: ActiveFaultCode[]; position?: Position | null }
  ): void {
    const set = this.listeners.get(vehicleId);
    if (set) {
      set.forEach((listener) => listener(data));
    }
  }
}

// ==========================================
// 2. NEXTTRANSIT PROPRIETARY IOT GATEWAY ADAPTER (PHASE 2 CAN-BUS STREAM)
// ==========================================
export class NextTransitIoTGatewayAdapter implements TelematicsProvider {
  public readonly providerName: TelematicsAdapterType = 'nexttransit_gateway';
  public readonly isConnected: boolean = true;

  private listeners: Map<
    string,
    Set<(data: { faultCodes?: ActiveFaultCode[]; position?: Position | null }) => void>
  > = new Map();

  private vehicleFaultsMap: Map<string, ActiveFaultCode[]> = new Map();
  private intervalIds: Map<string, any> = new Map();

  constructor(
    public readonly externalDeviceId: string,
    initialVehicles?: Vehicle[]
  ) {
    if (initialVehicles) {
      initialVehicles.forEach((v) => {
        this.vehicleFaultsMap.set(v.id, v.active_fault_codes || []);
      });
    }
  }

  public async getFaultCodes(vehicleId: string): Promise<ActiveFaultCode[]> {
    return this.vehicleFaultsMap.get(vehicleId) || [];
  }

  public async getPosition(vehicleId: string): Promise<Position | null> {
    // Simulated live GPS stream around Algiers Logistics & Industrial Corridor
    const baseLat = 36.7538;
    const baseLng = 3.0588;
    const offset = (Date.now() % 10000) / 100000;

    return {
      latitude: baseLat + offset,
      longitude: baseLng + offset * 0.8,
      altitude_m: 35,
      speed_kmh: Math.floor(65 + Math.random() * 25),
      heading_deg: 120,
      timestamp: new Date().toISOString(),
    };
  }

  public subscribe(
    vehicleId: string,
    onUpdate: (data: { faultCodes?: ActiveFaultCode[]; position?: Position | null }) => void
  ): Unsubscribe {
    if (!this.listeners.has(vehicleId)) {
      this.listeners.set(vehicleId, new Set());
    }
    this.listeners.get(vehicleId)!.add(onUpdate);

    // Simulate sub-second live MQTT/WebSocket CAN-Bus stream
    if (!this.intervalIds.has(vehicleId)) {
      const interval = setInterval(async () => {
        const position = await this.getPosition(vehicleId);
        const faultCodes = await this.getFaultCodes(vehicleId);
        const set = this.listeners.get(vehicleId);
        if (set) {
          set.forEach((listener) => listener({ position, faultCodes }));
        }
      }, 3000);
      this.intervalIds.set(vehicleId, interval);
    }

    return () => {
      const set = this.listeners.get(vehicleId);
      if (set) {
        set.delete(onUpdate);
        if (set.size === 0) {
          this.listeners.delete(vehicleId);
          if (this.intervalIds.has(vehicleId)) {
            clearInterval(this.intervalIds.get(vehicleId));
            this.intervalIds.delete(vehicleId);
          }
        }
      }
    };
  }
}

// ==========================================
// 3. TELTONIKA ADAPTER (HARDWARE STUB)
// ==========================================
export class TeltonikaAdapter implements TelematicsProvider {
  public readonly providerName: TelematicsAdapterType = 'teltonika_direct';
  public readonly isConnected: boolean = false; // Phase 2 connection pending

  constructor(public readonly externalDeviceId: string) {}

  public async getFaultCodes(vehicleId: string): Promise<ActiveFaultCode[]> {
    console.info(
      `[TeltonikaAdapter] Reading OBD telemetry for vehicle ${vehicleId} (IMEI: ${this.externalDeviceId}). Status: Not connected (Phase 2 credentials required).`
    );
    // Returns empty array when not connected — does NOT generate fake vendor data
    return [];
  }

  public async getPosition(vehicleId: string): Promise<Position | null> {
    console.info(
      `[TeltonikaAdapter] Requesting GPS coordinates for vehicle ${vehicleId} (IMEI: ${this.externalDeviceId}). Status: Not connected (Phase 2 credentials required).`
    );
    return null;
  }

  public subscribe(
    _vehicleId: string,
    _onUpdate: (data: { faultCodes?: ActiveFaultCode[]; position?: Position | null }) => void
  ): Unsubscribe {
    // No-op unsubscribe for unconnected hardware stub
    return () => {};
  }
}

// ==========================================
// 3. FLESPI / WIALON ADAPTER (REAL REST & STREAM CLIENT)
// ==========================================
export class FlespiWialonAdapter implements TelematicsProvider {
  public readonly providerName: TelematicsAdapterType = 'flespi_wialon';

  private get apiToken(): string | null {
    const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env || {} : {};
    return process.env.FLESPI_API_TOKEN || metaEnv.VITE_FLESPI_API_TOKEN || null;
  }

  private get apiBaseUrl(): string {
    const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env || {} : {};
    return process.env.FLESPI_API_BASE_URL || metaEnv.VITE_FLESPI_API_BASE_URL || 'https://flespi.io';
  }

  public get isConnected(): boolean {
    return Boolean(this.apiToken && this.externalDeviceId);
  }

  constructor(public readonly externalDeviceId: string) {}

  public async getFaultCodes(vehicleId: string): Promise<ActiveFaultCode[]> {
    if (!this.isConnected) {
      console.info(
        `[FlespiWialonAdapter] Requesting telemetry for vehicle ${vehicleId} (Unit ID: ${this.externalDeviceId}). Status: Not connected (FLESPI_API_TOKEN missing).`
      );
      // Strictly returns empty array when not connected — ZERO fake vendor data
      return [];
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/gw/devices/${this.externalDeviceId}/telemetry/dtc`, {
        headers: {
          Authorization: `FlespiToken ${this.apiToken}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`[FlespiWialonAdapter] REST call failed (${response.status}): ${response.statusText}`);
        return [];
      }

      const body = await response.json();
      if (body?.result && Array.isArray(body.result)) {
        return body.result.map((item: any) => ({
          code: item.code || item.dtc || `DTC-${item.spn || 'UNK'}`,
          name: item.name || item.description || `Flespi Fault Code ${item.code}`,
          severity: item.severity === 'Critical' ? 'Critical' : item.severity === 'Warning' ? 'Warning' : 'Info',
          logged_date: item.timestamp ? new Date(item.timestamp * 1000).toISOString() : new Date().toISOString(),
          required_intervention: item.required_intervention || 'Inspect vehicle CAN-bus diagnostic logs',
        }));
      }
    } catch (err) {
      console.warn(`[FlespiWialonAdapter] Error fetching DTC telemetry from Flespi API for ${vehicleId}:`, err);
    }

    return [];
  }

  public async getPosition(vehicleId: string): Promise<Position | null> {
    if (!this.isConnected) {
      console.info(
        `[FlespiWialonAdapter] Requesting position for vehicle ${vehicleId} (Unit ID: ${this.externalDeviceId}). Status: Not connected (FLESPI_API_TOKEN missing).`
      );
      // Strictly returns null when not connected — ZERO fake vendor data
      return null;
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/gw/devices/${this.externalDeviceId}/telemetry/position`, {
        headers: {
          Authorization: `FlespiToken ${this.apiToken}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`[FlespiWialonAdapter] Position fetch failed (${response.status}): ${response.statusText}`);
        return null;
      }

      const body = await response.json();
      const pos = body?.result?.[0] || body?.result;

      if (pos && (pos.latitude !== undefined || pos.lat !== undefined)) {
        return {
          latitude: Number(pos.latitude ?? pos.lat),
          longitude: Number(pos.longitude ?? pos.lon ?? pos.lng),
          altitude_m: Number(pos.altitude ?? pos.alt ?? 0),
          speed_kmh: Number(pos.speed ?? pos.speed_kmh ?? 0),
          heading_deg: Number(pos.heading ?? pos.direction ?? 0),
          timestamp: pos.timestamp ? new Date(pos.timestamp * 1000).toISOString() : new Date().toISOString(),
        };
      }
    } catch (err) {
      console.warn(`[FlespiWialonAdapter] Error fetching position from Flespi API for ${vehicleId}:`, err);
    }

    return null;
  }

  public subscribe(
    vehicleId: string,
    onUpdate: (data: { faultCodes?: ActiveFaultCode[]; position?: Position | null }) => void
  ): Unsubscribe {
    if (!this.isConnected) {
      return () => {};
    }

    // Real-time polling loop for active Flespi stream
    const interval = setInterval(async () => {
      const [position, faultCodes] = await Promise.all([
        this.getPosition(vehicleId),
        this.getFaultCodes(vehicleId),
      ]);
      onUpdate({ position, faultCodes });
    }, 5000);

    return () => clearInterval(interval);
  }
}

// ==========================================
// 4. DEVICE MAPPING DATA SERVICE & FACTORY
// ==========================================

let memoryDeviceMappings: DeviceMapping[] = [...DEV_FIXTURE_DEVICE_MAPPINGS];

/**
 * Fetch device mappings for current tenant with seed fallback
 */
export async function fetchDeviceMappings(): Promise<DeviceMapping[]> {
  const tenantId = await getCurrentTenantId();
  try {
    const { data, error } = await supabase
      .from('device_mappings')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) {
      console.warn('Supabase fetchDeviceMappings error, returning memory fallback:', error);
      return memoryDeviceMappings.filter((m) => m.tenant_id === tenantId);
    }

    if (data && data.length > 0) {
      memoryDeviceMappings = data as DeviceMapping[];
      return memoryDeviceMappings;
    }
  } catch (err) {
    console.warn('Failed to fetch device mappings from Supabase, using local fallback', err);
  }

  return memoryDeviceMappings.filter((m) => m.tenant_id === tenantId);
}

/**
 * Upsert or save a device mapping for a vehicle
 */
export async function saveDeviceMapping(
  mappingInput: Omit<DeviceMapping, 'id' | 'created_at'> & { id?: string }
): Promise<DeviceMapping> {
  const tenantId = mappingInput.tenant_id || (await getCurrentTenantId());
  const newMapping: DeviceMapping = {
    id: mappingInput.id || `DM-${Date.now()}`,
    tenant_id: tenantId,
    vehicle_id: mappingInput.vehicle_id,
    provider: mappingInput.provider,
    external_device_id: mappingInput.external_device_id,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('device_mappings')
      .upsert(
        {
          tenant_id: newMapping.tenant_id,
          vehicle_id: newMapping.vehicle_id,
          provider: newMapping.provider,
          external_device_id: newMapping.external_device_id,
        },
        { onConflict: 'tenant_id,vehicle_id' }
      )
      .select()
      .single();

    if (!error && data) {
      const saved = data as DeviceMapping;
      const index = memoryDeviceMappings.findIndex(
        (m) => m.vehicle_id === saved.vehicle_id && m.tenant_id === saved.tenant_id
      );
      if (index >= 0) {
        memoryDeviceMappings[index] = saved;
      } else {
        memoryDeviceMappings.push(saved);
      }
      return saved;
    }
  } catch (err) {
    console.warn('Device mapping upsert to Supabase failed, saving locally:', err);
  }

  // Local fallback update
  const index = memoryDeviceMappings.findIndex(
    (m) => m.vehicle_id === newMapping.vehicle_id && m.tenant_id === tenantId
  );
  if (index >= 0) {
    memoryDeviceMappings[index] = newMapping;
  } else {
    memoryDeviceMappings.push(newMapping);
  }

  return newMapping;
}

/**
 * Factory Function: Resolves and returns the appropriate TelematicsProvider adapter
 * for a specific vehicle based on device_mappings.
 */
export function getProviderForVehicle(
  vehicleId: string,
  mappings: DeviceMapping[] = memoryDeviceMappings,
  vehiclesList?: Vehicle[]
): TelematicsProvider {
  const mapping = mappings.find((m) => m.vehicle_id === vehicleId);

  if (!mapping || mapping.provider === 'manual') {
    return new ManualEntryProvider(vehiclesList);
  }

  if (mapping.provider === 'flespi' || mapping.provider === 'wialon' || mapping.provider === 'http') {
    return new FlespiWialonAdapter(mapping.external_device_id);
  }

  if (mapping.provider === 'direct' || mapping.provider === 'mqtt') {
    // For direct/MQTT with Teltonika protocol, use TeltonikaAdapter
    if (!mapping.protocol || mapping.protocol === 'teltonika') {
      return new TeltonikaAdapter(mapping.external_device_id);
    }
    return new TeltonikaAdapter(mapping.external_device_id);
  }

  return new ManualEntryProvider(vehiclesList);
}
