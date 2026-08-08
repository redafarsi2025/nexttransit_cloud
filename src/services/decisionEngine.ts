import { Vehicle, ActiveFaultCode, WorkOrder, InventoryItem, Incident, Warranty } from '../types';

export interface R1Result {
  isRedAlert: boolean;
  vehicleStatus: 'Unsafe / Red' | 'Operational' | 'Warning';
  emergencyDispatchRequired: boolean;
  removeDispatchAssignment: boolean;
  criticalFaults: ActiveFaultCode[];
  warrantyVoidRisk: boolean;
  warrantyNotes?: string;
}

export interface R2Result {
  hasConflict: boolean;
  daysToDeparture: number;
  openWorkOrderCount: number;
  message?: string;
}

export interface R3PartReservation {
  partId: string;
  partName: string;
  requestedQty: number;
  reservedQty: number;
  currentAvailable: number;
  needsPurchaseOrder: boolean;
  reorderThreshold: number;
}

export interface R4CostBreakdown {
  laborCost: number;
  partsTotalCost: number;
  totalWorkOrderCost: number;
  partsItemized: Array<{
    partId: string;
    partName: string;
    quantity: number;
    unitCost: number;
    subtotal: number;
  }>;
}

export interface R5PrioritizationInput {
  criticalSeverityFactor: number; // 0 to 10
  daysUntilRoute: number; // e.g. 1 to 30
  roiCostRatio: number; // e.g. 0.1 to 5.0
}

export interface R5PrioritizationResult {
  priorityScore: number; // 0 to 100
  criticalScoreComponent: number;
  daysScoreComponent: number;
  roiScoreComponent: number;
  recommendationLevel: 'URGENT_DISPATCH' | 'HIGH_PRIORITY' | 'MEDIUM_PRIORITY' | 'LOW_PRIORITY';
}

export interface R6AuditResult {
  requiresR6InvestigationWO: boolean;
  reason: string;
  suggestedWorkOrderType: string;
  driverIncidentId: string;
}

export interface R7CategoryVariance {
  category: 'Engine' | 'Electrical' | 'Brake' | 'Chassis' | 'Fuel' | 'General';
  actualSpend: number;
  projectedBudget: number;
  variancePercentage: number;
  triggerAuditFlag: boolean;
}

/**
 * NextTransit Decision Engine (Rules R1 – R7)
 * Implements strict domain business logic and mathematical formulations.
 */
export class DecisionEngine {
  /**
   * Rule R1 (Emergency Stop / Red Alert + Warranty Extension)
   * Any active OBD fault categorized as 'Critical' marks vehicle status as Unsafe / Red,
   * triggers an emergency dispatch, and removes the vehicle from dispatch assignment.
   */
  public static evalRuleR1(
    vehicle: Partial<Vehicle>,
    faultCodes: ActiveFaultCode[],
    warranty?: Warranty | null
  ): R1Result {
    const criticalFaults = faultCodes.filter(
      (f) => f.severity === 'Critical'
    );
    const hasCritical = criticalFaults.length > 0;

    let warrantyVoidRisk = false;
    let warrantyNotes: string | undefined;

    if (warranty && warranty.status === 'active') {
      if (hasCritical) {
        warrantyVoidRisk = true;
        warrantyNotes = `Avertissement Garantie (${warranty.manufacturer}): L'intervention sur panne critique (${criticalFaults[0]?.code}) doit être effectuée par un réparateur agréé avant ${warranty.expiry_date} pour préserver la couverture.`;
      }
    }

    return {
      isRedAlert: hasCritical,
      vehicleStatus: hasCritical ? 'Unsafe / Red' : 'Operational',
      emergencyDispatchRequired: hasCritical,
      removeDispatchAssignment: hasCritical,
      criticalFaults,
      warrantyVoidRisk,
      warrantyNotes,
    };
  }

  /**
   * Rule R2 (Schedule Conflict Prevention)
   * A vehicle scheduled for route departure within 3 days that has open work orders
   * triggers an operational conflict warning.
   */
  public static evalRuleR2(
    vehicle: Partial<Vehicle>,
    openWorkOrders: Partial<WorkOrder>[],
    departureDateIso?: string
  ): R2Result {
    if (!departureDateIso) {
      return { hasConflict: false, daysToDeparture: 999, openWorkOrderCount: openWorkOrders.length };
    }

    const departure = new Date(departureDateIso).getTime();
    const now = new Date().getTime();
    const diffDays = Math.ceil((departure - now) / (1000 * 3600 * 24));

    const openWOs = openWorkOrders.filter(
      (wo) => wo.status === 'Open' || wo.status === 'In Progress' || wo.status === 'Pending Parts'
    );

    const hasConflict = diffDays <= 3 && diffDays >= 0 && openWOs.length > 0;

    return {
      hasConflict,
      daysToDeparture: diffDays,
      openWorkOrderCount: openWOs.length,
      message: hasConflict
        ? `Alerte Conflit R2: Le véhicule ${vehicle.plate || vehicle.name || ''} a ${openWOs.length} ordre(s) de travail ouvert(s) et un départ prévu dans ${diffDays} jour(s).`
        : undefined,
    };
  }

  /**
   * Rule R3 (Inventory Reservation System)
   * Calculates parts reservation and purchase order triggers for Work Orders.
   */
  public static evalRuleR3ReserveParts(
    itemsToReserve: Array<{ partId: string; requestedQty: number }>,
    inventoryCatalog: InventoryItem[]
  ): R3PartReservation[] {
    return itemsToReserve.map(({ partId, requestedQty }) => {
      const item = inventoryCatalog.find((inv) => inv.id === partId || inv.sku === partId);
      const available = item ? item.quantity : 0;
      const threshold = item ? item.reorder_threshold : 0;

      const reservedQty = Math.min(requestedQty, available);
      const remainingAfterReservation = available - reservedQty;
      const needsPurchaseOrder = remainingAfterReservation <= threshold;

      return {
        partId,
        partName: item?.name || partId,
        requestedQty,
        reservedQty,
        currentAvailable: available,
        needsPurchaseOrder,
        reorderThreshold: threshold,
      };
    });
  }

