import { PMVehicleSubscription, PMScheduleModel, PMTriggerType } from './pmTypes';

export interface VehicleResolutionData {
  id: string;
  tenant_id: string;
  make?: string;
  model?: string;
  model_year?: number;
  engine_code?: string;
  fuel_type?: string;
  vehicle_type?: string;
}

export type PMRuleScope = 'GLOBAL' | 'TENANT' | 'VEHICLE';

export interface PMScheduleRule {
  id: string;
  pm_schedule_id: string;
  tenant_id?: string;
  vehicle_id?: string;
  rule_scope: PMRuleScope;
  make?: string;
  model?: string;
  model_year_from?: number;
  model_year_to?: number;
  engine_code?: string;
  fuel_type?: string;
  vehicle_type?: string;
  trigger_type: PMTriggerType;
  interval_value: number;
  priority: number;
  effective_from?: string;
  effective_to?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PMRuleResolutionResult {
  ruleId: string;
  intervalValue: number;
  triggerType: PMTriggerType;
  specificityScore: number;
  resolutionSource: PMRuleScope;
  resolutionReason: string;
}

export class PMRuleResolver {
  
  /**
   * Resolves the most specific PM rule for a given vehicle and schedule.
   * Rules are scored based on how closely they match the vehicle's attributes.
   * If multiple rules have the exact same score, it sorts by priority and creation date.
   */
  public static resolve(
    vehicle: VehicleResolutionData,
    scheduleId: string,
    availableRules: PMScheduleRule[]
  ): PMRuleResolutionResult {
    
    const activeRules = availableRules.filter(rule => {
      if (!rule.is_active) return false;
      if (rule.pm_schedule_id !== scheduleId) return false;

      // Check tenant isolation: global rules or matching tenant
      if (rule.tenant_id && rule.tenant_id !== vehicle.tenant_id) return false;
      
      // Check effective dates
      const now = new Date().getTime();
      if (rule.effective_from && new Date(rule.effective_from).getTime() > now) return false;
      if (rule.effective_to && new Date(rule.effective_to).getTime() < now) return false;

      // Strict matching filters - if rule specifies a field, the vehicle must match it
      if (rule.vehicle_id && rule.vehicle_id !== vehicle.id) return false;
      if (rule.make && rule.make !== vehicle.make) return false;
      if (rule.model && rule.model !== vehicle.model) return false;
      if (rule.engine_code && rule.engine_code !== vehicle.engine_code) return false;
      if (rule.fuel_type && rule.fuel_type !== vehicle.fuel_type) return false;
      if (rule.vehicle_type && rule.vehicle_type !== vehicle.vehicle_type) return false;
      
      // Check year range
      if (rule.model_year_from && (!vehicle.model_year || vehicle.model_year < rule.model_year_from)) return false;
      if (rule.model_year_to && (!vehicle.model_year || vehicle.model_year > rule.model_year_to)) return false;

      return true;
    });

    if (activeRules.length === 0) {
      throw new Error(`No PM rules found for schedule ${scheduleId}. Data migration may be incomplete.`);
    }

    const scoredRules = activeRules.map(rule => {
      const score = this.calculateSpecificityScore(rule);
      const reason = this.buildResolutionReason(rule);
      return { rule, score, reason };
    });

    // Sort by score (desc), then priority (desc), then created_at (desc)
    scoredRules.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      if (a.rule.priority !== b.rule.priority) {
        return b.rule.priority - a.rule.priority;
      }
      return new Date(b.rule.created_at).getTime() - new Date(a.rule.created_at).getTime();
    });

    const bestMatch = scoredRules[0];

    return {
      ruleId: bestMatch.rule.id,
      intervalValue: Number(bestMatch.rule.interval_value),
      triggerType: bestMatch.rule.trigger_type,
      specificityScore: bestMatch.score,
      resolutionSource: bestMatch.rule.rule_scope,
      resolutionReason: bestMatch.reason
    };
  }

  /**
   * Calculates a deterministic specificity score for a rule.
   * Follows the business logic:
   * VEHICLE override         = 1000
   * TENANT + MODEL           = 800
   * TENANT + MAKE            = 700
   * GLOBAL + MODEL + YEAR    = 600
   * GLOBAL + MODEL           = 500
   * GLOBAL + MAKE            = 400
   * VEHICLE TYPE             = 200
   * GENERIC                  = 100
   */
  private static calculateSpecificityScore(rule: PMScheduleRule): number {
    let score = 0;
    
    // Evaluate rule scope
    if (rule.rule_scope === 'VEHICLE' && rule.vehicle_id) {
      score += 1000;
      return score; // Max specificity, no need to check other fields
    }
    
    if (rule.rule_scope === 'TENANT' && rule.tenant_id) {
      // Base score for tenant
      score += 500;
      if (rule.model) score += 300; // TENANT + MODEL = 800
      else if (rule.make) score += 200; // TENANT + MAKE = 700
    } else {
      // GLOBAL scope
      score += 100; // Generic base score
      if (rule.model && (rule.model_year_from || rule.model_year_to)) score += 500; // GLOBAL + MODEL + YEAR = 600
      else if (rule.model) score += 400; // GLOBAL + MODEL = 500
      else if (rule.make) score += 300; // GLOBAL + MAKE = 400
    }
    
    // Add minor adjustments for other attributes if they exist
    if (rule.vehicle_type && !rule.make && !rule.model) {
      score = Math.max(score, 200); // VEHICLE TYPE generic rule
    }
    
    // Extra specific points (e.g. for engine_code or fuel_type on top of make/model)
    if (rule.engine_code) score += 20;
    if (rule.fuel_type) score += 10;
    
    return score;
  }

  /**
   * Generates a human-readable string explaining why the rule matched.
   */
  private static buildResolutionReason(rule: PMScheduleRule): string {
    const parts = [rule.rule_scope];
    if (rule.vehicle_id) parts.push('VEHICLE OVERRIDE');
    if (rule.make) parts.push('MAKE');
    if (rule.model) parts.push('MODEL');
    if (rule.model_year_from || rule.model_year_to) parts.push('YEAR');
    if (rule.engine_code) parts.push('ENGINE');
    if (rule.fuel_type) parts.push('FUEL');
    if (rule.vehicle_type) parts.push('TYPE');
    
    if (parts.length === 1) parts.push('GENERIC');
    
    return `Matched rule: ${parts.join(' + ')}`;
  }
}
