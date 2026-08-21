-- Add is_demo flag to major business tables to support demo data generation and cleanup

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE public.pm_schedules ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE public.fuel_logs ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE public.cost_records ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE public.fleet_alerts ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE public.cae_budget_metrics ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- Create an index to quickly find and delete demo data per tenant
CREATE INDEX IF NOT EXISTS idx_vehicles_demo ON public.vehicles(tenant_id) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_work_orders_demo ON public.work_orders(tenant_id) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_inventory_items_demo ON public.inventory_items(tenant_id) WHERE is_demo = true;
