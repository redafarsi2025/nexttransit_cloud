-- Consolidated Schema for NextTransit AI Studio
-- --------------------------------------------------------------------------------

-- 1. Tenants Table
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    currency VARCHAR(32) NOT NULL DEFAULT 'USD ($)',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Default Tenants
INSERT INTO public.tenants (id, name, currency)
VALUES ('c0a80101-0000-0000-0000-000000000001', 'NextTransit Core Operations', 'USD ($)')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tenants (id, name, currency)
VALUES ('c0a80101-0000-0000-0000-000000000002', 'Numilog Pilot Fleet', 'DZD (DA)')
ON CONFLICT (id) DO NOTHING;

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL DEFAULT 'c0a80101-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL DEFAULT 'DRIVER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, tenant_id, role, is_active)
    VALUES (
        new.id,
        COALESCE((new.raw_user_meta_data->>'tenant_id')::uuid, 'c0a80101-0000-0000-0000-000000000001'::uuid),
        COALESCE(new.raw_user_meta_data->>'role', 'DRIVER'),
        TRUE
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Vehicles Table
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT 'c0a80101-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    plate VARCHAR(32) NOT NULL,
    name VARCHAR(128) NOT NULL,
    classification VARCHAR(32) NOT NULL DEFAULT 'Standard' CHECK (classification IN ('Keystone', 'Standard')),
    status VARCHAR(32) NOT NULL DEFAULT 'Healthy' CHECK (status IN ('Healthy', 'Attention', 'Critical', 'Unknown')),
    status_reason TEXT NOT NULL DEFAULT 'Nominal operation',
    last_check_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active_fault_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
    mileage INT NOT NULL DEFAULT 0,
    next_service_mileage INT NOT NULL DEFAULT 10000,
    next_service_date TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    scheduled_use_days INT NOT NULL DEFAULT 7,
    scheduled_route VARCHAR(255),
    maintenance_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    assigned_driver_id VARCHAR(255),
    assigned_mechanic_id VARCHAR(255),
    fault_score INT NOT NULL DEFAULT 100 CHECK (fault_score BETWEEN 0 AND 100),
    compliance_score INT NOT NULL DEFAULT 100 CHECK (compliance_score BETWEEN 0 AND 100),
    classification_weight NUMERIC(4,2) NOT NULL DEFAULT 1.00,
    delay_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.40,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, plate)
);

-- 4. Warranties Table
CREATE TABLE IF NOT EXISTS public.warranties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL DEFAULT 'c0a80101-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    provider VARCHAR(255) NOT NULL,
    expiration_date TIMESTAMPTZ,
    expiration_mileage INT,
    covered_systems JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Expired', 'Voided')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Fuel Logs Table
CREATE TABLE IF NOT EXISTS public.fuel_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL DEFAULT 'c0a80101-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    liters DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    odometer INT NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    route_id VARCHAR(255),
    anomaly_flag BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Inventory Items Table
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT 'c0a80101-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(64) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    reserved_quantity INT NOT NULL DEFAULT 0,
    reorder_threshold INT NOT NULL DEFAULT 5,
    unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    compatible_vehicles TEXT[] NOT NULL DEFAULT '{}',
    lead_time_days INT NOT NULL DEFAULT 3,
    category VARCHAR(64) NOT NULL DEFAULT 'General',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, sku)
);

-- 7. Work Orders Table
CREATE TABLE IF NOT EXISTS public.work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT 'c0a80101-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    vehicle_plate VARCHAR(32) NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'Corrective' CHECK (type IN ('Corrective', 'Preventive', 'Inspection', 'Investigation')),
    status VARCHAR(32) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Pending Parts', 'Closed')),
    labor_hours NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    hourly_rate NUMERIC(8,2) NOT NULL DEFAULT 85.00,
    labor_cost NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    parts_used JSONB NOT NULL DEFAULT '[]'::jsonb,
    before_notes TEXT,
    after_notes TEXT,
    created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_date TIMESTAMPTZ,
    assigned_mechanic_id VARCHAR(255),
    assigned_mechanic_name VARCHAR(255),
    related_fault_code VARCHAR(128),
    related_incident_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Driver Incidents Table
CREATE TABLE IF NOT EXISTS public.driver_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT 'c0a80101-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    vehicle_plate VARCHAR(32) NOT NULL,
    reported_by VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL CHECK (category IN ('Noise', 'Warning Light', 'Damage', 'Other')),
    description TEXT NOT NULL,
    matched_to_fault BOOLEAN NOT NULL DEFAULT FALSE,
    related_fault_code VARCHAR(128),
    status VARCHAR(32) NOT NULL DEFAULT 'Investigation' CHECK (status IN ('Investigation', 'Resolved')),
    created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Cost Records Table
CREATE TABLE IF NOT EXISTS public.cost_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT 'c0a80101-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    vehicle_plate VARCHAR(32) NOT NULL,
    category VARCHAR(64) NOT NULL CHECK (category IN ('Preventive Maintenance', 'Corrective Repair', 'Parts & Consumables', 'Emergency Diagnostics')),
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    budget_for_category NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    period VARCHAR(32) NOT NULL,
    work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
    related_fault_code VARCHAR(128),
    related_part_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Fleet Alerts Table
