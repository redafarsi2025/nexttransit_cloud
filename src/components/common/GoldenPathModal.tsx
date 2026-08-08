import React from 'react';
import { useFleet } from '../../context/FleetContext';
import {
  Play,
  CheckCircle2,
  RotateCcw,
  Wrench,
  AlertTriangle,
  UserCheck,
  Package,
  BarChart3,
  TrendingUp,
  Truck,
  ArrowRight,
  X,
  Sparkles,
} from 'lucide-react';

interface GoldenPathModalProps {
  onClose: () => void;
}

export const GoldenPathModal: React.FC<GoldenPathModalProps> = ({ onClose }) => {
  const {
    goldenPathAStatus,
    goldenPathBStatus,
    triggerGoldenPathAStep,
    triggerGoldenPathBStep,
    resetSeedData,
  } = useFleet();

  const stepsA = [
    {
      step: 1,
      role: 'MECHANIC',
      roleName: 'Mechanic',
      icon: Wrench,
      title: 'Mechanic logs OBD fault P0299 on V-024',
      description:
        'OBD scanner connected to Vehicle 024 (Keystone Express Coach). Logs Critical Fault P0299 (Turbo Boost Sensor Low).',
    },
    {
      step: 2,
      role: 'FLEET_MANAGER',
      roleName: 'Fleet Manager',
      icon: AlertTriangle,
      title: 'R1 fires & R4 Conflict Alert generated',
      description:
        'V-024 status updates to Critical. R3 links required part TURBO-SENS-01. R4 warns Fleet Manager of departure scheduled in 2 days.',
    },
    {
      step: 3,
      role: 'TECHNICAL_CONTROLLER',
      roleName: 'Technical Controller',
      icon: UserCheck,
      title: 'Technical Controller creates Work Order',
      description:
        'Creates Work Order for V-024 Turbo Sensor replacement assigned to Workshop Technician.',
    },
    {
      step: 4,
      role: 'LOGISTICS_CONTROLLER',
      roleName: 'Logistics Controller',
      icon: Package,
      title: 'Logistics Controller sees stock consumed & R3 low stock',
      description:
        'Part TURBO-SENS-01 drops from 2 to 1 unit, reaching reorder threshold. R3 & R5 alerts update.',
    },
    {
      step: 5,
      role: 'MGMT_CONTROLLER',
      roleName: 'Management Controller',
      icon: BarChart3,
      title: 'Management Controller inspects Cost Variance',
      description:
        'Parts & Consumables category variance increases with direct drill-down link to Work Order and Part record.',
    },
    {
      step: 6,
      role: 'DIRECTOR',
      roleName: 'Director',
      icon: TrendingUp,
      title: 'Director sees updated KPIs in real time',
      description:
        'Strategic Dashboard reflects Total Fleet Cost, Critical Vehicle count, and Cost per km without invented text.',
    },
  ];

  const stepsB = [
    {
      step: 1,
      role: 'DRIVER',
      roleName: 'Driver',
      icon: Truck,
      title: 'Driver reports noise issue with no matching OBD fault',
      description:
        'Driver Mohamed Farsi (V-018 Custom Transit) reports metallic clicking noise. R6 creates Investigation status.',
    },
    {
      step: 2,
      role: 'TECHNICAL_CONTROLLER',
      roleName: 'Technical Controller',
      icon: AlertTriangle,
      title: 'R6 Investigation Alert triggers side-by-side view',
      description:
        'Technical Controller & Fleet Manager see driver report side-by-side with telematics snapshot.',
    },
    {
      step: 3,
      role: 'MECHANIC',
      roleName: 'Mechanic',
      icon: Wrench,
      title: 'Mechanic performs on-site OBD check & logs C0035',
      description:
        'Discovers front wheel speed sensor fault C0035. Links fault to incident and continues into Work Order flow.',
    },
    {
      step: 4,
      role: 'TECHNICAL_CONTROLLER',
      roleName: 'Technical Controller',
      icon: UserCheck,
      title: 'Continues into Golden Path A (Work Order creation)',
      description:
        'Creates Work Order for wheel speed sensor replacement, linking data across all 7 views.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-500/20 p-2 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Interactive Golden Path Scenarios</h3>
              <p className="text-xs text-slate-300">
                Test multi-role end-to-end data propagation across all 7 RBAC views
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                resetSeedData();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Seed Data</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto">
          {/* Golden Path A */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800 border border-indigo-200">
                  Golden Path A (Machine-Originated)
                </span>
                <h4 className="mt-1.5 text-lg font-bold text-slate-900">
                  OBD Fault → R1/R3/R4 Alert → Work Order → Inventory → Variance → Strategy
                </h4>
              </div>

              <button
                onClick={() => {
                  const nextStep = goldenPathAStatus.currentStep < 6 ? goldenPathAStatus.currentStep + 1 : 1;
                  triggerGoldenPathAStep(nextStep);
                  onClose();
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 cursor-pointer"
              >
                <Play className="h-4 w-4" />
                <span>
                  {goldenPathAStatus.currentStep === 0
                    ? 'Start Golden Path A (Step 1)'
                    : goldenPathAStatus.currentStep < 6
                    ? `Run Next Step (${goldenPathAStatus.currentStep + 1}/6)`
                    : 'Restart Path A (Step 1)'}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {stepsA.map((item) => {
                const isCurrent = goldenPathAStatus.currentStep === item.step;
                const isDone = goldenPathAStatus.currentStep > item.step;
                const Icon = item.icon;

                return (
                  <div
                    key={item.step}
                    onClick={() => {
                      triggerGoldenPathAStep(item.step);
                      onClose();
                    }}
                    className={`rounded-xl border p-3.5 transition cursor-pointer ${
                      isCurrent
                        ? 'border-indigo-600 bg-white ring-2 ring-indigo-500/20 shadow-md'
                        : isDone
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Step {item.step} • {item.roleName}
                      </span>
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Icon className="h-4 w-4 text-indigo-600" />
                      )}
                    </div>
                    <h5 className="font-bold text-slate-900 text-xs">{item.title}</h5>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">{item.description}</p>
                    <div className="mt-2.5 flex items-center justify-end text-xs font-semibold text-indigo-600">
                      <span>Jump to Step</span>
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Golden Path B */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                  Golden Path B (Human-Originated)
                </span>
                <h4 className="mt-1.5 text-lg font-bold text-slate-900">
                  Driver Report → R6 Investigation → Mechanic OBD Scan → Work Order Flow
                </h4>
              </div>

              <button
                onClick={() => {
                  const nextStep = goldenPathBStatus.currentStep < 4 ? goldenPathBStatus.currentStep + 1 : 1;
                  triggerGoldenPathBStep(nextStep);
                  onClose();
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 cursor-pointer"
              >
                <Play className="h-4 w-4" />
                <span>
                  {goldenPathBStatus.currentStep === 0
                    ? 'Start Golden Path B (Step 1)'
                    : goldenPathBStatus.currentStep < 4
                    ? `Run Next Step (${goldenPathBStatus.currentStep + 1}/4)`
                    : 'Restart Path B (Step 1)'}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {stepsB.map((item) => {
                const isCurrent = goldenPathBStatus.currentStep === item.step;
                const isDone = goldenPathBStatus.currentStep > item.step;
                const Icon = item.icon;

                return (
                  <div
                    key={item.step}
                    onClick={() => {
                      triggerGoldenPathBStep(item.step);
                      onClose();
                    }}
                    className={`rounded-xl border p-3.5 transition cursor-pointer ${
                      isCurrent
                        ? 'border-amber-600 bg-white ring-2 ring-amber-500/20 shadow-md'
                        : isDone
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Step {item.step} • {item.roleName}
                      </span>
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Icon className="h-4 w-4 text-amber-600" />
                      )}
                    </div>
                    <h5 className="font-bold text-slate-900 text-xs">{item.title}</h5>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">{item.description}</p>
                    <div className="mt-2.5 flex items-center justify-end text-xs font-semibold text-amber-600">
                      <span>Jump to Step</span>
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-600">
            Click any step to switch role and view data propagation instantly.
          </span>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800 cursor-pointer"
          >
            Close Scenarios
          </button>
        </div>
      </div>
    </div>
  );
};
