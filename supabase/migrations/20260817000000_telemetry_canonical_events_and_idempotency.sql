-- Migration: Telemetry Idempotency and Event Log
-- Phase 2B: Garantit l'idempotence au niveau de la base de données.
-- Les événements dupliqués échoueront lors de l'insertion grâce à la contrainte UNIQUE.

CREATE TABLE IF NOT EXISTS public.telemetry_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL, -- provider + external_device_id + provider_event_id (ou fingerprint déterministe)
    tenant_id UUID NOT NULL,
    vehicle_id UUID NOT NULL,
    provider TEXT NOT NULL,
    external_device_id TEXT NOT NULL,
    event_timestamp TIMESTAMPTZ NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT telemetry_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT,
    CONSTRAINT telemetry_events_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE RESTRICT,
    CONSTRAINT unique_telemetry_event_id UNIQUE (event_id)
);

-- RLS
ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation SELECT for telemetry_events" ON public.telemetry_events;
CREATE POLICY "Tenant Isolation SELECT for telemetry_events" ON public.telemetry_events 
    FOR SELECT USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "Tenant Isolation INSERT for telemetry_events" ON public.telemetry_events;
CREATE POLICY "Tenant Isolation INSERT for telemetry_events" ON public.telemetry_events 
    FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());