CREATE TABLE IF NOT EXISTS public.fleet_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT 'c0a80101-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rule_id VARCHAR(8) NOT NULL CHECK (rule_id IN ('R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(32) NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
    part_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    read BOOLEAN NOT NULL DEFAULT FALSE
);

-- 11. CAE Budget Metrics Table
CREATE TABLE IF NOT EXISTS public.cae_budget_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT 'c0a80101-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    vehicle_plate VARCHAR(32) NOT NULL,
    vehicle_name VARCHAR(128) NOT NULL,
    classification VARCHAR(32) NOT NULL,
    fault_code VARCHAR(128) NOT NULL,
    fault_name VARCHAR(255) NOT NULL,
    repair_cost NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    deferral_cost NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    delay_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.00,
    failure_likelihood NUMERIC(4,2) NOT NULL DEFAULT 0.50,
    classification_weight NUMERIC(4,2) NOT NULL DEFAULT 1.00,
    rank_score NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(32) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Deferred', 'Escalated')),
    scheduled_use_days INT NOT NULL DEFAULT 7,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT 'c0a80101-0000-0000-0000-000000000001'::uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    key VARCHAR(255),
    namespace VARCHAR(64),
    language VARCHAR(10),
    previous_value TEXT,
    new_value TEXT NOT NULL,
    status_from VARCHAR(32),
    status_to VARCHAR(32),
    user_role VARCHAR(64) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    action VARCHAR(32) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    entity_name VARCHAR(128),
    entity_id VARCHAR(255),
    actor_id UUID
);

-- 13. Translation Cache Table
CREATE TABLE IF NOT EXISTS public.translation_cache (
    key VARCHAR(255) NOT NULL,
    namespace VARCHAR(64) NOT NULL,
    language VARCHAR(10) NOT NULL,
    value TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'AI Translated', 'Approved')),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(255),
    PRIMARY KEY (key, namespace, language)
);

-- 14. Helper Functions and Triggers
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY['profiles', 'vehicles', 'warranties', 'fuel_logs', 'inventory_items', 'work_orders', 'driver_incidents', 'cae_budget_metrics'])
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS set_updated_at ON public.%I;
            CREATE TRIGGER set_updated_at
            BEFORE UPDATE ON public.%I
            FOR EACH ROW
            EXECUTE FUNCTION public.set_updated_at_timestamp();
        ', t, t);
    END LOOP;
END $$;

-- 15. RLS Setup

-- Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cae_budget_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_cache ENABLE ROW LEVEL SECURITY;

-- Helper to get current tenant id
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE((auth.jwt() ->> 'tenant_id')::uuid, 'c0a80101-0000-0000-0000-000000000001'::uuid);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Add RLS Policies scoped to tenant_id
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY['vehicles', 'warranties', 'fuel_logs', 'inventory_items', 'work_orders', 'driver_incidents', 'cost_records', 'fleet_alerts', 'cae_budget_metrics', 'audit_logs'])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation SELECT for %I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation INSERT for %I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation UPDATE for %I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation DELETE for %I" ON public.%I', t, t);
        
        EXECUTE format('CREATE POLICY "Tenant Isolation SELECT for %I" ON public.%I FOR SELECT USING (tenant_id = public.get_current_tenant_id())', t, t);
        EXECUTE format('CREATE POLICY "Tenant Isolation INSERT for %I" ON public.%I FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id())', t, t);
        EXECUTE format('CREATE POLICY "Tenant Isolation UPDATE for %I" ON public.%I FOR UPDATE USING (tenant_id = public.get_current_tenant_id()) WITH CHECK (tenant_id = public.get_current_tenant_id())', t, t);
        EXECUTE format('CREATE POLICY "Tenant Isolation DELETE for %I" ON public.%I FOR DELETE USING (tenant_id = public.get_current_tenant_id())', t, t);
    END LOOP;
END $$;

-- Profiles Policy
DROP POLICY IF EXISTS "Tenant Isolation SELECT for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Tenant Isolation UPDATE for profiles" ON public.profiles;
CREATE POLICY "Tenant Isolation SELECT for profiles" ON public.profiles FOR SELECT USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "Tenant Isolation UPDATE for profiles" ON public.profiles FOR UPDATE USING (tenant_id = public.get_current_tenant_id()) WITH CHECK (tenant_id = public.get_current_tenant_id());

-- Translation Cache (global, no tenant_id)
DROP POLICY IF EXISTS "Global SELECT for translation_cache" ON public.translation_cache;
CREATE POLICY "Global SELECT for translation_cache" ON public.translation_cache FOR SELECT USING (true);
DROP POLICY IF EXISTS "Global ALL for translation_cache" ON public.translation_cache;
CREATE POLICY "Global ALL for translation_cache" ON public.translation_cache FOR ALL USING (auth.role() = 'authenticated');

-- 16. Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
