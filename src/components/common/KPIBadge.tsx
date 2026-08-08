import React, { useState } from 'react';
import { KPILabelType } from '../../types';
import { Calculator, Sparkles, Sliders, Info, X } from 'lucide-react';

interface KPIBadgeProps {
  type: KPILabelType;
  formula?: string;
  source?: string;
  size?: 'sm' | 'md';
}

export const KPIBadge: React.FC<KPIBadgeProps> = ({ type, formula, source, size = 'sm' }) => {
  const [showModal, setShowModal] = useState(false);

  const config = {
    Calculated: {
      label: 'Calculated',
      icon: Calculator,
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100',
      description: 'Direct mathematical computation from real operational or financial records.',
      defaultFormula: 'Exact sum or arithmetic ratio of underlying source records (no hidden heuristics).',
    },
    'Statistical estimate': {
      label: 'Statistical estimate',
      icon: Sparkles,
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
      description: 'Disclosed statistical assumption or lookup formula. Not a machine learning prediction.',
      defaultFormula: 'Formula: repair_cost × delay_multiplier (or disclosed lookup tier from severity).',
    },
    Configured: {
      label: 'Configured',
      icon: Sliders,
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
      description: 'Manual parameter set by Fleet Operations or Financial Controllers.',
      defaultFormula: 'Explicit manual tag or threshold (e.g. Keystone=1.5, Standard=1.0).',
    },
  }[type];

  const Icon = config.icon;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowModal(true);
        }}
        title={`Click for traceability: ${config.label}`}
        className={`inline-flex items-center gap-1 rounded border font-medium transition-colors cursor-pointer ${
          size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm'
        } ${config.badgeClass}`}
      >
        <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        <span>{config.label}</span>
        <Info className="h-2.5 w-2.5 opacity-60 ml-0.5" />
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
          onClick={(e) => {
            e.stopPropagation();
            setShowModal(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-slate-700" />
                <h4 className="font-semibold text-slate-900 text-base">Traceability & Formula Disclosure</h4>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Metric Type</span>
                <p className="mt-1 font-medium text-slate-900">{config.label}</p>
                <p className="text-slate-600 text-xs mt-0.5">{config.description}</p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Disclosed Formula / Math</span>
                <p className="mt-1 font-mono text-xs text-slate-800 break-words">
                  {formula || config.defaultFormula}
                </p>
              </div>

              {source && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Data Source</span>
                  <p className="mt-1 text-xs text-slate-700">{source}</p>
                </div>
              )}

              <div className="rounded-md bg-blue-50/70 p-2.5 text-xs text-blue-800 border border-blue-100">
                <strong>NextTransit Governance:</strong> Every number is traceable to real data or a disclosed formula — never invented insight text, never a fake AI claim.
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800 cursor-pointer"
              >
                Close Traceability
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
