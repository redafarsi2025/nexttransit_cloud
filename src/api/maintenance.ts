import { Router } from 'express';
import { requireAuth } from './middleware';
import { DecisionEngine } from '../services/decisionEngine';

export const maintenanceRouter = Router();

maintenanceRouter.use(requireAuth);

maintenanceRouter.post('/log-obd-fault', async (req, res) => {
  const supabase = (req as any).supabase;
  const { vehicleId, fault } = req.body;
  
  try {
    // 1. Fetch current vehicle
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .single();
      
    if (vehicleError) throw vehicleError;
    
    // 2. Append new fault to active_fault_codes
    const activeFault = {
      ...fault,
      logged_date: new Date().toISOString()
    };
    
    const updatedFaults = [activeFault, ...(vehicle.active_fault_codes || [])];
    
    // 3. Fetch Warranty for R1 evaluation
    const { data: warranties } = await supabase
      .from('warranties')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .eq('status', 'active');
      
    const warranty = warranties && warranties.length > 0 ? warranties[0] : null;

    // 4. Evaluate Rule R1
    const r1Result = DecisionEngine.evalRuleR1(vehicle, updatedFaults, warranty);
    
    const newStatus = r1Result.isRedAlert ? r1Result.vehicleStatus : (fault.severity === 'Warning' ? 'Attention' : vehicle.status);
    
    // 5. Update vehicle with new faults and potentially new status
    await supabase
      .from('vehicles')
      .update({ 
        active_fault_codes: updatedFaults,
        status: newStatus
      })
      .eq('id', vehicleId);
      
    // 6. Create an Alert for the fault
    await supabase.from('fleet_alerts').insert({
      rule_id: 'R1',
      title: `OBD Fault: ${fault.code} on Vehicle ${vehicleId}`,
      description: `${fault.name} - ${fault.required_intervention}`,
      severity: fault.severity === 'Critical' ? 'critical' : 'warning',
      vehicle_id: vehicleId,
      part_id: fault.required_part_id,
      read: false
    });
    
    // 7. Audit Log
    await supabase.from('audit_log').insert({
      action: 'OBD_FAULT_LOGGED',
      resource_type: 'vehicles',
      resource_id: vehicleId,
      details: { fault, r1Result }
    });

    res.json({ r1Result, newStatus, activeFault });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
