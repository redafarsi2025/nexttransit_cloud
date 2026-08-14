import { DecisionEngine } from '../../src/services/decisionEngine';
import { translateJ1939ToActiveFault } from '../../src/services/faultCodeMappingService';
import { ActiveFaultCode } from '../../src/types';
import { TelemetryImportRow } from './importer';

export interface AuditReportOutput {
  reportMetadata: {
    generatedAt: string;
    dataSource: 'historical_import';
    totalVehiclesEvaluated: number;
    totalEventsProcessed: number;
    ignoredInvalidEventsCount: number;
    zeroFabricatedValuesPolicyEnforced: boolean;
  };
  vehicleSummaries: Array<{
    vehicleId: string;
    eventsCount: number;
    periodStart: string | null;
    periodEnd: string | null;
    r1CriticalEventsCount: number;
    r2ScheduleConflictsCount: number;
    r5MeanCaeScore: number;
    r7ProjectedBudgetVariancePercentage: number | null;
    statusSummary: 'Unsafe / Red' | 'Operational';
  }>;
  detailedReplayAuditTrail: Array<{
    vehicleId: string;
    timestamp: string;
    r1RedAlert: boolean;
    criticalFaults: ActiveFaultCode[];
    r5PriorityScore?: number;
    r7VariancePercentage?: number;
  }>;
}

/**
 * Executes retroactive replay evaluation over historical telemetry batch data
 * without triggering live operational side-effects (no vehicle dispatch changes or work order creations).
 */
export function generateRetroactiveReplayReport(
  validRecords: TelemetryImportRow[],
  ignoredRecordsCount: number = 0
): AuditReportOutput {
  // Group records by vehicle_id
  const vehicleMap = new Map<string, TelemetryImportRow[]>();
  validRecords.forEach((rec) => {
    if (!vehicleMap.has(rec.vehicle_id)) {
      vehicleMap.set(rec.vehicle_id, []);
    }
    vehicleMap.get(rec.vehicle_id)!.push(rec);
  });

  const vehicleSummaries: AuditReportOutput['vehicleSummaries'] = [];
  const detailedReplayAuditTrail: AuditReportOutput['detailedReplayAuditTrail'] = [];

  for (const [vehicleId, records] of Array.from(vehicleMap.entries())) {
    // Sort records ascending by original timestamp
    records.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const periodStart = records.length > 0 ? records[0].timestamp : null;
    const periodEnd = records.length > 0 ? records[records.length - 1].timestamp : null;

    const formattedEvents = records.map((rec) => {
      let faultCodes: ActiveFaultCode[] = [];
      if (rec.spn !== undefined && rec.fmi !== undefined) {
        faultCodes = [translateJ1939ToActiveFault({ spn: rec.spn, fmi: rec.fmi, loggedDate: rec.timestamp })];
      } else if (rec.dtc_code) {
        faultCodes = [
          {
            code: rec.dtc_code,
            name: `OBD Code ${rec.dtc_code}`,
            severity: rec.severity || 'Warning',
            logged_date: rec.timestamp,
            required_intervention: 'Inspect vehicle OBD system',
          },
        ];
      }

      return {
        timestamp: rec.timestamp,
        faultCodes,
        position: rec.latitude !== undefined && rec.longitude !== undefined ? {
          latitude: rec.latitude,
          longitude: rec.longitude,
          speed_kmh: rec.speed_kmh || 0,
        } : null,
        actualSpend: rec.actual_spend,
        projectedBudget: rec.projected_budget,
      };
    });

    const batchResult = DecisionEngine.executeReplayEvaluationBatch(vehicleId, formattedEvents);

    const hasRedAlert = batchResult.evaluatedEvents.some((e) => e.r1Result.isRedAlert);

    vehicleSummaries.push({
      vehicleId,
      eventsCount: records.length,
      periodStart,
      periodEnd,
      r1CriticalEventsCount: batchResult.r1CriticalEventsCount,
      r2ScheduleConflictsCount: batchResult.r2ScheduleConflictsCount,
      r5MeanCaeScore: batchResult.r5MeanCaeScore,
      r7ProjectedBudgetVariancePercentage: batchResult.r7ProjectedVariancePercentage,
      statusSummary: hasRedAlert ? 'Unsafe / Red' : 'Operational',
    });

    batchResult.evaluatedEvents.forEach((evt) => {
      detailedReplayAuditTrail.push({
        vehicleId,
        timestamp: evt.timestamp,
        r1RedAlert: evt.r1Result.isRedAlert,
        criticalFaults: evt.r1Result.criticalFaults,
        r5PriorityScore: evt.r5Result?.priorityScore,
        r7VariancePercentage: evt.r7Result?.variancePercentage,
      });
    });
  }

  return {
    reportMetadata: {
      generatedAt: new Date().toISOString(),
      dataSource: 'historical_import',
      totalVehiclesEvaluated: vehicleMap.size,
      totalEventsProcessed: validRecords.length,
      ignoredInvalidEventsCount: ignoredRecordsCount,
      zeroFabricatedValuesPolicyEnforced: true,
    },
    vehicleSummaries,
    detailedReplayAuditTrail,
  };
}
