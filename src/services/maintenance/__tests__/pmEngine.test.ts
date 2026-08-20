import { PMEngine } from '../pmEngine';
import { PMVehicleSubscription, PMEvaluationResult } from '../pmTypes';
import { describe, it, expect } from 'vitest';

describe('PMEngine', () => {
  const baseSubscription: PMVehicleSubscription = {
    id: 'sub-1',
    tenant_id: 'tenant-1',
    vehicle_id: 'veh-1',
    pm_schedule_id: 'sched-1',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // Base targets
    last_service_odometer: 100000,
    next_due_odometer: 110000,
    // Resolved metadata
    resolved_rule_id: 'rule-1',
    resolved_trigger_type: 'ODOMETER',
    resolved_interval_value: 10000,
    resolved_at: new Date().toISOString(),
    resolution_source: 'VEHICLE',
    resolution_reason: 'Testing override'
  };

  describe('evaluateOdometerTrigger', () => {
    it('should return NOT_DUE if well below target', () => {
      const sub = { ...baseSubscription };
      const result = PMEngine.evaluateSubscription(sub, { currentOdometer: 105000 });
      
      expect(result.status).toBe('NOT_DUE');
      expect(result.is_eligible_for_wo).toBe(false);
      expect(result.trigger_type).toBe('ODOMETER');
      expect(result.threshold_value).toBe(110000);
    });

    it('should return DUE_SOON if within warning threshold (2000 km)', () => {
      const sub = { ...baseSubscription };
      const result = PMEngine.evaluateSubscription(sub, { currentOdometer: 108500 });
      
      expect(result.status).toBe('DUE_SOON');
      expect(result.is_eligible_for_wo).toBe(false);
    });

    it('should return OVERDUE and eligible for WO if current is exactly or above next_due', () => {
      const sub = { ...baseSubscription };
      const result = PMEngine.evaluateSubscription(sub, { currentOdometer: 110000 });
      
      expect(result.status).toBe('OVERDUE');
      expect(result.is_eligible_for_wo).toBe(true);

      const resultPast = PMEngine.evaluateSubscription(sub, { currentOdometer: 112000 });
      expect(resultPast.status).toBe('OVERDUE');
      expect(resultPast.is_eligible_for_wo).toBe(true);
    });

    it('should schedule baseline (DUE) if next_due is missing', () => {
      const sub = { ...baseSubscription, next_due_odometer: undefined };
      const result = PMEngine.evaluateSubscription(sub, { currentOdometer: 105000 });
      
      expect(result.status).toBe('DUE');
      expect(result.is_eligible_for_wo).toBe(true);
    });
  });

  describe('evaluateTimeTrigger', () => {
    const timeSub: PMVehicleSubscription = {
      ...baseSubscription,
      resolved_trigger_type: 'TIME',
      resolved_interval_value: 3,
      last_service_date: '2026-05-20T00:00:00Z',
      next_due_date: '2026-08-20T00:00:00Z'
    };

    it('should return NOT_DUE if well before date', () => {
      const result = PMEngine.evaluateSubscription(timeSub, { currentDateStr: '2026-07-01T00:00:00Z' });
      expect(result.status).toBe('NOT_DUE');
    });

    it('should return DUE_SOON if within 14 days', () => {
      const result = PMEngine.evaluateSubscription(timeSub, { currentDateStr: '2026-08-10T00:00:00Z' });
      expect(result.status).toBe('DUE_SOON');
    });

    it('should return OVERDUE if current date is at or past next due', () => {
      const result = PMEngine.evaluateSubscription(timeSub, { currentDateStr: '2026-08-20T10:00:00Z' });
      expect(result.status).toBe('OVERDUE');
      expect(result.is_eligible_for_wo).toBe(true);
    });
  });

  describe('evaluateEngineHoursTrigger', () => {
    const ehSub: PMVehicleSubscription = {
      ...baseSubscription,
      resolved_trigger_type: 'ENGINE_HOURS',
      resolved_interval_value: 500,
      last_service_engine_hours: 1000,
      next_due_engine_hours: 1500
    };

    it('should return NOT_DUE if well before target', () => {
      const result = PMEngine.evaluateSubscription(ehSub, { currentEngineHours: 1400 });
      expect(result.status).toBe('NOT_DUE');
    });

    it('should return DUE_SOON if within 50 hours', () => {
      const result = PMEngine.evaluateSubscription(ehSub, { currentEngineHours: 1460 });
      expect(result.status).toBe('DUE_SOON');
    });

    it('should return OVERDUE if at or past next due', () => {
      const result = PMEngine.evaluateSubscription(ehSub, { currentEngineHours: 1510 });
      expect(result.status).toBe('OVERDUE');
      expect(result.is_eligible_for_wo).toBe(true);
    });
  });

  describe('generateTriggerKey', () => {
    it('should return deterministic trigger key', () => {
      const result: PMEvaluationResult = {
        status: 'OVERDUE',
        trigger_type: 'ODOMETER',
        current_value: 110000,
        threshold_value: 110000,
        is_eligible_for_wo: true,
        reason: ''
      };
      const key = PMEngine.generateTriggerKey('sub-1', result);
      expect(key.subscriptionId).toBe('sub-1');
      expect(key.cycleIdentifier).toBe('ODOMETER:110000');
    });
  });

});
