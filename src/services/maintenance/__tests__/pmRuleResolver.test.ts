import { PMRuleResolver, PMScheduleRule, VehicleResolutionData } from '../pmRuleResolver';
import { describe, it, expect } from 'vitest';

describe('PMRuleResolver', () => {
  const scheduleId = 'sched-123';
  const tenantId = 'tenant-456';

  const baseVehicle: VehicleResolutionData = {
    id: 'veh-1',
    tenant_id: tenantId,
    make: 'Renault',
    model: 'Clio',
    model_year: 2020,
    engine_code: 'K9K',
    fuel_type: 'Diesel',
    vehicle_type: 'Light Commercial'
  };

  const createRule = (overrides: Partial<PMScheduleRule>): PMScheduleRule => ({
    id: 'rule-' + Math.random().toString(36).substr(2, 9),
    pm_schedule_id: scheduleId,
    rule_scope: 'GLOBAL',
    trigger_type: 'ODOMETER',
    interval_value: 10000,
    priority: 100,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  });

  it('should select a VEHICLE override rule over TENANT and GLOBAL rules', () => {
    const rules = [
      createRule({ id: 'r-global', rule_scope: 'GLOBAL', interval_value: 10000 }),
      createRule({ id: 'r-tenant', rule_scope: 'TENANT', tenant_id: tenantId, make: 'Renault', interval_value: 12000 }),
      createRule({ id: 'r-vehicle', rule_scope: 'VEHICLE', vehicle_id: baseVehicle.id, interval_value: 15000 })
    ];

    const result = PMRuleResolver.resolve(baseVehicle, scheduleId, rules);

    expect(result.ruleId).toBe('r-vehicle');
    expect(result.intervalValue).toBe(15000);
    expect(result.resolutionSource).toBe('VEHICLE');
  });

  it('should select TENANT + MODEL over TENANT + MAKE', () => {
    const rules = [
      createRule({ id: 'r-make', rule_scope: 'TENANT', tenant_id: tenantId, make: 'Renault', interval_value: 12000 }),
      createRule({ id: 'r-model', rule_scope: 'TENANT', tenant_id: tenantId, make: 'Renault', model: 'Clio', interval_value: 13000 })
    ];

    const result = PMRuleResolver.resolve(baseVehicle, scheduleId, rules);

    expect(result.ruleId).toBe('r-model');
    expect(result.intervalValue).toBe(13000);
  });

  it('should filter out inactive rules and wrong schedules', () => {
    const rules = [
      createRule({ id: 'r-inactive', rule_scope: 'GLOBAL', is_active: false }),
      createRule({ id: 'r-wrong-sched', rule_scope: 'GLOBAL', pm_schedule_id: 'other-sched' }),
      createRule({ id: 'r-valid', rule_scope: 'GLOBAL', interval_value: 9999 })
    ];

    const result = PMRuleResolver.resolve(baseVehicle, scheduleId, rules);

    expect(result.ruleId).toBe('r-valid');
    expect(result.intervalValue).toBe(9999);
  });

  it('should resolve tie-breakers using priority', () => {
    // Both rules have same scope and matching criteria
    const rules = [
      createRule({ id: 'r-low', rule_scope: 'GLOBAL', make: 'Renault', priority: 50, interval_value: 1 }),
      createRule({ id: 'r-high', rule_scope: 'GLOBAL', make: 'Renault', priority: 200, interval_value: 2 })
    ];

    const result = PMRuleResolver.resolve(baseVehicle, scheduleId, rules);

    expect(result.ruleId).toBe('r-high');
    expect(result.intervalValue).toBe(2);
  });

  it('should throw if no rules are found', () => {
    expect(() => PMRuleResolver.resolve(baseVehicle, scheduleId, [])).toThrow(/No PM rules found/);
  });

  it('should match on year ranges', () => {
    const rules = [
      createRule({ id: 'r-generic', rule_scope: 'GLOBAL', make: 'Renault' }),
      createRule({ 
        id: 'r-specific', 
        rule_scope: 'GLOBAL', 
        make: 'Renault', 
        model_year_from: 2019, 
        model_year_to: 2021,
        interval_value: 5000 
      })
    ];

    const result = PMRuleResolver.resolve(baseVehicle, scheduleId, rules);

    expect(result.ruleId).toBe('r-specific');
    expect(result.intervalValue).toBe(5000);
  });

});
