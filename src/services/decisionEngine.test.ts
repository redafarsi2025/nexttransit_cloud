import { describe, it, expect } from 'vitest';
import { DecisionEngine } from './decisionEngine';
import { ActiveFaultCode, InventoryItem, Incident, Warranty } from '../types';

describe('NextTransit Decision Engine (Rules R1 - R7)', () => {
  describe('Rule R1: Emergency Stop / Red Alert', () => {
    it('should trigger Red Alert and emergency dispatch when a Critical fault is present', () => {
      const faultCodes: ActiveFaultCode[] = [
        {
          code: 'P0217',
          name: 'Engine Overtemperature Condition',
          severity: 'Critical',
          logged_date: '2026-08-05T10:00:00Z',
          required_intervention: 'Inspect radiator and coolant level',
        },
      ];

      const result = DecisionEngine.evalRuleR1({ id: 'V-001', plate: 'TRUCK-01', name: 'Volvo Truck' }, faultCodes);

      expect(result.isRedAlert).toBe(true);
      expect(result.vehicleStatus).toBe('Unsafe / Red');
      expect(result.emergencyDispatchRequired).toBe(true);
      expect(result.removeDispatchAssignment).toBe(true);
      expect(result.criticalFaults.length).toBe(1);
    });

    it('should remain Operational when only minor or info faults exist', () => {
      const faultCodes: ActiveFaultCode[] = [
        {
          code: 'P0420',
          name: 'Catalyst System Efficiency Below Threshold',
          severity: 'Warning',
          logged_date: '2026-08-05T10:00:00Z',
          required_intervention: 'Check exhaust system sensor',
        },
      ];

      const result = DecisionEngine.evalRuleR1({ id: 'V-002', plate: 'TRUCK-02', name: 'Renault Truck' }, faultCodes);

      expect(result.isRedAlert).toBe(false);
      expect(result.vehicleStatus).toBe('Operational');
      expect(result.emergencyDispatchRequired).toBe(false);
    });

    it('should detect warranty void risks on critical fault when warranty is active', () => {
      const faultCodes: ActiveFaultCode[] = [
        {
          code: 'P0201',
          name: 'Injector Circuit Malfunction',
          severity: 'Critical',
          logged_date: '2026-08-05T10:00:00Z',
          required_intervention: 'Replace fuel injector cylinder 1',
        },
      ];

      const warranty: Warranty = {
        id: 'W-001',
        vehicle_id: 'V-003',
        manufacturer: 'Volvo Trucks Algeria',
        status: 'active',
        expiry_date: '2028-12-31',
        expiry_mileage: 150000,
        covered_systems: ['Engine', 'Transmission'],
      };

      const result = DecisionEngine.evalRuleR1({ id: 'V-003' }, faultCodes, warranty);

      expect(result.warrantyVoidRisk).toBe(true);
      expect(result.warrantyNotes).toContain('Volvo Trucks Algeria');
    });
  });

  describe('Rule R2: Schedule Conflict Prevention', () => {
    it('should detect conflict when departure is within 3 days and open WOs exist', () => {
      const departureDate = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString();
      const openWOs = [{ id: 'WO-101', status: 'Open' as const }];

      const result = DecisionEngine.evalRuleR2({ id: 'V-001', plate: 'TRUCK-01', name: 'Volvo Truck' }, openWOs, departureDate);

      expect(result.hasConflict).toBe(true);
      expect(result.openWorkOrderCount).toBe(1);
      expect(result.message).toContain('Alerte Conflit R2');
    });

    it('should NOT trigger conflict when departure is 10 days away', () => {
      const departureDate = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString();
      const openWOs = [{ id: 'WO-101', status: 'Open' as const }];

      const result = DecisionEngine.evalRuleR2({ id: 'V-001' }, openWOs, departureDate);

      expect(result.hasConflict).toBe(false);
    });
  });

  describe('Rule R3: Inventory Reservation System', () => {
    it('should correctly reserve inventory and identify low-stock reorder triggers', () => {
      const inventoryCatalog: InventoryItem[] = [
        {
          id: 'PART-01',
          sku: 'FILT-OIL-01',
          name: 'Heavy Duty Oil Filter',
          category: 'Engine',
          quantity: 10,
          unit_cost: 4500,
          reorder_threshold: 8,
          location_bin: 'A-01',
          compatible_vehicles: ['TRUCK-01'],
          lead_time_days: 5,
        },
      ];

      const itemsToReserve = [{ partId: 'PART-01', requestedQty: 5 }];

      const reservations = DecisionEngine.evalRuleR3ReserveParts(itemsToReserve, inventoryCatalog);

      expect(reservations[0].reservedQty).toBe(5);
      expect(reservations[0].needsPurchaseOrder).toBe(true); // 10 - 5 = 5 <= 8
    });
  });

  describe('Rule R4: Total Cost of Repair Formula', () => {
    it('should calculate WO total cost using formula: Labor Cost + Sum(Parts Subtotal)', () => {
      const laborHours = 4.5;
      const hourlyRate = 3500; // DZD/hr
      const parts = [
        { partId: 'P-1', partName: 'Oil Filter', quantity: 2, unitCost: 4000 },
        { partId: 'P-2', partName: 'Synthetic Oil 15W40 (L)', quantity: 10, unitCost: 1200 },
      ];

      const result = DecisionEngine.evalRuleR4TotalCost(laborHours, hourlyRate, parts);

      // Labor = 4.5 * 3500 = 15,750
      // Parts = (2 * 4000) + (10 * 1200) = 8,000 + 12,000 = 20,000
      // Total = 35,750
      expect(result.laborCost).toBe(15750);
      expect(result.partsTotalCost).toBe(20000);
      expect(result.totalWorkOrderCost).toBe(35750);
    });
  });

  describe('Rule R5: CAE Budget Prioritization Metric', () => {
    it('should calculate priority score using weighted components', () => {
      const input = {
        criticalSeverityFactor: 10, // Max critical (40 pts)
        daysUntilRoute: 1, // 1 day until route (30 pts)
        roiCostRatio: 5, // Max ROI (30 pts)
      };

      const result = DecisionEngine.evalRuleR5PriorityScore(input);

      expect(result.priorityScore).toBe(100);
      expect(result.recommendationLevel).toBe('URGENT_DISPATCH');
    });
  });

  describe('Rule R6: Telemetry Reconciliation / Driver Incident Audit', () => {
    it('should trigger R6 investigation WO when driver reports an incident without electronic fault', () => {
      const incident: Partial<Incident> = {
        id: 'INC-201',
        reported_by: 'Driver Slimane',
        category: 'Noise',
        description: 'Clutch Slip / Transmission Noise',
        status: 'Investigation',
        created_date: '2026-08-05T12:00:00Z',
      };

      const electronicFaults: ActiveFaultCode[] = []; // No OBD fault logged

      const result = DecisionEngine.evalRuleR6IncidentAudit(incident, electronicFaults);

      expect(result.requiresR6InvestigationWO).toBe(true);
      expect(result.reason).toContain('R6 Audit Violation');
    });
  });

  describe('Rule R7: Strategic Fleet Health Variance Analysis', () => {
    it('should flag budget variance when actual spend exceeds budget by > 10%', () => {
      const actualSpend = 550000;
      const projectedBudget = 450000; // 22.2% over budget

      const result = DecisionEngine.evalRuleR7BudgetVariance(actualSpend, projectedBudget, 'Engine');

      expect(result.triggerAuditFlag).toBe(true);
      expect(result.variancePercentage).toBeGreaterThan(10);
    });

    it('should NOT flag when spend is within 10% tolerance', () => {
      const actualSpend = 460000;
      const projectedBudget = 450000; // 2.2% over budget

      const result = DecisionEngine.evalRuleR7BudgetVariance(actualSpend, projectedBudget, 'Engine');

      expect(result.triggerAuditFlag).toBe(false);
    });
  });
});
