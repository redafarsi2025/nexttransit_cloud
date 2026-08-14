import { ActiveFaultCode, FaultDefinition, FaultStandard, SeverityTier } from '../types';

export type { FaultDefinition };

const OBD2_STANDARD_DICTIONARY: Record<string, FaultDefinition> = {
  P0217: { code: 'P0217', standard: 'OBDII', name: 'Engine Coolant Overtemperature', description: 'Engine coolant temperature has exceeded the safe operating threshold.', system: 'Engine', standardSeverity: 'critical' },
  P0218: { code: 'P0218', standard: 'OBDII', name: 'Transmission Overtemperature', description: 'Transmission fluid temperature is dangerously high.', system: 'Transmission', standardSeverity: 'critical' },
  P0219: { code: 'P0219', standard: 'OBDII', name: 'Engine Overspeed Condition', description: 'Engine RPM has exceeded the maximum rated speed.', system: 'Engine', standardSeverity: 'critical' },
  P0520: { code: 'P0520', standard: 'OBDII', name: 'Engine Oil Pressure Sensor/Switch Circuit', description: 'Oil pressure sensor circuit malfunction detected.', system: 'Engine', standardSeverity: 'high' },
  P0521: { code: 'P0521', standard: 'OBDII', name: 'Engine Oil Pressure Sensor Range/Performance', description: 'Oil pressure sensor reading is out of expected range.', system: 'Engine', standardSeverity: 'high' },
  P0522: { code: 'P0522', standard: 'OBDII', name: 'Engine Oil Pressure Sensor Low Input', description: 'Oil pressure sensor input voltage is below acceptable range.', system: 'Engine', standardSeverity: 'high' },
  P0524: { code: 'P0524', standard: 'OBDII', name: 'Engine Oil Pressure Too Low', description: 'Actual oil pressure is critically below minimum required level.', system: 'Engine', standardSeverity: 'critical' },
  P0087: { code: 'P0087', standard: 'OBDII', name: 'Fuel Rail Pressure Too Low', description: 'Fuel rail pressure is below the specified operating range.', system: 'Fuel', standardSeverity: 'high' },
  P0088: { code: 'P0088', standard: 'OBDII', name: 'Fuel Rail Pressure Too High', description: 'Fuel rail pressure is above the maximum specified operating range.', system: 'Fuel', standardSeverity: 'critical' },
  P0089: { code: 'P0089', standard: 'OBDII', name: 'Fuel Pressure Regulator Performance', description: 'Fuel pressure regulator is not maintaining the specified pressure.', system: 'Fuel', standardSeverity: 'high' },
  P0380: { code: 'P0380', standard: 'OBDII', name: 'Glow Plug/Heater Circuit A Malfunction', description: 'Glow plug or heater circuit fault detected (diesel cold-start system).', system: 'Electrical', standardSeverity: 'medium' },
  P0381: { code: 'P0381', standard: 'OBDII', name: 'Glow Plug/Heater Indicator Circuit', description: 'Glow plug indicator lamp circuit malfunction.', system: 'Electrical', standardSeverity: 'low' },
  P0300: { code: 'P0300', standard: 'OBDII', name: 'Random/Multiple Cylinder Misfire Detected', description: 'Misfire detected across multiple or unspecified cylinders.', system: 'Engine', standardSeverity: 'high' },
  P0301: { code: 'P0301', standard: 'OBDII', name: 'Cylinder 1 Misfire', description: 'Misfire detected on cylinder 1.', system: 'Engine', standardSeverity: 'high' },
  P0302: { code: 'P0302', standard: 'OBDII', name: 'Cylinder 2 Misfire', description: 'Misfire detected on cylinder 2.', system: 'Engine', standardSeverity: 'high' },
  P0303: { code: 'P0303', standard: 'OBDII', name: 'Cylinder 3 Misfire', description: 'Misfire detected on cylinder 3.', system: 'Engine', standardSeverity: 'high' },
  P0304: { code: 'P0304', standard: 'OBDII', name: 'Cylinder 4 Misfire', description: 'Misfire detected on cylinder 4.', system: 'Engine', standardSeverity: 'high' },
  P2263: { code: 'P2263', standard: 'OBDII', name: 'Turbocharger/Supercharger Boost System Performance', description: 'Boost pressure is outside the acceptable operating range.', system: 'Engine', standardSeverity: 'high' },
  P0401: { code: 'P0401', standard: 'OBDII', name: 'EGR Flow Insufficient', description: 'EGR flow detected is lower than expected.', system: 'Exhaust', standardSeverity: 'medium' },
  P0420: { code: 'P0420', standard: 'OBDII', name: 'Catalyst System Efficiency Below Threshold (Bank 1)', description: 'Catalytic converter efficiency has fallen below minimum acceptable level.', system: 'Exhaust', standardSeverity: 'low' },
  P0571: { code: 'P0571', standard: 'OBDII', name: 'Brake Switch A Circuit', description: 'Brake pedal switch circuit malfunction.', system: 'Brakes', standardSeverity: 'medium' },
};

