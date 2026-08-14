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
import { FaultStandard } from '../../../types';
import { ProviderPayload } from '../TelemetryNormalizer';

/**
 * Parses a raw Flespi telemetry message object into a ProviderPayload.
 * Handles both single messages and arrays.
 */
export function parseFlespiMessage(raw: Record<string, unknown>): ProviderPayload {
  // External device identifier — Flespi uses 'ident' for IMEI/device ID
  const external_device_id = String(
    raw['ident'] || raw['device_id'] || raw['unit_id'] || ''
  );

  // Timestamp — Flespi sends Unix epoch seconds in 'timestamp'
  const timestamp_unix =
    typeof raw['timestamp'] === 'number' ? (raw['timestamp'] as number) : undefined;

  // Position — Flespi standard field names
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

  // Vehicle state — Flespi standard parameter names
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

  const batteryVoltage =
    typeof raw['battery.voltage'] === 'number'
      ? (raw['battery.voltage'] as number)
      : typeof raw['external.powersupply.voltage'] === 'number'
      ? (raw['external.powersupply.voltage'] as number)
      : undefined;

  // DTC / Fault codes
  // Flespi delivers DTCs in multiple possible formats depending on device protocol.
  // We handle the normalized 'din.dtc' array format used by Teltonika-compatible devices.
  const dtc: ProviderPayload['dtc'] = [];

  // Format 1: Structured array with code + standard (preferred)
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

  // Format 2: Legacy single 'dtc' field (string code only)
  if (dtc.length === 0 && typeof raw['dtc'] === 'string' && raw['dtc']) {
    dtc.push({ code: raw['dtc'] as string, standard: 'OBDII' });
  }

  // Format 3: J1939 SPN/FMI directly on root
  if (dtc.length === 0 && typeof raw['spn'] === 'number' && typeof raw['fmi'] === 'number') {
    dtc.push({
      code: 'SPN-' + raw['spn'] + '-FMI-' + raw['fmi'],
      standard: 'J1939',
      spn: raw['spn'] as number,
      fmi: raw['fmi'] as number,
    });
  }

  return {
    external_device_id,
    timestamp_unix,
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
    batteryVoltage,
    dtc: dtc.length > 0 ? dtc : undefined,
  };
}

/**
 * Parses a Flespi webhook batch (array of messages or single message).
 */
export function parseFlespiWebhookBatch(
  body: unknown
): ProviderPayload[] {
  const messages = Array.isArray(body) ? body : [body];
  return messages
    .filter((m): m is Record<string, unknown> => m !== null && typeof m === 'object')
    .map(parseFlespiMessage)
    .filter((p) => p.external_device_id !== '');
}
