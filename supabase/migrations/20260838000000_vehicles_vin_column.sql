-- The `Vehicle.vin` field has existed in src/types/index.ts since early on, but the vehicles
-- table never actually had a `vin` column, and neither the add/edit form nor the CSV bulk
-- import ever populated it — so the gap was latent (no code path was building a payload that
-- included `vin`). This migration adds the column now that AddEditVehicleModal/
-- ImportVehiclesModal/FleetHealthGrid search were wired up to actually use it: without it,
-- PostgREST would reject any insert/update payload containing an unrecognized `vin` key.

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS vin VARCHAR(32);

CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON public.vehicles (vin) WHERE vin IS NOT NULL;
