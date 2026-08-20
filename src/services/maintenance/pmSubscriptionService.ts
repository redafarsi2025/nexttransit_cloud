import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { PMRuleResolver, PMScheduleRule, VehicleResolutionData } from './pmRuleResolver';
import { PMVehicleSubscription } from './pmTypes';
import { logger } from '../../lib/logger';

export class PMSubscriptionService {
  /**
   * Creates a new PM subscription and resolves the appropriate rule immediately.
   */
  public static async createSubscription(
    tenantId: string,
    vehicleId: string,
    scheduleId: string,
    initialTargets: { odometer?: number; engine_hours?: number; date?: string } = {}
  ): Promise<PMVehicleSubscription> {
    
    // 1. Fetch vehicle data for resolution
    const vehicle = await this.getVehicleResolutionData(vehicleId);
    if (!vehicle) throw new Error(`Vehicle ${vehicleId} not found`);

    // 2. Resolve rule before insertion
    const rules = await this.fetchRulesForSchedule(scheduleId);
    const resolved = PMRuleResolver.resolve(vehicle, scheduleId, rules);

    // 3. Prepare subscription payload
    const payload = {
      tenant_id: tenantId,
      vehicle_id: vehicleId,
      pm_schedule_id: scheduleId,
      is_active: true,
      
      // Resolved metadata
      resolved_rule_id: resolved.ruleId,
      resolved_trigger_type: resolved.triggerType,
      resolved_interval_value: resolved.intervalValue,
      resolved_at: new Date().toISOString(),
      resolution_source: resolved.resolutionSource,
      resolution_reason: resolved.resolutionReason,

      // Initial targets
      last_service_odometer: initialTargets.odometer,
      last_service_engine_hours: initialTargets.engine_hours,
      last_service_date: initialTargets.date,
      next_due_odometer: initialTargets.odometer !== undefined ? initialTargets.odometer + resolved.intervalValue : undefined,
      next_due_engine_hours: initialTargets.engine_hours !== undefined ? initialTargets.engine_hours + resolved.intervalValue : undefined,
      next_due_date: initialTargets.date !== undefined ? this.addDateInterval(initialTargets.date, resolved.intervalValue) : undefined,
    };

    // 4. Insert
    const { data, error } = await supabaseAdmin
      .from('pm_vehicle_subscriptions')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      logger.error({ event: 'pm_subscription_create_failed', error: error.message }, 'Failed to create subscription');
      throw error;
    }

    return data as any as PMVehicleSubscription;
  }

  /**
   * Resolves a single subscription and updates it if the resolution changes.
   */
  public static async resolveSubscription(subscription: PMVehicleSubscription): Promise<void> {
    const vehicle = await this.getVehicleResolutionData(subscription.vehicle_id);
    if (!vehicle) return;

    const rules = await this.fetchRulesForSchedule(subscription.pm_schedule_id);
    const resolved = PMRuleResolver.resolve(vehicle, subscription.pm_schedule_id, rules);

    // Check if resolution actually changed to preserve history
    if (
      subscription.resolved_rule_id !== resolved.ruleId ||
      Number(subscription.resolved_interval_value) !== resolved.intervalValue ||
      subscription.resolved_trigger_type !== resolved.triggerType
    ) {
      const { error } = await supabaseAdmin
        .from('pm_vehicle_subscriptions')
        .update({
          resolved_rule_id: resolved.ruleId,
          resolved_trigger_type: resolved.triggerType,
          resolved_interval_value: resolved.intervalValue,
          resolved_at: new Date().toISOString(),
          resolution_source: resolved.resolutionSource,
          resolution_reason: resolved.resolutionReason,
        })
        .eq('id', subscription.id);
        
      if (error) {
        logger.error({ event: 'pm_subscription_resolve_failed', subscriptionId: subscription.id, error: error.message }, 'Failed to update subscription resolution');
      } else {
        logger.info({ event: 'pm_subscription_resolved', subscriptionId: subscription.id, ruleId: resolved.ruleId }, 'Subscription re-resolved');
      }
    }
  }

  /**
   * To be called when a vehicle's attributes (make, model, year, etc.) change.
   * Finds all subscriptions for this vehicle and re-resolves them.
   */
  public static async reResolveForVehicle(vehicleId: string): Promise<void> {
    const { data, error } = await supabaseAdmin
      .from('pm_vehicle_subscriptions')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .eq('is_active', true);

    if (error || !data) {
      logger.error({ event: 'pm_re_resolve_vehicle_failed', vehicleId, error: error?.message }, 'Failed to fetch subscriptions for vehicle');
      return;
    }

    for (const sub of data) {
      await this.resolveSubscription(sub as any as PMVehicleSubscription);
    }
  }

  /**
   * To be called when a PM rule is created, updated, or deleted.
   * Finds all subscriptions matching the schedule and re-resolves them.
   */
  public static async reResolveForRuleChange(scheduleId: string): Promise<void> {
    const { data, error } = await supabaseAdmin
      .from('pm_vehicle_subscriptions')
      .select('*')
      .eq('pm_schedule_id', scheduleId)
      .eq('is_active', true);

    if (error || !data) {
      logger.error({ event: 'pm_re_resolve_rule_failed', scheduleId, error: error?.message }, 'Failed to fetch subscriptions for schedule');
      return;
    }

    for (const sub of data) {
      await this.resolveSubscription(sub as any as PMVehicleSubscription);
    }
  }

  // --- Helpers ---

  private static async getVehicleResolutionData(vehicleId: string): Promise<VehicleResolutionData | null> {
    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .select('id, tenant_id, make, model, model_year, engine_code, fuel_type, vehicle_type')
      .eq('id', vehicleId)
      .single();
      
    if (error || !data) return null;
    return data as VehicleResolutionData;
  }

  private static async fetchRulesForSchedule(scheduleId: string): Promise<PMScheduleRule[]> {
    const { data, error } = await supabaseAdmin
      .from('pm_schedule_rules')
      .select('*')
      .eq('pm_schedule_id', scheduleId)
      .eq('is_active', true);
      
    if (error || !data) return [];
    return data as PMScheduleRule[];
  }

  private static addDateInterval(dateStr: string, intervalDays: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + intervalDays); // Default to days since we don't store interval_unit in rules yet, assume days for time
    return d.toISOString();
  }
}
