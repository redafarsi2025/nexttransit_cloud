/**
 * TelemetryNormalizer
 * ====================
 * Transforms a raw, provider-specific telemetry payload into a canonical
 * NormalizedTelemetryEvent that can be consumed by the NextTransit Decision Engine.
 *
 * The normalizer knows NOTHING about:
 *   - Vehicle make, model, year, or manufacturer
 *   - Device model or manufacturer
 *   - Provider-specific field naming beyond what an adapter has already normalized
 *
 * It ONLY knows:
 *   - The resolved vehicle_id and tenant_id (from DeviceResolver)
 *   - The effective capabilities (from CapabilityResolver)
 *   - The intermediate ProviderPayload shape produced by provider adapters
 *
 * Standard pipeline:
 *   Raw payload -> Provider Adapter -> ProviderPayload -> TelemetryNormalizer -> NormalizedTelemetryEvent
 */
import {
  CanonicalTelemetryEvent,
  FaultStandard,
  TelematicsCapabilities,
  TelematicsProviderType,
} from '../../types';
import { resolveFaultCode } from '../faultCodeMappingService';
import { hasCapability } from './CapabilityResolver';

/**
 * Intermediate shape produced by provider adapters.
 * All field names are standardized — adapter handles provider-specific mapping.
 */
export interface ProviderPayload {
  external_device_id: string;
  timestamp_unix?: number;           // Unix epoch seconds; falls back to now()
  eventId?: string;                  // External event ID for idempotency
  provider: TelematicsProviderType;
  rawPayload?: any;                  // For auditing

  // Position
  latitude?: number;
  longitude?: number;
  altitude?: number;
  speed?: number;                    // km/h
  heading?: number;                  // degrees 0-359
  satellites?: number;

  // Vehicle state
  ignition?: boolean;
  engineRpm?: number;
  engineTemperature?: number;        // Celsius
  fuelLevel?: number;                // % 0-100
  odometer?: number;                 // km
  engineHours?: number;              // h
  batteryVoltage?: number;           // Volts

  // Diagnostic codes — standard is declared per DTC entry
  dtc?: Array<{
    code: string;
    standard: FaultStandard;
    spn?: number;
    fmi?: number;
  }>;
}

import * as crypto from 'crypto';

/**
 * Normalizes a ProviderPayload into a CanonicalTelemetryEvent.
 * Only emits fields that are declared available in the effective capabilities.
 * Never emits a field by guessing or assuming availability.
 */
export function normalizeTelemetryPayload(
  payload: ProviderPayload,
  context: {
    vehicle_id: string;
    tenant_id: string;
    device_id?: string;
    capabilities: TelematicsCapabilities;
    dataSource?: 'live_telematics' | 'manual_entry';
  }
): CanonicalTelemetryEvent {
  const { vehicle_id, tenant_id, device_id, capabilities, dataSource = 'live_telematics' } = context;
  const ts = payload.timestamp_unix
    ? new Date(payload.timestamp_unix * 1000).toISOString()
    : new Date().toISOString();

  // Generate a deterministic event ID
  let eventId = payload.eventId;
  if (!eventId) {
    const fingerprintString = JSON.stringify({
      lat: payload.latitude,
      lon: payload.longitude,
      spd: payload.speed,
      ign: payload.ignition,
      odo: payload.odometer,
      dtc: payload.dtc
    });
    const fingerprint = crypto.createHash('md5').update(fingerprintString).digest('hex');
    eventId = `${payload.provider}_${payload.external_device_id}_${ts}_${fingerprint}`;
  } else {
    eventId = `${payload.provider}_${payload.external_device_id}_${eventId}`;
  }

  const event: CanonicalTelemetryEvent = {
    eventId,
    provider: payload.provider,
    tenant_id,
    vehicle_id,
    device_id,
    external_device_id: payload.external_device_id,
    timestamp: ts,
    receivedAt: new Date().toISOString(),
    faults: [],
    data_source: dataSource,
    metadata: {
      rawPayload: payload.rawPayload
    }
  };

  // Position — only emit if GPS capability is confirmed
  if (
    hasCapability(capabilities, 'gps') &&
    payload.latitude !== undefined &&
    payload.longitude !== undefined
  ) {
    event.position = {
      latitude: payload.latitude,
      longitude: payload.longitude,
      altitude: payload.altitude,
      speed: payload.speed,
      heading: payload.heading,
      satellites: payload.satellites,
    };
  }

  // Vehicle state — emit only the fields backed by declared capabilities
  const stateFields: Record<string, boolean> = {
    ignition: hasCapability(capabilities, 'ignition'),
    engineRpm: hasCapability(capabilities, 'engineRpm'),
    engineTemperature: hasCapability(capabilities, 'engineTemperature'),
    fuelLevel: hasCapability(capabilities, 'fuelLevel'),
    odometer: hasCapability(capabilities, 'odometer'),
    batteryVoltage: hasCapability(capabilities, 'batteryVoltage'),
  };

  const hasAnyState = Object.values(stateFields).some(Boolean);
  if (hasAnyState) {
    event.vehicleState = {};
    if (stateFields.ignition && payload.ignition !== undefined) event.vehicleState.ignition = payload.ignition;
    if (stateFields.engineRpm && payload.engineRpm !== undefined) event.vehicleState.engineRpm = payload.engineRpm;
    if (stateFields.engineTemperature && payload.engineTemperature !== undefined) event.vehicleState.engineTemperature = payload.engineTemperature;
    if (stateFields.fuelLevel && payload.fuelLevel !== undefined) event.vehicleState.fuelLevel = payload.fuelLevel;
    if (stateFields.odometer && payload.odometer !== undefined) event.vehicleState.odometer = payload.odometer;
    if (stateFields.batteryVoltage && payload.batteryVoltage !== undefined) event.vehicleState.batteryVoltage = payload.batteryVoltage;
    if (Object.keys(event.vehicleState).length === 0) delete event.vehicleState;
  }

  // Fault codes — only resolve if DTC capability is confirmed
  if (hasCapability(capabilities, 'dtc') && payload.dtc && payload.dtc.length > 0) {
    event.raw_dtc = payload.dtc.map((d) => ({
      code: d.code,
      standard: d.standard,
      spn: d.spn,
      fmi: d.fmi,
    }));

    event.faults = payload.dtc.map((d) =>
      resolveFaultCode(d.code, d.standard, {
        spn: d.spn,
        fmi: d.fmi,
        loggedDate: ts,
      })
    );
  }

  event.capabilities = capabilities;

  return event;
}
