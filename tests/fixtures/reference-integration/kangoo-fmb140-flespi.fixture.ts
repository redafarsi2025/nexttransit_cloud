/**
 * Reference Integration Test Fixture — First Field Validation Scenario
 * =====================================================================
 * Fixture data for the first terrain test: generic light vehicle + generic OBD-II tracker.
 *
 * IMPORTANT: This fixture represents a specific field scenario ONLY.
 * NO vehicle make/model/year and NO device manufacturer appear in production code paths.
 * The vehicle and device below are test fixtures — not architecture.
 *
 * To run the actual field test, replace PENDING values with real hardware details
 * and run the integration test suite. Do not commit real IMEIs to this file.
 */
import { DeviceMapping, TelematicsCapabilities } from '../../../src/types';

// Fixture: generic OBD-II light vehicle (first validation target)
export const REFERENCE_VEHICLE_FIXTURE = {
  vehicle_id: 'V-REF-INTEGRATION-001',
  tenant_id: 'TNT-REF-001',
  // Note: plate, registration, make/model are test context only
  // They are never used in business logic
  context: {
    registration: 'PENDING',
    notes: 'First terrain validation vehicle — update with real registration before test',
  },
};

// Fixture: generic Flespi-connected Teltonika-protocol device (first validation target)
export const REFERENCE_DEVICE_FIXTURE: DeviceMapping = {
  id: 'DM-REF-INTEGRATION-001',
  tenant_id: 'TNT-REF-001',
  vehicle_id: 'V-REF-INTEGRATION-001',
  provider: 'flespi',
  protocol: 'teltonika',
  external_device_id: 'IMEI-PENDING', // Replace with real IMEI before field test
  is_active: true,
  connection_status: 'pending',
  installed_at: new Date().toISOString(),
};

// Fixture: capabilities confirmed for this installation
// These reflect what was actually validated during the terrain test.
// Update this after running the real test — do not guess.
export const REFERENCE_CAPABILITIES_FIXTURE: TelematicsCapabilities = {
  gps: true,
  ignition: true,          // DIN1 digital input
  speed: true,
  odometer: false,         // Not confirmed — update after test
  fuelLevel: false,        // Not available on this vehicle via OBD-II
  engineRpm: false,        // Update after CAN profile validation
  engineTemperature: false, // Update after CAN profile validation
  obd2: true,
  eobd: true,
  j1939: false,            // Light vehicle — J1939 not applicable
  j1708: false,
  canBus: true,
  dtc: true,
  harshDriving: false,     // Update after terrain test
  batteryVoltage: true,    // External power supply voltage available
  digitalInputs: 4,        // FMB140 has 4 digital inputs
  analogInputs: 2,         // FMB140 has 2 analog inputs
};

// Sample Flespi payload for unit tests (structure only — no real device data)
export const SAMPLE_FLESPI_PAYLOAD = {
  ident: 'REFERENCE-IMEI-001',
  timestamp: 1723657200,
  'position.latitude': 36.7538,
  'position.longitude': 3.0588,
  'position.speed': 45,
  'position.direction': 135,
  'position.altitude': 12,
  'position.satellites': 8,
  'engine.ignition.status': true,
  'battery.voltage': 13.2,
  'din.dtc': [
    { code: 'P0217', standard: 'OBDII' },
  ],
};
