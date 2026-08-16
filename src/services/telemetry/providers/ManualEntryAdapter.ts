import { CanonicalTelemetryEvent, TelematicsProviderType } from '../../../types';
import { ProviderPayload, normalizeTelemetryPayload } from '../TelemetryNormalizer';
import { TelematicsProviderAdapter } from '../TelematicsProviderAdapter';

export class ManualEntryAdapterClass implements TelematicsProviderAdapter {
  readonly provider: TelematicsProviderType = 'manual';

  canHandle(payload: unknown): boolean {
    return typeof payload === 'object' && payload !== null && 'source' in payload && payload.source === 'manual_entry';
  }

  validate(payload: unknown): boolean {
    if (!this.canHandle(payload)) return false;
    const data = payload as Record<string, unknown>;
    return typeof data.vehicle_id === 'string' && data.vehicle_id.length > 0;
  }

  parse(payload: unknown): Array<{ externalDeviceId: string; parsedData: ProviderPayload }> {
    const raw = payload as Record<string, any>;
    
    // For manual entry, the "external device ID" is a synthetic ID representing the manual source for that vehicle
    const syntheticDeviceId = `manual-${raw.vehicle_id}`;

    const parsedData: ProviderPayload = {
      provider: 'manual',
      external_device_id: syntheticDeviceId,
      timestamp_unix: typeof raw.timestamp === 'number' ? raw.timestamp : Math.floor(Date.now() / 1000),
      eventId: raw.event_id || undefined,
      rawPayload: raw,
      
      latitude: raw.latitude,
      longitude: raw.longitude,
      odometer: raw.odometer,
      engineHours: raw.engineHours,
      fuelLevel: raw.fuelLevel,
      ignition: raw.ignition,
      
      // Map any manual faults if provided
      dtc: Array.isArray(raw.faults) ? raw.faults.map((f: any) => ({
        code: f.code,
        standard: f.standard || 'UNKNOWN'
      })) : undefined
    };

    return [{
      externalDeviceId: syntheticDeviceId,
      parsedData
    }];
  }

  normalize(
    parsedData: ProviderPayload,
    context: {
      tenantId: string;
      vehicleId: string;
      deviceId?: string;
      capabilities: any;
    }
  ): CanonicalTelemetryEvent {
    return normalizeTelemetryPayload(parsedData, {
      vehicle_id: context.vehicleId,
      tenant_id: context.tenantId,
      device_id: context.deviceId,
      capabilities: context.capabilities, // Manual capabilities might just be everything they explicitly provide
      dataSource: 'manual_entry'
    });
  }

  async healthCheck(): Promise<boolean> {
    return true; // Manual entry doesn't have an external API to check
  }
}

export const ManualEntryAdapter = new ManualEntryAdapterClass();
