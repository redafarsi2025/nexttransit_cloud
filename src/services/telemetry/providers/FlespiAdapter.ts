/**
 * FlespiAdapter
 * ==============
 * Provider adapter for the Flespi.io platform.
 *
 * Responsibility: Parse raw Flespi-formatted JSON payloads into the
 * standardized ProviderPayload shape consumed by TelemetryNormalizer.
 *
 * This adapter knows Flespi field names. It knows NOTHING about:
 *   - Vehicle make, model, or year
 *   - Device manufacturer or model
 *   - NextTransit business rules
 *
 * Flespi standard field names used here are documented at:
 *   https://flespi.com/kb/flespi-telematics-hub-parameters
 *
 * The FMB140 and other Teltonika devices send data through Flespi
 * using the Teltonika codec, which Flespi normalizes to standard field names.
 * This adapter does NOT contain Teltonika-specific logic — it only handles
 * Flespi's normalized output format.
 */
import { CanonicalTelemetryEvent, FaultStandard, TelematicsProviderType } from '../../../types';
import { ProviderPayload, normalizeTelemetryPayload } from '../TelemetryNormalizer';
import { TelematicsProviderAdapter } from '../TelematicsProviderAdapter';

export class FlespiAdapterClass implements TelematicsProviderAdapter {
  readonly provider: TelematicsProviderType = 'flespi';

  canHandle(payload: unknown): boolean {
    // Basic check: Flespi webhooks are usually arrays of objects with 'ident'
    if (Array.isArray(payload)) {
      return payload.length > 0 && typeof payload[0] === 'object' && payload[0] !== null && 'ident' in payload[0];
    }
    return typeof payload === 'object' && payload !== null && 'ident' in payload;
  }

  validate(payload: unknown): boolean {
    // If we can handle it, we assume it's valid enough to try parsing.
    // Real validation could be stricter (e.g., Zod schema).
    return this.canHandle(payload);
  }

