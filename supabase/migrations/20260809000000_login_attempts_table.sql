-- Migration: 20260809000000_login_attempts_table.sql
-- Description: Create persistent login_attempts table for rate limiting across server restarts

CREATE TABLE IF NOT EXISTS public.login_attempts (
    email TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row-Level Security
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Grant access to authenticated and service roles
GRANT ALL ON public.login_attempts TO authenticated;
GRANT ALL ON public.login_attempts TO service_role;

-- RLS Policy for login_attempts table
DROP POLICY IF EXISTS login_attempts_service_policy ON public.login_attempts;
CREATE POLICY login_attempts_service_policy ON public.login_attempts
    FOR ALL
    TO authenticated, service_role
    USING (true)
    WITH CHECK (true);
