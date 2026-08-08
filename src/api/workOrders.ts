import { Router } from 'express';
import { requireAuth } from './middleware';
import { DecisionEngine } from '../services/decisionEngine';

export const workOrderRouter = Router();

workOrderRouter.use(requireAuth);

workOrderRouter.post('/', async (req, res) => {
  const supabase = (req as any).supabase;
  const { parts_used, labor_hours, hourly_rate, ...orderData } = req.body;
  
  try {
    // 1. Fetch Inventory for R3 Reservation
    const { data: inventoryData, error: invError } = await supabase
      .from('inventory_items')
      .select('*');
      
    if (invError) throw invError;
    
    // R3: Parts Reservation
    const itemsToReserve = parts_used.map((p: any) => ({
      partId: p.part_id,
      requestedQty: p.quantity
    }));
    
    const r3Result = DecisionEngine.evalRuleR3ReserveParts(itemsToReserve, inventoryData);
    
    // R4: Cost Calculation
    const r4Result = DecisionEngine.evalRuleR4TotalCost(labor_hours, hourly_rate, parts_used.map((p: any) => ({
      partId: p.part_id,
      partName: p.name,
      quantity: p.quantity,
      unitCost: p.unit_cost
    })));
    
    // Perform Reservation Updates (R3)
    for (const res of r3Result) {
      if (res.reservedQty > 0) {
        await supabase
          .from('inventory_items')
          .update({ quantity: res.currentAvailable - res.reservedQty })
          .eq('id', res.partId);
      }
    }
    
    // Generate Purchase Orders if needed (R3)
    for (const res of r3Result) {
      if (res.needsPurchaseOrder) {
        await supabase.from('fleet_alerts').insert({
          rule_id: 'R3',
          severity: 'warning',
          title: `Low Stock Alert: ${res.partName}`,
          description: `Inventory for ${res.partName} dropped below threshold. Reorder required.`
        });
      }
    }

    // Insert Work Order
    const { data: woData, error: woError } = await supabase
      .from('work_orders')
      .insert({
        ...orderData,
        parts_used,
        labor_hours,
        hourly_rate,
        labor_cost: r4Result.laborCost,
        total_cost: r4Result.totalWorkOrderCost
      })
      .select()
      .single();
      
    if (woError) throw woError;

    // Audit Log
    await supabase.from('audit_log').insert({
      action: 'WORK_ORDER_CREATED',
      resource_type: 'work_orders',
      resource_id: woData.id,
      details: { r3Result, r4Result }
    });

    res.status(201).json({ workOrder: woData, r3Result, r4Result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

workOrderRouter.post('/:id/close', async (req, res) => {
  const supabase = (req as any).supabase;
  const { id } = req.params;
  const { afterNotes } = req.body;
  
  try {
    const { data: wo, error: woError } = await supabase
      .from('work_orders')
      .select('*')
      .eq('id', id)
      .single();
      
    if (woError) throw woError;

    // 1. Update Work Order
    const { data: updatedWo, error: updateError } = await supabase
      .from('work_orders')
      .update({ 
        status: 'Closed',
        closed_date: new Date().toISOString(),
        before_after_notes: { ...wo.before_after_notes, after: afterNotes }
      })
      .eq('id', id)
      .select()
      .single();
      
    if (updateError) throw updateError;
    
    // 2. Fetch Vehicle and remove the fault code associated with this WO
    if (wo.vehicle_id && wo.related_fault_code) {
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('active_fault_codes')
        .eq('id', wo.vehicle_id)
        .single();
        
      if (vehicle) {
        const remainingFaults = (vehicle.active_fault_codes || []).filter(
          (f: any) => f.code !== wo.related_fault_code
        );
        
        await supabase
          .from('vehicles')
          .update({
            active_fault_codes: remainingFaults,
            status: remainingFaults.length === 0 ? 'Healthy' : 'Attention',
            status_reason: remainingFaults.length === 0 ? 'Cleared' : 'Maintenance Required'
          })
          .eq('id', wo.vehicle_id);
      }
    }

    // 3. Audit Log
    await supabase.from('audit_log').insert({
      action: 'WORK_ORDER_CLOSED',
      resource_type: 'work_orders',
      resource_id: id,
      details: { afterNotes }
    });

    res.json(updatedWo);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