  parse(payload: unknown): Array<{ externalDeviceId: string; parsedData: ProviderPayload }> {
    const messages = Array.isArray(payload) ? payload : [payload];
    
    return messages
      .filter((m): m is Record<string, unknown> => m !== null && typeof m === 'object')
      .map(this.parseFlespiMessage.bind(this))
      .filter((p) => p.external_device_id !== '')
      .map((parsedData) => ({
        externalDeviceId: parsedData.external_device_id,
        parsedData
      }));
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
      capabilities: context.capabilities,
      dataSource: 'live_telematics'
    });
  }

  async healthCheck(): Promise<boolean> {
    return true; // Simple local check
  }

  /**
   * Parses a raw Flespi telemetry message object into a ProviderPayload.
   */
  private parseFlespiMessage(raw: Record<string, unknown>): ProviderPayload {
    const external_device_id = String(
      raw['ident'] || raw['device_id'] || raw['unit_id'] || ''
    );

    const timestamp_unix =
      typeof raw['timestamp'] === 'number' ? (raw['timestamp'] as number) : undefined;

    const latitude =
      typeof raw['position.latitude'] === 'number'
        ? (raw['position.latitude'] as number)
        : typeof raw['lat'] === 'number'
        ? (raw['lat'] as number)
        : undefined;

    const longitude =
      typeof raw['position.longitude'] === 'number'
        ? (raw['position.longitude'] as number)
        : typeof raw['lon'] === 'number'
        ? (raw['lon'] as number)
        : undefined;

    const altitude =
      typeof raw['position.altitude'] === 'number'
        ? (raw['position.altitude'] as number)
        : undefined;

    const speed =
      typeof raw['position.speed'] === 'number'
        ? (raw['position.speed'] as number)
        : undefined;

    const heading =
      typeof raw['position.direction'] === 'number'
        ? (raw['position.direction'] as number)
        : undefined;

    const satellites =
      typeof raw['position.satellites'] === 'number'
        ? (raw['position.satellites'] as number)
        : undefined;

    const ignition =
      typeof raw['engine.ignition.status'] === 'boolean'
        ? (raw['engine.ignition.status'] as boolean)
        : typeof raw['din1'] === 'number'
        ? (raw['din1'] as number) === 1
        : undefined;

    const engineRpm =
      typeof raw['engine.rpm'] === 'number' ? (raw['engine.rpm'] as number) : undefined;

    const engineTemperature =
      typeof raw['engine.coolant.temperature'] === 'number'
        ? (raw['engine.coolant.temperature'] as number)
        : undefined;

    const fuelLevel =
      typeof raw['fuel.level'] === 'number' ? (raw['fuel.level'] as number) : undefined;

    const odometer =
      typeof raw['vehicle.mileage'] === 'number'
        ? (raw['vehicle.mileage'] as number)
        : typeof raw['can.vehicle.mileage'] === 'number'
        ? (raw['can.vehicle.mileage'] as number)
        : undefined;

    const engineHours = 
      typeof raw['engine.motor.hours'] === 'number'
        ? (raw['engine.motor.hours'] as number)
        : undefined;

    const batteryVoltage =
      typeof raw['battery.voltage'] === 'number'
        ? (raw['battery.voltage'] as number)
        : typeof raw['external.powersupply.voltage'] === 'number'
        ? (raw['external.powersupply.voltage'] as number)
        : undefined;

    const dtc: ProviderPayload['dtc'] = [];

    const rawDtc = raw['din.dtc'];
    if (Array.isArray(rawDtc)) {
      for (const entry of rawDtc) {
        if (entry && typeof entry === 'object') {
          const code = String((entry as Record<string, unknown>)['code'] || '').trim();
          const stdRaw = String((entry as Record<string, unknown>)['standard'] || 'OBDII').toUpperCase();
          const std: FaultStandard = (['OBDII', 'EOBD', 'J1939', 'J1708', 'UDS', 'OEM', 'UNKNOWN'].includes(stdRaw)
            ? stdRaw
            : 'UNKNOWN') as FaultStandard;
          const spn = typeof (entry as Record<string, unknown>)['spn'] === 'number'
            ? ((entry as Record<string, unknown>)['spn'] as number)
            : undefined;
          const fmi = typeof (entry as Record<string, unknown>)['fmi'] === 'number'
            ? ((entry as Record<string, unknown>)['fmi'] as number)
            : undefined;
          if (code) dtc.push({ code, standard: std, spn, fmi });
        }
      }
    }

    if (dtc.length === 0 && typeof raw['dtc'] === 'string' && raw['dtc']) {
      dtc.push({ code: raw['dtc'] as string, standard: 'OBDII' });
    }

    if (dtc.length === 0 && typeof raw['spn'] === 'number' && typeof raw['fmi'] === 'number') {
      dtc.push({
        code: 'SPN-' + raw['spn'] + '-FMI-' + raw['fmi'],
        standard: 'J1939',
        spn: raw['spn'] as number,
        fmi: raw['fmi'] as number,
      });
    }

    // Flespi has an explicit event ID in 'msg_id' or similar if available, otherwise we let normalization generate one
    const eventId = typeof raw['msg_id'] === 'number' ? String(raw['msg_id']) : undefined;

    return {
      provider: 'flespi',
      external_device_id,
      timestamp_unix,
      eventId,
      rawPayload: raw,
      latitude,
      longitude,
      altitude,
      speed,
      heading,
      satellites,
      ignition,
      engineRpm,
      engineTemperature,
      fuelLevel,
      odometer,
      engineHours,
      batteryVoltage,
      dtc: dtc.length > 0 ? dtc : undefined,
    };
  }
}

export const FlespiAdapter = new FlespiAdapterClass();
// Export the legacy methods for tests or until full migration if needed
export const parseFlespiMessage = FlespiAdapter['parseFlespiMessage'].bind(FlespiAdapter);
export const parseFlespiWebhookBatch = (body: unknown) => {
  return FlespiAdapter.parse(body).map(res => res.parsedData);
};
