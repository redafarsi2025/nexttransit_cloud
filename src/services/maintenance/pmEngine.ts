import { 
  PMVehicleSubscription, 
  PMEvaluationResult, 
  PMStatus,
  PMTriggerKey
} from './pmTypes';

/**
 * NextTransit Preventive Maintenance Engine (PM Engine)
 * Evaluates triggers and determines PM eligibility based on resolved subscription metadata.
 */
export class PMEngine {
  
  /**
   * Evaluate a Time-based trigger.
   */
  public static evaluateTimeTrigger(
    subscription: PMVehicleSubscription,
    currentDateStr: string = new Date().toISOString()
  ): PMEvaluationResult {
    if (!subscription.last_service_date || !subscription.next_due_date) {
      return {
        status: 'DUE',
        trigger_type: 'TIME',
        current_value: currentDateStr,
        threshold_value: 'N/A',
        is_eligible_for_wo: true,
        reason: 'Missing last service date, scheduling immediate baseline PM.'
      };
    }

    const current = new Date(currentDateStr).getTime();
    const nextDue = new Date(subscription.next_due_date).getTime();
    
    // DUE_SOON threshold: 14 days warning window for time triggers.
    const warningWindowMs = 14 * 24 * 60 * 60 * 1000; 

    const diffMs = nextDue - current;
    
    let status: PMStatus = 'NOT_DUE';
    let eligible = false;

    if (diffMs <= 0) {
      status = 'OVERDUE';
      eligible = true;
    } else if (diffMs <= warningWindowMs) {
      status = 'DUE_SOON';
      eligible = false;
    }

    return {
      status,
      trigger_type: 'TIME',
      current_value: new Date(current).toISOString(),
      threshold_value: new Date(nextDue).toISOString(),
      is_eligible_for_wo: eligible,
      reason: `Time trigger evaluated: ${status}`
    };
  }

  /**
   * Evaluate an Odometer-based trigger.
   */
  public static evaluateOdometerTrigger(
    subscription: PMVehicleSubscription,
    currentOdometer: number
  ): PMEvaluationResult {
    if (subscription.next_due_odometer === undefined || subscription.next_due_odometer === null) {
      return {
        status: 'DUE',
        trigger_type: 'ODOMETER',
        current_value: currentOdometer,
        threshold_value: 0,
        is_eligible_for_wo: true,
        reason: 'Missing next_due_odometer, scheduling baseline.'
      };
    }

    const nextDue = subscription.next_due_odometer;
    // DUE_SOON threshold: 2000 km/miles
    const warningThreshold = 2000; 

    let status: PMStatus = 'NOT_DUE';
    let eligible = false;

    if (currentOdometer >= nextDue) {
      status = 'OVERDUE';
      eligible = true;
    } else if (currentOdometer >= nextDue - warningThreshold) {
      status = 'DUE_SOON';
      eligible = false;
    }

    return {
      status,
      trigger_type: 'ODOMETER',
      current_value: currentOdometer,
      threshold_value: nextDue,
      is_eligible_for_wo: eligible,
      reason: `Odometer at ${currentOdometer}, target ${nextDue}`
    };
  }

  /**
   * Evaluate Engine Hours-based trigger.
   */
  public static evaluateEngineHoursTrigger(
    subscription: PMVehicleSubscription,
    currentEngineHours: number
  ): PMEvaluationResult {
    if (subscription.next_due_engine_hours === undefined || subscription.next_due_engine_hours === null) {
      return {
        status: 'DUE',
        trigger_type: 'ENGINE_HOURS',
        current_value: currentEngineHours,
        threshold_value: 0,
        is_eligible_for_wo: true,
        reason: 'Missing next_due_engine_hours, scheduling baseline.'
      };
    }

    const nextDue = subscription.next_due_engine_hours;
    // DUE_SOON threshold: 50 hours
    const warningThreshold = 50; 

    let status: PMStatus = 'NOT_DUE';
    let eligible = false;

    if (currentEngineHours >= nextDue) {
      status = 'OVERDUE';
      eligible = true;
    } else if (currentEngineHours >= nextDue - warningThreshold) {
      status = 'DUE_SOON';
      eligible = false;
    }

    return {
      status,
      trigger_type: 'ENGINE_HOURS',
      current_value: currentEngineHours,
      threshold_value: nextDue,
      is_eligible_for_wo: eligible,
      reason: `Engine hours at ${currentEngineHours}, target ${nextDue}`
    };
  }

  /**
   * Evaluates a subscription based on its resolved trigger type.
   */
  public static evaluateSubscription(
    subscription: PMVehicleSubscription,
    telemetryContext: { currentOdometer?: number; currentEngineHours?: number; currentDateStr?: string }
  ): PMEvaluationResult {
    // Determine the active trigger type from the resolved snapshot
    const triggerType = subscription.resolved_trigger_type;

    if (!triggerType) {
      throw new Error(`Missing resolved_trigger_type for subscription: ${subscription.id}`);
    }

    switch (triggerType) {
      case 'ODOMETER':
        return this.evaluateOdometerTrigger(subscription, telemetryContext.currentOdometer || 0);
      case 'TIME':
        return this.evaluateTimeTrigger(subscription, telemetryContext.currentDateStr);
      case 'ENGINE_HOURS':
        return this.evaluateEngineHoursTrigger(subscription, telemetryContext.currentEngineHours || 0);
      default:
        throw new Error(`Unsupported resolved_trigger_type: ${triggerType}`);
    }
  }

  /**
   * Generates a deterministic idempotency key for a specific trigger cycle.
   */
  public static generateTriggerKey(
    subscriptionId: string,
    result: PMEvaluationResult
  ): PMTriggerKey {
    return {
      subscriptionId,
      triggerType: result.trigger_type,
      // e.g., if threshold is 135000, key is "ODOMETER:135000"
      cycleIdentifier: `${result.trigger_type}:${result.threshold_value}`
    };
  }
}
