import {
  TelematicsProvider,
  TelematicsProviderType,
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

// Initial Seed Mappings for Demo & Offline Fallback
export const INITIAL_SEED_DEVICE_MAPPINGS: DeviceMapping[] = [
  {
    id: 'DM-001',
    tenant_id: 'c0a80101-0000-0000-0000-000000000001',
    vehicle_id: 'V-024',
    provider: 'manual',
    external_device_id: 'MAN-V024-ALGIERS',
  },
  {
    id: 'DM-002',
    tenant_id: 'c0a80101-0000-0000-0000-000000000001',
    vehicle_id: 'V-018',
    provider: 'teltonika',
    external_device_id: 'TEL-864201049281002',
  },
  {
    id: 'DM-003',
    tenant_id: 'c0a80101-0000-0000-0000-000000000001',
    vehicle_id: 'V-007',
    provider: 'flespi_wialon',
    external_device_id: 'WIA-UNIT-908123',
  },
];

// ==========================================
// 1. MANUAL ENTRY PROVIDER (DECLARATIVE)
// ==========================================
export class ManualEntryProvider implements TelematicsProvider {
  public readonly providerName: TelematicsProviderType = 'manual';
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
  public readonly providerName: TelematicsProviderType = 'nexttransit_gateway';
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
  public readonly providerName: TelematicsProviderType = 'teltonika';
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
// 3. FLESPI / WIALON ADAPTER (MIDDLEWARE STUB)
// ==========================================
export class FlespiWialonAdapter implements TelematicsProvider {
  public readonly providerName: TelematicsProviderType = 'flespi_wialon';
  public readonly isConnected: boolean = false; // Phase 2 connection pending

  constructor(public readonly externalDeviceId: string) {}

  public async getFaultCodes(vehicleId: string): Promise<ActiveFaultCode[]> {
    console.info(
      `[FlespiWialonAdapter] Requesting telemetry stream for vehicle ${vehicleId} (Unit ID: ${this.externalDeviceId}). Status: Not connected (Phase 2 credentials required).`
    );
    // Returns empty array when not connected — does NOT generate fake vendor data
    return [];
  }

  public async getPosition(vehicleId: string): Promise<Position | null> {
    console.info(
      `[FlespiWialonAdapter] Requesting position stream for vehicle ${vehicleId} (Unit ID: ${this.externalDeviceId}). Status: Not connected (Phase 2 credentials required).`
    );
    return null;
  }

  public subscribe(
    _vehicleId: string,
    _onUpdate: (data: { faultCodes?: ActiveFaultCode[]; position?: Position | null }) => void
  ): Unsubscribe {
    return () => {};
  }
}

// ==========================================
// 4. DEVICE MAPPING DATA SERVICE & FACTORY
// ==========================================

let memoryDeviceMappings: DeviceMapping[] = [...INITIAL_SEED_DEVICE_MAPPINGS];

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

  if (mapping.provider === 'nexttransit_gateway') {
    return new NextTransitIoTGatewayAdapter(mapping.external_device_id, vehiclesList);
  }

  if (mapping.provider === 'teltonika') {
    return new TeltonikaAdapter(mapping.external_device_id);
  }

  if (mapping.provider === 'flespi_wialon') {
    return new FlespiWialonAdapter(mapping.external_device_id);
  }

  return new ManualEntryProvider(vehiclesList);
}
