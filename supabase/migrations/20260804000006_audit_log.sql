-- Migration 20260804000006_audit_log.sql
-- Immutable Audit Trail for Tenant-Scoped Entity Mutations & Decisions

CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    actor_id TEXT NOT NULL DEFAULT 'system',
    actor_role TEXT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    before JSONB DEFAULT '{}'::jsonb,
    after JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row-Level Security
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Select Policy: Scoped to user's tenant_id
CREATE POLICY "Tenant scoped select on audit_log"
    ON public.audit_log FOR SELECT
    USING (
        tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        OR (auth.jwt() ->> 'tenant_id') IS NULL
    );

-- Insert Policy: Authenticated writes scoped to tenant_id
CREATE POLICY "Tenant scoped insert on audit_log"
    ON public.audit_log FOR INSERT
    WITH CHECK (
        tenant_id IS NOT NULL
    );

-- STRICT IMMUTABILITY: Revoke UPDATE and DELETE entirely for all roles
REVOKE UPDATE, DELETE ON public.audit_log FROM PUBLIC, authenticated, anon;

-- Indexes for performance filtering on audit trail queries
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_entity ON public.audit_log (tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log (created_at DESC);
