import { Router } from 'express';
import { requireAuth } from './middleware';
import { DecisionEngine } from '../services/decisionEngine';

export const incidentRouter = Router();

incidentRouter.use(requireAuth);

incidentRouter.post('/', async (req, res) => {
  const supabase = (req as any).supabase;
  const { vehicle_id, ...incidentData } = req.body;
  
  try {
    const { data: incident, error: incidentError } = await supabase
      .from('driver_incidents')
      .insert({ vehicle_id, ...incidentData })
      .select()
      .single();
      
    if (incidentError) throw incidentError;
    
    // R6 Evaluation
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('active_fault_codes')
      .eq('id', vehicle_id)
      .single();
      
    const r6Result = DecisionEngine.evalRuleR6IncidentAudit(
      incident,
      vehicle?.active_fault_codes || []
    );
    
    if (r6Result.requiresR6InvestigationWO) {
      await supabase.from('fleet_alerts').insert({
        rule_id: 'R6',
        severity: 'warning',
        title: `R6 Driver Incident Reported: ${vehicle_id}`,
        description: r6Result.reason,
        vehicle_id: vehicle_id
      });
    }

    // Audit Log
    await supabase.from('audit_log').insert({
      action: 'INCIDENT_CREATED',
      resource_type: 'incidents',
      resource_id: incident.id,
      details: { r6Result }
    });
    
    res.status(201).json({ incident, r6Result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
