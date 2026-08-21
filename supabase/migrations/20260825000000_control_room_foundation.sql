-- 20260825000000_control_room_foundation.sql
-- Phase 3C-02: Control Room Database Foundation

-- Create control_rooms table
CREATE TABLE public.control_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT control_rooms_tenant_name_key UNIQUE (tenant_id, name)
);

-- Enable RLS
ALTER TABLE public.control_rooms ENABLE ROW LEVEL SECURITY;

-- Control Rooms Policies
CREATE POLICY "Users can view control rooms in their tenant"
  ON public.control_rooms FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Tenant admins can manage control rooms"
  ON public.control_rooms FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND (role = 'SUPER_ADMIN' OR role = 'TENANT_ADMIN')
    )
  );

-- Create control_room_screens table
CREATE TABLE public.control_room_screens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  control_room_id uuid NOT NULL REFERENCES public.control_rooms(id) ON DELETE CASCADE,
  screen_number integer NOT NULL,
  name text NOT NULL,
  dashboard_type text NOT NULL,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_seen_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT control_room_screens_room_number_key UNIQUE (control_room_id, screen_number),
  CONSTRAINT control_room_screens_dashboard_type_check CHECK (
    dashboard_type IN (
      'live_map',
      'critical_alerts',
      'fleet_kpi',
      'maintenance_queue',
      'operations'
    )
  )
);

-- Enable RLS
ALTER TABLE public.control_room_screens ENABLE ROW LEVEL SECURITY;

-- Control Room Screens Policies
CREATE POLICY "Users can view control room screens in their tenant"
  ON public.control_room_screens FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Tenant admins can manage control room screens"
  ON public.control_room_screens FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND (role = 'SUPER_ADMIN' OR role = 'TENANT_ADMIN')
    )
  );

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_control_rooms
BEFORE UPDATE ON public.control_rooms
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_control_room_screens
BEFORE UPDATE ON public.control_room_screens
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Create indices for performance
CREATE INDEX idx_control_rooms_tenant_id ON public.control_rooms(tenant_id);
CREATE INDEX idx_control_room_screens_tenant_id ON public.control_room_screens(tenant_id);
CREATE INDEX idx_control_room_screens_room_id ON public.control_room_screens(control_room_id);
