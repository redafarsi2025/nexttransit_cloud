// src/services/maintenance/pmTypes.ts

export type PMTriggerType = 'ODOMETER' | 'TIME' | 'ENGINE_HOURS';
export type PMIntervalUnit = 'KM' | 'MILES' | 'DAYS' | 'MONTHS' | 'HOURS';
export type PMStatus = 'NOT_DUE' | 'DUE_SOON' | 'DUE' | 'OVERDUE';

export interface PMScheduleModel {
  id: string;
  tenant_id: string;
  title: string;
  system_category: 'Engine' | 'Brakes' | 'Transmission' | 'Electrical' | 'Chassis & Tires' | 'General';
  trigger_type: PMTriggerType;
  interval_value: number;
  interval_unit: PMIntervalUnit;
  applicable_classifications: string[];
  estimated_labor_hours: number;
  required_parts: any[]; // JSONB
  is_active: boolean;
}

export interface PMVehicleSubscription {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  pm_schedule_id: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  
  // Base targets
  last_service_date?: string;
  last_service_odometer?: number;
  last_service_engine_hours?: number;
  
  next_due_date?: string;
  next_due_odometer?: number;
  next_due_engine_hours?: number;

  // Resolved metadata from Phase 3B.1
  resolved_rule_id?: string;
  resolved_trigger_type?: PMTriggerType;
  resolved_interval_value?: number;
  resolved_interval_unit?: PMIntervalUnit;
  resolved_at?: string;
  resolution_source?: string;
  resolution_reason?: string;
}

export interface PMEvaluationResult {
  status: PMStatus;
  trigger_type: PMTriggerType;
  current_value: number | string;
  threshold_value: number | string;
  is_eligible_for_wo: boolean;
  reason?: string;
}

export interface PMTriggerKey {
  subscriptionId: string;
  triggerType: PMTriggerType;
  cycleIdentifier: string; // e.g., "135000" or "2026-08-22"
}
