import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { logger } from '../../lib/logger';
import { PMEngine } from './pmEngine';
import { PMWorkOrderGenerator } from './pmWorkOrderGenerator';
import { PMVehicleSubscription, PMScheduleModel, PMEvaluationResult } from './pmTypes';

export class PMTriggerService {
  /**
   * Called by TelemetryWorker when new odometer reading is received.
   * Evaluates all ODOMETER based PM subscriptions for the vehicle.
   */
  public static async evaluateOdometer(
    tenantId: string, 
    vehicleId: string, 
    vehiclePlate: string,
    currentOdometer: number
  ) {
    try {
      // 1. Fetch active subscriptions for this vehicle
      const { data: subsData, error: subsError } = await supabaseAdmin
        .from('pm_vehicle_subscriptions')
        .select(`
          *,
          pm_schedules (*)
        `)
        .eq('vehicle_id', vehicleId)
        .eq('is_active', true);

      if (subsError) throw subsError;

      const subscriptions = subsData || [];

      for (const sub of subscriptions) {
        // Only evaluate subscriptions that are resolved to ODOMETER
        if (sub.resolved_trigger_type !== 'ODOMETER') {
          continue;
        }

        const schedule = sub.pm_schedules as any as PMScheduleModel;
        
        // Ensure we have resolved metadata
        if (!sub.resolved_interval_value) {
          logger.warn({ subId: sub.id }, 'Subscription lacks resolved_interval_value. Skipping evaluation.');
          continue;
        }

        // 2. Evaluate using the resolved snapshot
        const result: PMEvaluationResult = PMEngine.evaluateSubscription(sub, { currentOdometer });

        // 3. Generate Work Order if eligible
        if (result.is_eligible_for_wo) {
          const genResult = await PMWorkOrderGenerator.generatePreventiveWorkOrder(
            supabaseAdmin as any,
            tenantId,
            vehicleId,
            vehiclePlate,
            sub,
            schedule,
            result
          );

          if (genResult.success) {
            logger.info({ event: 'pm_wo_generated', vehicleId, scheduleId: schedule.id, woId: genResult.workOrderId }, 'Automatic Preventive Work Order generated');
          } else {
            logger.debug({ event: 'pm_wo_skipped', vehicleId, scheduleId: schedule.id, reason: genResult.skippedReason }, 'Skipped WO generation');
          }
        }
      }
    } catch (err: any) {
      logger.error({ event: 'pm_odometer_evaluation_failed', vehicleId, error: err.message }, 'Failed to evaluate odometer PMs');
    }
  }

  /**
   * Called by Daily Cron to evaluate TIME based triggers for all vehicles.
   */
  public static async evaluateTimeTriggers() {
    try {
      logger.info({ event: 'pm_time_evaluation_started' }, 'Starting daily PM time evaluation');
      
      const { data: subsData, error: subsError } = await supabaseAdmin
        .from('pm_vehicle_subscriptions')
        .select(`
          *,
          pm_schedules (*),
          vehicles ( plate )
        `)
        .eq('is_active', true);

      if (subsError) throw subsError;

      const subscriptions = subsData || [];
      let evaluated = 0;
      let generated = 0;

      for (const sub of subscriptions) {
        // Only evaluate subscriptions that are resolved to TIME
        if (sub.resolved_trigger_type !== 'TIME') {
          continue;
        }

        if (!sub.resolved_interval_value) {
          logger.warn({ subId: sub.id }, 'Subscription lacks resolved_interval_value. Skipping evaluation.');
          continue;
        }

        const schedule = sub.pm_schedules as any as PMScheduleModel;
        const vehiclePlate = (sub.vehicles as any)?.plate || 'Unknown';

        // 2. Evaluate using the resolved snapshot
        const result: PMEvaluationResult = PMEngine.evaluateSubscription(sub, { currentDateStr: new Date().toISOString() });

        // 3. Generate Work Order if eligible
        if (result.is_eligible_for_wo) {
          const genResult = await PMWorkOrderGenerator.generatePreventiveWorkOrder(
            supabaseAdmin as any,
            sub.tenant_id,
            sub.vehicle_id,
            vehiclePlate,
            sub,
            schedule,
            result
          );

          if (genResult.success) {
            generated++;
            logger.info({ event: 'pm_wo_generated', vehicleId: sub.vehicle_id, scheduleId: schedule.id, woId: genResult.workOrderId }, 'Automatic Preventive Work Order generated');
          }
        }
        evaluated++;
      }

      logger.info({ event: 'pm_time_evaluation_completed', evaluated, generated }, 'Completed daily PM time evaluation');
    } catch (err: any) {
      logger.error({ event: 'pm_time_evaluation_failed', error: err.message }, 'Failed to evaluate time PMs');
    }
  }
}
