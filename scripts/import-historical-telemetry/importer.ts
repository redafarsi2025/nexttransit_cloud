import fs from 'fs';
import path from 'path';
import { translateJ1939ToActiveFault } from '../../src/services/j1939MappingService';
import { ActiveFaultCode, Position } from '../../src/types';

export interface TelemetryImportRow {
  timestamp: string;
  vehicle_id: string;
  external_device_id?: string;
  latitude?: number;
  longitude?: number;
  speed_kmh?: number;
  heading_deg?: number;
  spn?: number;
  fmi?: number;
  dtc_code?: string;
  severity?: 'Critical' | 'Warning' | 'Info';
  actual_spend?: number;
  projected_budget?: number;
}

export interface ParsedBatchResult {
  validRecords: TelemetryImportRow[];
  ignoredRecords: Array<{ rowNumber: number; raw: any; reason: string }>;
}

/**
 * Parses raw JSON or CSV historical telemetry data.
 * Preserves original record timestamps and filters invalid / corrupt rows.
 */
export function parseHistoricalTelemetryFile(filePath: string): ParsedBatchResult {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Telemetry import file not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  const ext = path.extname(absolutePath).toLowerCase();

  const validRecords: TelemetryImportRow[] = [];
  const ignoredRecords: Array<{ rowNumber: number; raw: any; reason: string }> = [];

  if (ext === '.json') {
    let rawItems: any[];
    try {
      rawItems = JSON.parse(content);
      if (!Array.isArray(rawItems)) rawItems = [rawItems];
    } catch (e: any) {
      throw new Error(`Failed to parse JSON telemetry file: ${e.message}`);
    }

    rawItems.forEach((raw, idx) => {
      const validation = validateTelemetryRow(raw);
      if (validation.isValid && validation.row) {
        validRecords.push(validation.row);
      } else {
        ignoredRecords.push({ rowNumber: idx + 1, raw, reason: validation.reason || 'Invalid format' });
      }
    });
  } else if (ext === '.csv') {
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { validRecords: [], ignoredRecords: [] };

    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const raw: Record<string, any> = {};
      header.forEach((h, colIdx) => {
        raw[h] = values[colIdx];
      });

      const validation = validateTelemetryRow(raw);
      if (validation.isValid && validation.row) {
        validRecords.push(validation.row);
      } else {
        ignoredRecords.push({ rowNumber: i + 1, raw, reason: validation.reason || 'Invalid format' });
      }
    }
  } else {
    throw new Error(`Unsupported file extension '${ext}'. Supported extensions for V1: .csv, .json`);
  }

  return { validRecords, ignoredRecords };
}

function validateTelemetryRow(raw: any): { isValid: boolean; row?: TelemetryImportRow; reason?: string } {
  if (!raw || typeof raw !== 'object') {
    return { isValid: false, reason: 'Row is not an object' };
  }

  const rawTimestamp = raw.timestamp || raw.logged_at || raw.date;
  if (!rawTimestamp) {
    return { isValid: false, reason: 'Missing timestamp' };
  }

  // Verify valid ISO or Epoch timestamp
  let parsedDate: Date;
  if (typeof rawTimestamp === 'number') {
    parsedDate = new Date(rawTimestamp > 1e11 ? rawTimestamp : rawTimestamp * 1000);
  } else {
    parsedDate = new Date(String(rawTimestamp));
  }

  if (isNaN(parsedDate.getTime())) {
    return { isValid: false, reason: `Invalid date format: ${rawTimestamp}` };
  }

  const vehicleId = String(raw.vehicle_id || raw.vehicle || raw.unit_id || raw.external_device_id || '').trim();
  if (!vehicleId) {
    return { isValid: false, reason: 'Missing vehicle_id or device identifier' };
  }

  const lat = raw.latitude !== undefined && raw.latitude !== '' ? Number(raw.latitude) : undefined;
  const lng = raw.longitude !== undefined && raw.longitude !== '' ? Number(raw.longitude) : undefined;
  const speed = raw.speed_kmh !== undefined && raw.speed_kmh !== '' ? Number(raw.speed_kmh) : raw.speed !== undefined ? Number(raw.speed) : undefined;

  if (speed !== undefined && (isNaN(speed) || speed < 0 || speed > 250)) {
    return { isValid: false, reason: `Speed out of plausible physical range: ${speed}` };
  }

  const spn = raw.spn !== undefined && raw.spn !== '' ? Number(raw.spn) : undefined;
  const fmi = raw.fmi !== undefined && raw.fmi !== '' ? Number(raw.fmi) : undefined;

  return {
    isValid: true,
    row: {
      timestamp: parsedDate.toISOString(),
      vehicle_id: vehicleId,
      external_device_id: raw.external_device_id ? String(raw.external_device_id) : undefined,
      latitude: lat,
      longitude: lng,
      speed_kmh: speed,
      heading_deg: raw.heading_deg !== undefined ? Number(raw.heading_deg) : undefined,
      spn: spn !== undefined && !isNaN(spn) ? spn : undefined,
      fmi: fmi !== undefined && !isNaN(fmi) ? fmi : undefined,
      dtc_code: raw.dtc_code ? String(raw.dtc_code) : raw.dtc ? String(raw.dtc) : undefined,
      severity: raw.severity ? raw.severity : undefined,
      actual_spend: raw.actual_spend !== undefined && raw.actual_spend !== '' ? Number(raw.actual_spend) : undefined,
      projected_budget: raw.projected_budget !== undefined && raw.projected_budget !== '' ? Number(raw.projected_budget) : undefined,
    },
  };
}