  /**
   * Rule R4 (Total Cost of Repair Formula)
   * Formula: Total Work Order Cost = (Labor Hours × Hourly Rate) + SUM(Part Quantity × Part Unit Cost)
   */
  public static evalRuleR4TotalCost(
    laborHours: number,
    hourlyRateDzd: number,
    parts: Array<{ partId: string; partName: string; quantity: number; unitCost: number }>
  ): R4CostBreakdown {
    const laborCost = Math.max(0, laborHours) * Math.max(0, hourlyRateDzd);

    const partsItemized = parts.map((p) => {
      const subtotal = Math.max(0, p.quantity) * Math.max(0, p.unitCost);
      return {
        ...p,
        subtotal,
      };
    });

    const partsTotalCost = partsItemized.reduce((sum, p) => sum + p.subtotal, 0);
    const totalWorkOrderCost = laborCost + partsTotalCost;

    return {
      laborCost,
      partsTotalCost,
      totalWorkOrderCost,
      partsItemized,
    };
  }

  /**
   * Rule R5 (CAE Budget Prioritization Metric)
   * Priority Score = (Critical Severity Factor × 40%) + (Days Until Route Factor × 30%) + (ROI / Cost Ratio × 30%)
   * Scaled to a 0 - 100 score.
   */
  public static evalRuleR5PriorityScore(input: R5PrioritizationInput): R5PrioritizationResult {
    // 1. Critical Severity Factor (0 to 10) mapped to 0-40 points
    const severityFactor = Math.min(10, Math.max(0, input.criticalSeverityFactor));
    const criticalScoreComponent = (severityFactor / 10) * 40;

    // 2. Days Until Route Factor (closer departure = higher priority, 1 day = 30 pts, 30 days = 1 pt)
    const days = Math.max(1, input.daysUntilRoute);
    const daysFactor = Math.max(0, (30 - Math.min(30, days)) / 29);
    const daysScoreComponent = daysFactor * 30;

    // 3. ROI / Cost Ratio Factor (higher ratio = higher priority)
    const roiRatio = Math.min(5, Math.max(0, input.roiCostRatio));
    const roiScoreComponent = (roiRatio / 5) * 30;

    const priorityScore = Math.round((criticalScoreComponent + daysScoreComponent + roiScoreComponent) * 10) / 10;

    let recommendationLevel: R5PrioritizationResult['recommendationLevel'] = 'LOW_PRIORITY';
    if (priorityScore >= 75) recommendationLevel = 'URGENT_DISPATCH';
    else if (priorityScore >= 55) recommendationLevel = 'HIGH_PRIORITY';
    else if (priorityScore >= 35) recommendationLevel = 'MEDIUM_PRIORITY';

    return {
      priorityScore,
      criticalScoreComponent: Math.round(criticalScoreComponent * 10) / 10,
      daysScoreComponent: Math.round(daysScoreComponent * 10) / 10,
      roiScoreComponent: Math.round(roiScoreComponent * 10) / 10,
      recommendationLevel,
    };
  }

  /**
   * Rule R6 (Telemetry Reconciliation / Driver Incident Audit)
   * Any driver-reported incident without a matching electronic OBD-II fault code within +/- 24h
   * automatically generates an R6 Investigation Work Order.
   */
  public static evalRuleR6IncidentAudit(
    incident: Partial<Incident>,
    electronicFaults: ActiveFaultCode[]
  ): R6AuditResult {
    const hasMatchingElectronicFault = electronicFaults.some((fault) => {
      // Check if fault relates to incident category or system
      if (!incident.category) return false;
      return (
        fault.code.toLowerCase().includes(incident.category.toLowerCase()) ||
        fault.name.toLowerCase().includes(incident.category.toLowerCase())
      );
    });

    const requiresR6 = !hasMatchingElectronicFault;

    return {
      requiresR6InvestigationWO: requiresR6,
      reason: requiresR6
        ? `R6 Audit Violation: Incident signalé par le chauffeur (${incident.category || 'Inconnu'}) sans code d'erreur OBD-II électronique correspondant. Inspection mécanique physique obligatoire.`
        : 'Incident concordant avec la télématique OBD-II.',
      suggestedWorkOrderType: 'R6 Investigation Mechanical Audit',
      driverIncidentId: incident.id || 'INC-UNKNOWN',
    };
  }

  /**
   * Rule R7 (Strategic Fleet Health Variance Analysis)
   * Compare actual maintenance expenditure against projected budget. Variance > 10% triggers audit flag.
   */
  public static evalRuleR7BudgetVariance(
    actualSpend: number,
    projectedBudget: number,
    category: R7CategoryVariance['category'] = 'General'
  ): R7CategoryVariance {
    if (projectedBudget <= 0) {
      return {
        category,
        actualSpend,
        projectedBudget,
        variancePercentage: 0,
        triggerAuditFlag: actualSpend > 0,
      };
    }

    const variancePercentage = Math.round(((actualSpend - projectedBudget) / projectedBudget) * 1000) / 10;
    const triggerAuditFlag = Math.abs(variancePercentage) > 10.0;

    return {
      category,
      actualSpend,
      projectedBudget,
      variancePercentage,
      triggerAuditFlag,
    };
  }
}
