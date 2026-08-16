/**
 * TraccarAdapter
 * ==============
 * Provider adapter for the Traccar platform.
 * 
 * Responsibility: Parse raw Traccar-formatted JSON payloads into the
 * standardized ProviderPayload shape consumed by TelemetryNormalizer.
 * 
 * This adapter only relies on the Traccar generic payload schema.
 * It strictly avoids implementing business rules, tenant logic,
 * or logic related to specific device models.
 */
import { CanonicalTelemetryEvent, FaultStandard, TelematicsProviderType } from '../../../types';
import { ProviderPayload, normalizeTelemetryPayload } from '../TelemetryNormalizer';
import { TelematicsProviderAdapter } from '../TelematicsProviderAdapter';
import { z } from 'zod';

// Strict schema for Traccar webhook payload
// Traccar generally sends a "Position" object or an array of events/positions
const TraccarPositionSchema = z.object({
  id: z.number().optional(),
  deviceId: z.number(),           // Internal traccar ID, often we need 'device.uniqueId'
  device: z.object({
    uniqueId: z.string()          // This maps to external_device_id
  }).optional(),
  protocol: z.string().optional(),
  serverTime: z.string().optional(),
  deviceTime: z.string().optional(),
  fixTime: z.string().optional(),
  valid: z.boolean().optional(),
  latitude: z.number(),
  longitude: z.number(),
  altitude: z.number().optional(),
  speed: z.number().optional(),   // Knots in Traccar, needs conversion to km/h!
  course: z.number().optional(),  // Heading
  attributes: z.record(z.string(), z.any()).optional()
}).passthrough();

// Webhook can be single or array
const TraccarWebhookPayloadSchema = z.union([
  TraccarPositionSchema,
  z.array(TraccarPositionSchema)
]);

export class TraccarAdapterClass implements TelematicsProviderAdapter {
  readonly provider: TelematicsProviderType = 'traccar';

  canHandle(payload: unknown): boolean {
    // Traccar payload validation is done strictly via Zod. 
    // Routing is explicitly handled by the URL endpoint (provider=traccar).
    return TraccarWebhookPayloadSchema.safeParse(payload).success;
  }

  validate(payload: unknown): boolean {
    return this.canHandle(payload);
  }

  parse(payload: unknown): Array<{ externalDeviceId: string; parsedData: ProviderPayload }> {
    const parseResult = TraccarWebhookPayloadSchema.safeParse(payload);
    if (!parseResult.success) {
      console.warn('[TraccarAdapter] Payload validation failed during parse', parseResult.error);
      return [];
    }

    const messages = Array.isArray(parseResult.data) ? parseResult.data : [parseResult.data];

    return messages
      .filter(m => {
        // Validation stricte NaN/Infinity pour les positions vitals
        if (!isFinite(m.latitude) || !isFinite(m.longitude)) return false;
        return true;
      })
      .map(this.parseTraccarMessage.bind(this))
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
    return true; // Local check, the adapter is pure and stateless
  }

  /**
   * Parses a raw Traccar position object into a ProviderPayload.
   */
  private parseTraccarMessage(raw: any): ProviderPayload {
    // Dans certains webhooks Traccar, 'device' est inclus. Si absent, le webhook 
    // doit être configuré pour inclure le modèle complet, ou bien l'external_device_id
    // pourrait être passé autrement. On prend en priorité device.uniqueId.
    const external_device_id = raw.device?.uniqueId || String(raw.deviceId || '');
    
    // Convert times. Traccar sends ISO-like strings e.g. "2026-08-16T11:00:00.000Z"
    // We prefer deviceTime for the event, fallback to fixTime then serverTime.
    const timeStr = raw.deviceTime || raw.fixTime || raw.serverTime;
    let timestamp_unix: number | undefined;
    if (timeStr) {
      const ts = new Date(timeStr).getTime();
      if (!isNaN(ts)) {
        timestamp_unix = Math.floor(ts / 1000);
      }
    }

    // Convert speed from Knots to km/h (1 knot = 1.852 km/h)
    let speedKmH: number | undefined;
    if (typeof raw.speed === 'number' && isFinite(raw.speed)) {
      speedKmH = Number((raw.speed * 1.852).toFixed(2));
    }

    const attrs = raw.attributes || {};

    // Map attributes (Traccar standard attributes + generic fallbacks)
    const ignition = typeof attrs.ignition === 'boolean' ? attrs.ignition : undefined;
    const engineRpm = typeof attrs.rpm === 'number' ? attrs.rpm : undefined;
    const engineTemperature = typeof attrs.coolantTemp === 'number' ? attrs.coolantTemp : undefined;
    const fuelLevel = typeof attrs.fuelLevel === 'number' ? attrs.fuelLevel : typeof attrs.fuel === 'number' ? attrs.fuel : undefined;
    // Odometer: Traccar can send totalDistance in meters
    const odometer = typeof attrs.totalDistance === 'number' ? Number((attrs.totalDistance / 1000).toFixed(2)) : undefined;
    // Engine hours (ms to hours)
    const engineHours = typeof attrs.hours === 'number' ? Number((attrs.hours / 3600000).toFixed(2)) : undefined;
    const batteryVoltage = typeof attrs.power === 'number' ? attrs.power : typeof attrs.battery === 'number' ? attrs.battery : undefined;

    // Diagnostic codes (often OBD / CAN sent as a string or array)
    const dtc: Array<{code: string; standard: FaultStandard}> = [];
    if (typeof attrs.obd === 'string') {
      dtc.push({ code: attrs.obd, standard: 'OBDII' });
    }
    if (typeof attrs.dtcs === 'string') {
      const codes = attrs.dtcs.split(',').map((c: string) => c.trim()).filter((c: string) => c.length > 0);
      for (const code of codes) {
        dtc.push({ code, standard: 'OBDII' });
      }
    }

    return {
      external_device_id,
      provider: this.provider,
      timestamp_unix,
      eventId: raw.id ? String(raw.id) : undefined, // Useful for idempotency if Traccar provides unique position ID
      rawPayload: raw,
      latitude: raw.latitude,
      longitude: raw.longitude,
      altitude: raw.altitude,
      speed: speedKmH,
      heading: raw.course,
      ignition,
      engineRpm,
      engineTemperature,
      fuelLevel,
      odometer,
      engineHours,
      batteryVoltage,
      dtc: dtc.length > 0 ? dtc : undefined
    };
  }
}

export const TraccarAdapter = new TraccarAdapterClass();
