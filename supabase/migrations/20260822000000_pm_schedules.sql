-- ==============================================================================
-- 20260822000000_pm_schedules.sql
-- PHASE 3B-01 : Maintenance Intelligence Data Model
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. pm_schedules (Model/Templates)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pm_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT 'c0a80101-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    title VARCHAR(255) NOT NULL,
    system_category VARCHAR(32) NOT NULL CHECK (system_category IN ('Engine', 'Brakes', 'Transmission', 'Electrical', 'Chassis & Tires', 'General')),
    
    -- Trigger Definition
    trigger_type VARCHAR(32) NOT NULL CHECK (trigger_type IN ('ODOMETER', 'TIME', 'ENGINE_HOURS')),
    interval_value NUMERIC(10,2) NOT NULL,
    interval_unit VARCHAR(32) NOT NULL CHECK (interval_unit IN ('KM', 'MILES', 'DAYS', 'MONTHS', 'HOURS')),
    
    -- Future/Advanced config
    applicable_classifications JSONB DEFAULT '[]'::jsonb, -- e.g. ["Heavy Truck", "Van"]
    estimated_labor_hours NUMERIC(8,2) DEFAULT 0.00,
    required_parts JSONB DEFAULT '[]'::jsonb,
    
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pm_schedules_tenant ON public.pm_schedules(tenant_id);

-- ------------------------------------------------------------------------------
-- 2. pm_vehicle_subscriptions (Active Tracking)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pm_vehicle_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT 'c0a80101-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    pm_schedule_id UUID NOT NULL REFERENCES public.pm_schedules(id) ON DELETE CASCADE,
    
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Base calculation points
    last_service_date TIMESTAMPTZ,
    last_service_odometer NUMERIC(10,2),
    last_service_engine_hours NUMERIC(10,2),
    
    -- Next due targets
    next_due_date TIMESTAMPTZ,
    next_due_odometer NUMERIC(10,2),
    next_due_engine_hours NUMERIC(10,2),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 1 subscription per vehicle per schedule
    CONSTRAINT uq_vehicle_pm_schedule UNIQUE (vehicle_id, pm_schedule_id)
);
CREATE INDEX idx_pm_subs_tenant ON public.pm_vehicle_subscriptions(tenant_id);
CREATE INDEX idx_pm_subs_vehicle ON public.pm_vehicle_subscriptions(vehicle_id);

-- ------------------------------------------------------------------------------
-- 3. PM Idempotency / Evaluation History (3B-03)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pm_evaluation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT 'c0a80101-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    pm_subscription_id UUID NOT NULL REFERENCES public.pm_vehicle_subscriptions(id) ON DELETE CASCADE,
    trigger_key VARCHAR(255) NOT NULL, -- e.g., "sub_id:135000" or "sub_id:2026-08-22"
    
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL, -- Link to generated WO
    
    -- Prevent duplicate evaluations for the same trigger cycle
    CONSTRAINT uq_pm_trigger_key UNIQUE (pm_subscription_id, trigger_key)
);
CREATE INDEX idx_pm_events_tenant ON public.pm_evaluation_events(tenant_id);

-- ------------------------------------------------------------------------------
-- 4. Alter work_orders to preserve PM Provenance (3B-04)
-- ------------------------------------------------------------------------------
ALTER TABLE public.work_orders
ADD COLUMN pm_subscription_id UUID REFERENCES public.pm_vehicle_subscriptions(id) ON DELETE SET NULL,
ADD COLUMN pm_schedule_id UUID REFERENCES public.pm_schedules(id) ON DELETE SET NULL,
ADD COLUMN pm_trigger_type VARCHAR(32),
ADD COLUMN pm_trigger_value VARCHAR(128); -- e.g. "135000" or "2026-08-22"

-- ------------------------------------------------------------------------------
-- 5. RLS Policies
-- ------------------------------------------------------------------------------

-- pm_schedules
ALTER TABLE public.pm_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for pm_schedules SELECT" ON public.pm_schedules FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant isolation for pm_schedules INSERT" ON public.pm_schedules FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant isolation for pm_schedules UPDATE" ON public.pm_schedules FOR UPDATE USING (tenant_id IS NOT NULL AND tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant isolation for pm_schedules DELETE" ON public.pm_schedules FOR DELETE USING (tenant_id IS NOT NULL AND tenant_id = public.get_current_tenant_id());

-- pm_vehicle_subscriptions
ALTER TABLE public.pm_vehicle_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for pm_vehicle_subscriptions SELECT" ON public.pm_vehicle_subscriptions FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant isolation for pm_vehicle_subscriptions INSERT" ON public.pm_vehicle_subscriptions FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant isolation for pm_vehicle_subscriptions UPDATE" ON public.pm_vehicle_subscriptions FOR UPDATE USING (tenant_id IS NOT NULL AND tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant isolation for pm_vehicle_subscriptions DELETE" ON public.pm_vehicle_subscriptions FOR DELETE USING (tenant_id IS NOT NULL AND tenant_id = public.get_current_tenant_id());

-- pm_evaluation_events
ALTER TABLE public.pm_evaluation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for pm_evaluation_events SELECT" ON public.pm_evaluation_events FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant isolation for pm_evaluation_events INSERT" ON public.pm_evaluation_events FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());

-- Note: We only need SELECT and INSERT for events (immutable log).
