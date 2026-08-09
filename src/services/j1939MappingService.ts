import { ActiveFaultCode, SeverityTier } from '../types';

export interface J1939FaultCodeInput {
  spn: number;
  fmi: number;
  occurrenceCount?: number;
  loggedDate?: string;
}

interface KnownSPNMapping {
  spn: number;
  name: string;
  fmiMappings: Record<
    number,
    {
      code: string;
      description: string;
      severity: SeverityTier;
      requiredIntervention: string;
    }
  >;
}

const SAE_J1939_DICTIONARY: Record<number, KnownSPNMapping> = {
  // SPN 110: Engine Coolant Temperature
  110: {
    spn: 110,
    name: 'Engine Coolant Temperature',
    fmiMappings: {
      0: {
        code: 'P0217',
        description: 'Engine Coolant Overheat Condition (LDR > 105°C)',
        severity: 'Critical',
        requiredIntervention: 'Immediate engine shutdown and coolant circuit inspection.',
      },
      15: {
        code: 'SPN-110-FMI-15',
        description: 'Engine Coolant High Temperature Warning',
        severity: 'Warning',
        requiredIntervention: 'Inspect radiator airflow and coolant level at next stop.',
      },
      16: {
        code: 'SPN-110-FMI-16',
        description: 'Engine Coolant Moderately High Temperature',
        severity: 'Warning',
        requiredIntervention: 'Monitor coolant gauge and check fan clutch operation.',
      },
    },
  },

  // SPN 190: Engine Speed (RPM)
  190: {
    spn: 190,
    name: 'Engine Speed (RPM)',
    fmiMappings: {
      0: {
        code: 'P0219',
        description: 'Engine Overspeed Condition (Critical Over-Rev)',
        severity: 'Critical',
        requiredIntervention: 'Check engine valvetrain and ECU over-rev audit log.',
      },
    },
  },

  // SPN 100: Engine Oil Pressure
  100: {
    spn: 100,
    name: 'Engine Oil Pressure',
    fmiMappings: {
      1: {
        code: 'P0524',
        description: 'Engine Oil Pressure Extremely Low',
        severity: 'Critical',
        requiredIntervention: 'Immediate engine shutdown; check oil level and pump.',
      },
      18: {
        code: 'SPN-100-FMI-18',
        description: 'Engine Oil Pressure Moderately Low',
        severity: 'Warning',
        requiredIntervention: 'Top up engine oil and check filter restriction indicator.',
      },
    },
  },

  // SPN 175: Engine Oil Temperature
  175: {
    spn: 175,
    name: 'Engine Oil Temperature',
    fmiMappings: {
      0: {
        code: 'SPN-175-FMI-0',
        description: 'Engine Oil Temperature Extremely High',
        severity: 'Critical',
        requiredIntervention: 'Reduce load, inspect oil cooler and thermal valve.',
      },
    },
  },

  // SPN 84: Wheel-Based Vehicle Speed
  84: {
    spn: 84,
    name: 'Wheel-Based Vehicle Speed',
    fmiMappings: {
      9: {
        code: 'SPN-84-FMI-9',
        description: 'Vehicle Speed Sensor Abnormal Update Rate',
        severity: 'Warning',
        requiredIntervention: 'Inspect tachograph signal wire and wheel speed sensor connector.',
      },
    },
  },

  // SPN 91: Accelerator Pedal Position
  91: {
    spn: 91,
    name: 'Accelerator Pedal Position',
    fmiMappings: {
      3: {
        code: 'SPN-91-FMI-3',
        description: 'Accelerator Pedal Voltage Above Normal',
        severity: 'Warning',
        requiredIntervention: 'Check pedal position sensor harness and 5V reference voltage.',
      },
    },
  },
};

/**
 * Translates a J1939 SPN/FMI pair into a standardized ActiveFaultCode object.
 * If the SPN/FMI pair is unrecognized, returns an ActiveFaultCode with severity 'Unknown'.
 */
export function translateJ1939ToActiveFault(input: J1939FaultCodeInput): ActiveFaultCode {
  const loggedDate = input.loggedDate || new Date().toISOString();
  const spnData = SAE_J1939_DICTIONARY[input.spn];

  if (spnData) {
    const fmiData = spnData.fmiMappings[input.fmi];
    if (fmiData) {
      return {
        code: fmiData.code,
        name: `${spnData.name} (${fmiData.description})`,
        severity: fmiData.severity,
        logged_date: loggedDate,
        required_intervention: fmiData.requiredIntervention,
      };
    }
  }

  // Fallback for unrecognized J1939 codes: severity marked as 'Unknown'
  return {
    code: `SPN-${input.spn}-FMI-${input.fmi}`,
    name: `J1939 Fault SPN ${input.spn} FMI ${input.fmi}`,
    severity: 'Unknown' as SeverityTier,
    logged_date: loggedDate,
    required_intervention: 'Inspect vehicle CAN-bus diagnostics and manufacturer manual.',
  };
}
