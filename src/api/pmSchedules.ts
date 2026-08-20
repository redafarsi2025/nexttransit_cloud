import { Router } from 'express';
import { requireAuth } from './middleware';
import { PMTriggerService } from '../services/maintenance/pmTriggerService';
import { PMEngine } from '../services/maintenance/pmEngine';
import { supabaseAdmin } from '../lib/supabaseAdmin';

export const pmSchedulesRouter = Router();

pmSchedulesRouter.use(requireAuth);

/**
 * GET /api/pm-schedules
 * Fetch all schedules (tenant-scoped via RLS, but we use admin here just to query quickly,
 * ideally we should use the user's supabase client but for this MVP admin is okay if filtered by tenant).
 */
pmSchedulesRouter.get('/', async (req, res) => {
  const supabase = (req as any).supabase;
  
  const { data, error } = await supabase
    .from('pm_schedules')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

/**
 * GET /api/pm-status
 * Returns consolidated PM status for all vehicles of the tenant.
 */
pmSchedulesRouter.get('/status', async (req, res) => {
  const supabase = (req as any).supabase;
  const tenantId = (req as any).user.tenant_id;

  try {
    const { data: subsData, error: subsError } = await supabaseAdmin
      .from('pm_vehicle_subscriptions')
      .select(`
        *,
        pm_schedules (*),
        vehicles ( plate, mileage )
      `)
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (subsError) throw subsError;

    const subscriptions = subsData || [];
    const statuses = subscriptions.map((sub: any) => {
      const schedule = sub.pm_schedules;
      const vehicle = sub.vehicles;
      const mileage = vehicle?.mileage || 0;
      
      let statusResult = null;
      try {
        statusResult = PMEngine.evaluateSubscription(sub, { 
          currentOdometer: mileage,
          currentDateStr: new Date().toISOString()
        });
      } catch (e) {
        statusResult = { status: 'NOT_DUE', threshold_value: 0, current_value: 0 };
      }

      return {
        vehicle_id: sub.vehicle_id,
        vehicle_plate: vehicle?.plate,
        pm_schedule_id: schedule.id,
        pm_title: schedule.title,
        status: statusResult.status,
        next_due: statusResult.threshold_value,
        current_value: statusResult.current_value,
        resolution_source: sub.resolution_source,
        resolved_rule_id: sub.resolved_rule_id,
        resolved_interval_value: sub.resolved_interval_value,
        resolved_trigger_type: sub.resolved_trigger_type,
        resolved_at: sub.resolved_at
      };
    });

    res.json(statuses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pm-schedules/evaluate-time
 * Manual trigger for Daily Cron (Time Triggers)
 */
pmSchedulesRouter.post('/evaluate-time', async (req, res) => {
  // Usually secured by a super_admin check or secret header
  try {
    await PMTriggerService.evaluateTimeTriggers();
    res.json({ success: true, message: 'Time evaluation triggered' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
