/**
 * CapabilityResolver
 * ===================
 * Determines which telemetry capabilities are actually available for a given
 * device installation on a specific vehicle.
 *
 * Two-tier resolution:
 *   1. Device-level capabilities (TelematicsDevice.capabilities) — theoretical max.
 *   2. Mapping-level overlay (DeviceMapping.capabilities) — confirmed for THIS install.
 *
 * The overlay takes precedence. Missing overlay fields fall back to the device level.
 * Missing device-level fields default to false/0 (safe: never assume availability).
 */
import { TelematicsCapabilities, DeviceMapping, TelematicsDevice } from '../../types';

const DEFAULT_CAPABILITIES: TelematicsCapabilities = {
  gps: false,
  ignition: false,
  speed: false,
  odometer: false,
  fuelLevel: false,
  engineRpm: false,
  engineTemperature: false,
  obd2: false,
  eobd: false,
  j1939: false,
  j1708: false,
  canBus: false,
  dtc: false,
  harshDriving: false,
  batteryVoltage: false,
  digitalInputs: 0,
  analogInputs: 0,
};

/**
 * Resolves the effective capabilities for a specific device-vehicle installation.
 *
 * @param mapping  - DeviceMapping for this vehicle+device pair (may include capability overlay)
 * @param device   - Optional TelematicsDevice with theoretical device capabilities
 * @returns Effective TelematicsCapabilities for this installation
 */
export function resolveCapabilities(
  mapping: Pick<DeviceMapping, 'capabilities'>,
  device?: Pick<TelematicsDevice, 'capabilities'>
): TelematicsCapabilities {
  // Start from safe defaults
  const base = { ...DEFAULT_CAPABILITIES };

  // Layer 1: Apply device-level theoretical capabilities
  if (device?.capabilities) {
    Object.assign(base, device.capabilities);
  }

  // Layer 2: Apply installation-specific overrides (highest precedence)
  if (mapping.capabilities) {
    Object.assign(base, mapping.capabilities);
  }

  return base;
}

/**
 * Returns true if the resolved capabilities include the specified feature.
 * Handles both boolean and numeric capabilities safely.
 */
export function hasCapability(
  capabilities: TelematicsCapabilities,
  feature: keyof TelematicsCapabilities
): boolean {
  const value = capabilities[feature];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  return false;
}
