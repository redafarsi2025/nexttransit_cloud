-- 20260818000000_telematics_gateways_and_security.sql
-- Description: Creates the telematics_gateways table for provider-agnostic, secure webhook authentication.

CREATE TABLE public.telematics_gateways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    name TEXT NOT NULL,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL, -- Nullable, defines scope
    credential_hash TEXT NOT NULL, -- SHA-256 of the actual secret token
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    rotated_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    
    -- Ensure provider is a valid enum value if needed, but we keep it TEXT to be open/agnostic.
    CONSTRAINT provider_length CHECK (char_length(provider) > 0)
);

-- RLS Configuration:
-- This table is BACKEND ONLY. The frontend has absolutely no business reading or managing webhook gateways natively.
-- All operations are restricted to SERVICE_ROLE.
ALTER TABLE public.telematics_gateways ENABLE ROW LEVEL SECURITY;

-- Allow nothing for standard authenticated users or anon.
-- Service role bypasses RLS naturally, but we can explicitly define it for clarity if needed.
-- No policies defined means default-deny for all roles except postgres and service_role.

-- Index for fast lookup by provider and active status
CREATE INDEX idx_telematics_gateways_provider_active ON public.telematics_gateways(provider) WHERE is_active = true;

-- Ensure audit logging if needed (Phase 2F might add explicit triggers here).
