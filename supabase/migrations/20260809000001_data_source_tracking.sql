-- Migration: Data Source Tracking & Historical Replay Audit Table
-- Purpose: Adds data_source column to operational tables to isolate live telematics, historical imports, manual entries, and demo seed data.

-- 1. Add data_source column to operational tables
ALTER TABLE IF EXISTS public.vehicles 
ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'manual';

ALTER TABLE IF EXISTS public.positions 
ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'manual';

ALTER TABLE IF EXISTS public.fleet_alerts 
ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'manual';

ALTER TABLE IF EXISTS public.fuel_logs 
ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'manual';

ALTER TABLE IF EXISTS public.work_orders 
ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'manual';

ALTER TABLE IF EXISTS public.driver_incidents 
ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'manual';

-- 2. Create replay_results table for historical backtest audit reports
CREATE TABLE IF NOT EXISTS public.replay_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    batch_import_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    r1_critical_events_count INT DEFAULT 0,
    r2_schedule_conflicts_count INT DEFAULT 0,
    r5_mean_cae_score NUMERIC(5,2) DEFAULT 0.00,
    r7_projected_variance_percentage NUMERIC(5,2),
    report_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on replay_results
ALTER TABLE public.replay_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY replay_results_tenant_isolation ON public.replay_results
    FOR ALL
    USING (tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid);
