import { Request, Response, Router } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { faker } from '@faker-js/faker';
import { requireAuth } from './middleware';

export const demoSeederRouter = Router();

// Endpoint to generate demo data
const seedDemoData = async (req: Request, res: Response) => {
  const user = (req as any).user;
  
  if (!user || !user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. Get the tenant_id of the current user
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.tenant_id) {
      return res.status(403).json({ error: 'Tenant not found for user' });
    }

    if (profile.role !== 'TENANT_ADMIN' && profile.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only administrators can seed demo data' });
    }

    const tenantId = profile.tenant_id;

    // 2. Generate Vehicles
    const vehicles = Array.from({ length: 5 }).map(() => ({
      tenant_id: tenantId,
      name: `Demo - ${faker.vehicle.manufacturer()} ${faker.vehicle.model()}`,
      plate: faker.vehicle.vrm(),
      status: faker.helpers.arrayElement(['Healthy', 'Attention', 'Critical']),
      classification: faker.helpers.arrayElement(['Keystone', 'Standard']),
      mileage: faker.number.int({ min: 1000, max: 200000 }),
      is_demo: true,
    }));

    const { data: insertedVehicles, error: vehiclesError } = await supabaseAdmin
      .from('vehicles')
      .insert(vehicles as any)
      .select();

    if (vehiclesError || !insertedVehicles) {
      throw new Error(`Failed to insert demo vehicles: ${vehiclesError?.message}`);
    }

    // 3. Generate Inventory Items
    const inventory = Array.from({ length: 10 }).map(() => ({
      tenant_id: tenantId,
      name: faker.commerce.productName(),
      sku: faker.string.alphanumeric(8).toUpperCase(),
      quantity: faker.number.int({ min: 0, max: 100 }),
      reorder_threshold: faker.number.int({ min: 5, max: 20 }),
      unit_cost: faker.number.float({ min: 10, max: 500, fractionDigits: 2 }),
      category: faker.helpers.arrayElement(['Parts', 'Fluids', 'Tools', 'PPE']),
      is_demo: true,
    }));

    const { error: inventoryError } = await supabaseAdmin
      .from('inventory_items')
      .insert(inventory as any);

    if (inventoryError) throw new Error(`Failed to insert inventory: ${inventoryError.message}`);

    // 4. Generate Work Orders
    const workOrders = insertedVehicles.map(vehicle => {
      const isCompleted = faker.datatype.boolean();
      return {
        tenant_id: tenantId,
        vehicle_id: vehicle.id,
        vehicle_plate: vehicle.plate,
        before_notes: `Intervention demandée: ${faker.lorem.sentence()}`,
        status: isCompleted ? 'Closed' : faker.helpers.arrayElement(['Open', 'In Progress', 'Pending Parts']),
        type: faker.helpers.arrayElement(['Preventive', 'Corrective', 'Inspection', 'Investigation']),
        created_date: faker.date.recent({ days: 30 }).toISOString(),
        closed_date: isCompleted ? faker.date.recent({ days: 5 }).toISOString() : null,
        assigned_mechanic_id: null,
        is_demo: true,
      };
    });

    const { data: insertedWorkOrders, error: workOrdersError } = await supabaseAdmin
      .from('work_orders')
      .insert(workOrders as any)
      .select();

    if (workOrdersError || !insertedWorkOrders) {
      throw new Error(`Failed to insert work orders: ${workOrdersError?.message}`);
    }

    // 5. Generate Cost Records from completed work orders
    const completedWOs = insertedWorkOrders.filter(wo => wo.status === 'COMPLETED');
    const costRecords = completedWOs.map(wo => ({
      tenant_id: tenantId,
      vehicle_id: wo.vehicle_id,
      vehicle_plate: wo.vehicle_plate,
      work_order_id: wo.id,
      category: faker.helpers.arrayElement(['Preventive Maintenance', 'Corrective Repair', 'Parts & Consumables', 'Emergency Diagnostics']),
      amount: faker.number.float({ min: 100, max: 2000, fractionDigits: 2 }),
      budget_for_category: 5000,
      period: `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
      is_demo: true,
    }));

    if (costRecords.length > 0) {
      const { error: costsError } = await supabaseAdmin
        .from('cost_records')
        .insert(costRecords as any);
      if (costsError) throw new Error(`Failed to insert cost records: ${costsError.message}`);
    }

    // Incidents removed since table doesn't exist

    return res.status(200).json({ message: 'Données de démonstration générées avec succès' });
  } catch (error: any) {
    console.error('Error seeding demo data:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

// Endpoint to delete all demo data
const cleanupDemoData = async (req: Request, res: Response) => {
  const user = (req as any).user;
  
  if (!user || !user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.tenant_id) {
      return res.status(403).json({ error: 'Tenant not found for user' });
    }

    if (profile.role !== 'TENANT_ADMIN' && profile.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only administrators can clean up demo data' });
    }

    const tenantId = profile.tenant_id;

    // Delete in reverse order of dependencies (if ON DELETE CASCADE is not perfect, though we use it where possible)
    // Supabase JS doesn't allow bulk delete without a filter. We filter by tenant_id AND is_demo.
    const tables = [
      'cost_records',
      'work_orders',
      'inventory_items',
      'vehicles',
      'pm_schedules',
      'fuel_logs',
      'fleet_alerts',
      'cae_budget_metrics'
    ];

    const deletionResults = [];

    for (const table of tables) {
      const { error } = await supabaseAdmin
        .from(table as any)
        .delete()
        .eq('tenant_id', tenantId)
        .eq('is_demo', true);
      
      if (error) {
        console.warn(`Error deleting demo data from ${table}:`, error.message);
        deletionResults.push({ table, status: 'error', error: error.message });
      } else {
        deletionResults.push({ table, status: 'success' });
      }
    }

    return res.status(200).json({ 
      message: 'Données de démonstration effacées avec succès',
      details: deletionResults
    });
  } catch (error: any) {
    console.error('Error cleaning up demo data:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

demoSeederRouter.post('/seed-demo', requireAuth, seedDemoData);
demoSeederRouter.post('/cleanup-demo', requireAuth, cleanupDemoData);