interface KnownSPNMapping {
  spn: number;
  name: string;
  fmiMappings: Record<number, { code: string; description: string; standardSeverity: 'critical' | 'high' | 'medium' | 'low' | 'info' }>;
}

const SAE_J1939_DICTIONARY: Record<number, KnownSPNMapping> = {
  110: { spn: 110, name: 'Engine Coolant Temperature', fmiMappings: { 0: { code: 'P0217', description: 'Engine Coolant Overheat Condition (LDR > 105C)', standardSeverity: 'critical' }, 15: { code: 'SPN-110-FMI-15', description: 'Engine Coolant High Temperature Warning', standardSeverity: 'high' }, 16: { code: 'SPN-110-FMI-16', description: 'Engine Coolant Moderately High Temperature', standardSeverity: 'medium' } } },
  190: { spn: 190, name: 'Engine Speed (RPM)', fmiMappings: { 0: { code: 'P0219', description: 'Engine Overspeed Condition (Critical Over-Rev)', standardSeverity: 'critical' } } },
  100: { spn: 100, name: 'Engine Oil Pressure', fmiMappings: { 1: { code: 'P0524', description: 'Engine Oil Pressure Extremely Low', standardSeverity: 'critical' }, 18: { code: 'SPN-100-FMI-18', description: 'Engine Oil Pressure Moderately Low', standardSeverity: 'high' } } },
  175: { spn: 175, name: 'Engine Oil Temperature', fmiMappings: { 0: { code: 'SPN-175-FMI-0', description: 'Engine Oil Temperature Extremely High', standardSeverity: 'critical' } } },
  84: { spn: 84, name: 'Wheel-Based Vehicle Speed', fmiMappings: { 9: { code: 'SPN-84-FMI-9', description: 'Vehicle Speed Sensor Abnormal Update Rate', standardSeverity: 'medium' } } },
  91: { spn: 91, name: 'Accelerator Pedal Position', fmiMappings: { 3: { code: 'SPN-91-FMI-3', description: 'Accelerator Pedal Voltage Above Normal', standardSeverity: 'medium' } } },
};

interface SeverityPolicy { severity: SeverityTier; requiredIntervention: string; }

const NEXTTRANSIT_SEVERITY_POLICY: Record<'critical' | 'high' | 'medium' | 'low' | 'info', SeverityPolicy> = {
  critical: { severity: 'Critical', requiredIntervention: 'Immediate inspection and/or shutdown required. Remove vehicle from service.' },
  high: { severity: 'Warning', requiredIntervention: 'Inspect at earliest opportunity. Monitor closely during operation.' },
  medium: { severity: 'Warning', requiredIntervention: 'Schedule inspection within current maintenance cycle.' },
  low: { severity: 'Info', requiredIntervention: 'Log for next scheduled service.' },
  info: { severity: 'Info', requiredIntervention: 'Informational - no immediate action required.' },
};

