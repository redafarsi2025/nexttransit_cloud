-- ==============================================================================
-- 20260823000000_pm_schedule_rules.sql
-- PHASE 3B.1 : PM Rule Resolver
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Alter Vehicles Table (Add structured metadata)
-- ------------------------------------------------------------------------------
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS make VARCHAR(100),
ADD COLUMN IF NOT EXISTS model VARCHAR(100),
ADD COLUMN IF NOT EXISTS model_year INTEGER,
ADD COLUMN IF NOT EXISTS engine_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(100);

-- ------------------------------------------------------------------------------
-- 2. Create pm_schedule_rules Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pm_schedule_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    pm_schedule_id UUID NOT NULL REFERENCES public.pm_schedules(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
    
    rule_scope VARCHAR(32) NOT NULL CHECK (rule_scope IN ('GLOBAL', 'TENANT', 'VEHICLE')),
    
    make VARCHAR(100),
    model VARCHAR(100),
    
    model_year_from INTEGER CHECK (model_year_from >= 1900),
    model_year_to INTEGER CHECK (model_year_to >= 1900),
    
    engine_code VARCHAR(100),
    fuel_type VARCHAR(50),
    vehicle_type VARCHAR(100),

    trigger_type VARCHAR(32) NOT NULL CHECK (trigger_type IN ('TIME', 'ODOMETER', 'ENGINE_HOURS')),
    interval_value NUMERIC(10,2) NOT NULL CHECK (interval_value > 0),
    
    priority INTEGER NOT NULL DEFAULT 100,
    
    effective_from DATE,
    effective_to DATE,
    
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_model_year_range CHECK (model_year_to IS NULL OR model_year_from IS NULL OR model_year_to >= model_year_from)
);

-- ------------------------------------------------------------------------------
-- 3. Indexes for pm_schedule_rules
-- ------------------------------------------------------------------------------
CREATE INDEX idx_pm_rules_schedule ON public.pm_schedule_rules(pm_schedule_id);
CREATE INDEX idx_pm_rules_tenant ON public.pm_schedule_rules(tenant_id);
CREATE INDEX idx_pm_rules_vehicle ON public.pm_schedule_rules(vehicle_id);
CREATE INDEX idx_pm_rules_make_model ON public.pm_schedule_rules(make, model);
CREATE INDEX idx_pm_rules_active ON public.pm_schedule_rules(is_active);

-- ------------------------------------------------------------------------------
-- 4. RLS for pm_schedule_rules
-- ------------------------------------------------------------------------------
ALTER TABLE public.pm_schedule_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Isolation SELECT for pm_schedule_rules" 
    ON public.pm_schedule_rules FOR SELECT 
    USING (
        tenant_id = public.get_current_tenant_id() 
        OR tenant_id IS NULL
    );

CREATE POLICY "Tenant Isolation INSERT for pm_schedule_rules" 
    ON public.pm_schedule_rules FOR INSERT 
    WITH CHECK (
        tenant_id = public.get_current_tenant_id()
    );

CREATE POLICY "Tenant Isolation UPDATE for pm_schedule_rules" 
    ON public.pm_schedule_rules FOR UPDATE 
    USING (
        tenant_id = public.get_current_tenant_id()
    )
    WITH CHECK (
        tenant_id = public.get_current_tenant_id()
    );

CREATE POLICY "Tenant Isolation DELETE for pm_schedule_rules" 
    ON public.pm_schedule_rules FOR DELETE 
    USING (
        tenant_id = public.get_current_tenant_id()
    );

-- ------------------------------------------------------------------------------
-- 5. Alter pm_vehicle_subscriptions (Add audit & resolution traces)
-- ------------------------------------------------------------------------------
ALTER TABLE public.pm_vehicle_subscriptions
ADD COLUMN IF NOT EXISTS resolved_rule_id UUID REFERENCES public.pm_schedule_rules(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS resolved_trigger_type VARCHAR(32),
ADD COLUMN IF NOT EXISTS resolved_interval_value NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resolution_source VARCHAR(100),
ADD COLUMN IF NOT EXISTS resolution_reason TEXT;

-- ------------------------------------------------------------------------------
-- 6. Data Migration (Backward Compatibility)
-- ------------------------------------------------------------------------------
-- Create a generic GLOBAL rule for each existing PM Schedule using its original interval_value
DO $$
DECLARE
    sched RECORD;
    new_rule_id UUID;
BEGIN
    FOR sched IN SELECT id, trigger_type, interval_value FROM public.pm_schedules
    LOOP
        -- Insert a fallback generic rule for the schedule
        INSERT INTO public.pm_schedule_rules (
            pm_schedule_id,
            tenant_id,
            rule_scope,
            trigger_type,
            interval_value,
            priority,
            created_at,
            updated_at
        ) VALUES (
            sched.id,
            NULL, -- GLOBAL
            'GLOBAL',
            sched.trigger_type,
            sched.interval_value,
            100, -- Default Priority
            NOW(),
            NOW()
        ) RETURNING id INTO new_rule_id;

        -- Update existing subscriptions for this schedule to point to the new rule
        UPDATE public.pm_vehicle_subscriptions
        SET 
            resolved_rule_id = new_rule_id,
            resolved_trigger_type = sched.trigger_type,
            resolved_interval_value = sched.interval_value,
            resolved_at = NOW(),
            resolution_source = 'GLOBAL',
            resolution_reason = 'Legacy migration fallback rule'
        WHERE pm_schedule_id = sched.id;
    END LOOP;
END $$;
