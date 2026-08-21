-- =========================================================
-- ANDROID TELEMETRY SIMULATOR SETUP
-- =========================================================
--
-- device_mappings has no `capabilities` column in the actual database, even though
-- CapabilityResolver.ts:43-61 reads mapping.capabilities and DEFAULT_CAPABILITIES
-- (CapabilityResolver.ts:16-34) defaults everything to false. Net effect: a real webhook POST
-- with valid latitude/longitude would 202-accept, insert into telemetry_events, but never
-- populate payload->position on the canonical event (TelemetryNormalizer.ts:122-157 gates on
-- capabilities), so it would never appear in vehicle_latest_position. This was never caught
-- earlier because this session's verification of that view used a direct SQL INSERT inside
-- reset_demo_tenant_data(), not an actual HTTP request through this webhook+capability path.

ALTER TABLE public.device_mappings ADD COLUMN IF NOT EXISTS capabilities JSONB;

-- Device mappings for the 3 seeded demo vehicles, provider = 'manual' (the only one of the 3
-- registered providers -- flespi/manual/traccar -- with no mismatch between the webhook URL
-- segment, the TelematicsProviderRegistry key, and the device_mappings.provider CHECK
-- constraint from 20260816000000_telemetry_device_mapping_integrity.sql). external_device_id
-- must exactly match what ManualEntryAdapter.ts:22 derives: `manual-${vehicle_id sent in the
-- JSON body}`.
INSERT INTO public.device_mappings (tenant_id, vehicle_id, provider, external_device_id, capabilities, is_active)
VALUES
  ('c0a80101-0000-0000-0000-000000000001', 'a0a80101-0000-0000-0000-000000000001', 'manual', 'manual-a0a80101-0000-0000-0000-000000000001',
   '{"gps": true, "ignition": true, "odometer": true, "fuelLevel": true, "dtc": true, "speed": true}'::jsonb, true),
  ('c0a80101-0000-0000-0000-000000000001', 'a0a80101-0000-0000-0000-000000000002', 'manual', 'manual-a0a80101-0000-0000-0000-000000000002',
   '{"gps": true, "ignition": true, "odometer": true, "fuelLevel": true, "dtc": true, "speed": true}'::jsonb, true),
  ('c0a80101-0000-0000-0000-000000000001', 'a0a80101-0000-0000-0000-000000000003', 'manual', 'manual-a0a80101-0000-0000-0000-000000000003',
   '{"gps": true, "ignition": true, "odometer": true, "fuelLevel": true, "dtc": true, "speed": true}'::jsonb, true)
ON CONFLICT (provider, external_device_id) DO UPDATE SET
  capabilities = EXCLUDED.capabilities,
  is_active = true;

-- Webhook gateway credential for the 'manual' provider, scoped to the demo tenant.
-- Plaintext secret (local/demo only, not a production credential):
--   nexttransit-android-simulator-2026
-- credential_hash = sha256('nexttransit-android-simulator-2026'), sent by the Android app as
-- `Authorization: Bearer nexttransit-android-simulator-2026`.
INSERT INTO public.telematics_gateways (provider, name, tenant_id, credential_hash, is_active)
VALUES (
  'manual',
  'Android Telemetry Simulator (Demo)',
  'c0a80101-0000-0000-0000-000000000001',
  '259a8870d3a5b54c5a5250fe02b00dd91a98a8ed24b60df75f66a275f1e7d284',
  true
)
ON CONFLICT DO NOTHING;