function applyPolicy(standardSeverity: 'critical' | 'high' | 'medium' | 'low' | 'info'): SeverityPolicy {
  return NEXTTRANSIT_SEVERITY_POLICY[standardSeverity];
}

export function resolveOBD2FaultCode(code: string, loggedDate?: string): ActiveFaultCode {
  const ts = loggedDate || new Date().toISOString();
  const upper = code.toUpperCase().trim();
  const definition = OBD2_STANDARD_DICTIONARY[upper];
  if (definition) {
    const policy = applyPolicy(definition.standardSeverity);
    return { code: definition.code, name: definition.name, severity: policy.severity, logged_date: ts, required_intervention: policy.requiredIntervention, standard: definition.standard };
  }
  return { code: upper, name: 'OBD-II Fault ' + upper, severity: 'Unknown' as SeverityTier, logged_date: ts, required_intervention: 'Verify code against vehicle manufacturer documentation.', standard: 'OBDII' };
}

export function resolveJ1939FaultCode(spn: number, fmi: number, loggedDate?: string): ActiveFaultCode {
  const ts = loggedDate || new Date().toISOString();
  const spnData = SAE_J1939_DICTIONARY[spn];
  if (spnData) {
    const fmiData = spnData.fmiMappings[fmi];
    if (fmiData) {
      const policy = applyPolicy(fmiData.standardSeverity);
      return { code: fmiData.code, name: spnData.name + ' (' + fmiData.description + ')', severity: policy.severity, logged_date: ts, required_intervention: policy.requiredIntervention, standard: 'J1939' };
    }
  }
  return { code: 'SPN-' + spn + '-FMI-' + fmi, name: 'J1939 Fault SPN ' + spn + ' FMI ' + fmi, severity: 'Unknown' as SeverityTier, logged_date: ts, required_intervention: 'Inspect vehicle CAN-bus diagnostics and manufacturer manual.', standard: 'J1939' };
}

export function resolveFaultCode(code: string, standard: FaultStandard, options?: { spn?: number; fmi?: number; loggedDate?: string }): ActiveFaultCode {
  const { spn, fmi, loggedDate } = options ?? {};
  switch (standard) {
    case 'OBDII':
    case 'EOBD':
      return resolveOBD2FaultCode(code, loggedDate);
    case 'J1939':
      if (spn !== undefined && fmi !== undefined) return resolveJ1939FaultCode(spn, fmi, loggedDate);
      if (OBD2_STANDARD_DICTIONARY[code.toUpperCase()]) return resolveOBD2FaultCode(code, loggedDate);
      return { code, name: 'J1939 Fault ' + code, severity: 'Unknown' as SeverityTier, logged_date: loggedDate || new Date().toISOString(), required_intervention: 'Provide SPN and FMI values for precise J1939 resolution.', standard: 'J1939' };
    case 'J1708':
    case 'UDS':
    case 'OEM':
    case 'UNKNOWN':
    default:
      return { code, name: standard + ' Fault ' + code, severity: 'Unknown' as SeverityTier, logged_date: loggedDate || new Date().toISOString(), required_intervention: 'Consult vehicle manufacturer diagnostic documentation.', standard };
  }
}

/** @deprecated Use resolveJ1939FaultCode() or resolveFaultCode(..., 'J1939', ...) instead. */
export function translateJ1939ToActiveFault(input: { spn: number; fmi: number; occurrenceCount?: number; loggedDate?: string }): ActiveFaultCode {
  return resolveJ1939FaultCode(input.spn, input.fmi, input.loggedDate);
}

/** @deprecated Use FaultStandard from '../types' instead. */
export interface J1939FaultCodeInput { spn: number; fmi: number; occurrenceCount?: number; loggedDate?: string; }
