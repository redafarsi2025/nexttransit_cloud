import React, { useState } from 'react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useLocalization } from '../../context/LocalizationContext';
import { recordAudit } from '../../services/auditService';
import { KPIBadge } from '../common/KPIBadge';
import {
  Calculator,
  Sliders,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Info,
  ChevronRight,
} from 'lucide-react';

export const CaeBudgetPrioritization: React.FC = () => {
  const { caeItems, caeAvailableBudget, setCaeAvailableBudget, caeDelayMultipliers, updateCaeDelayMultiplier, createWorkOrder } = useFleet();
  const { changeScreen } = useAuth();
  const { t } = useLocalization();

  const [isApprovedMessage, setIsApprovedMessage] = useState<boolean>(false);

  // Compute cumulative costs and approval status
  let runningCost = 0;
  const itemsWithCumulative = caeItems.map((item) => {
    runningCost += item.repair_cost;
    const isWithinBudget = runningCost <= caeAvailableBudget;
    return {
      ...item,
      cumulativeCost: runningCost,
      isWithinBudget,
    };
  });

  const approvedCount = itemsWithCumulative.filter((i) => i.isWithinBudget).length;
  const deferredCount = itemsWithCumulative.filter((i) => !i.isWithinBudget).length;
  const totalRepairDemand = caeItems.reduce((sum, i) => sum + i.repair_cost, 0);

  const handleApproveAllocation = () => {
    const approvedItems = itemsWithCumulative.filter((item) => item.isWithinBudget);

    // Generate work orders for approved items
    approvedItems.forEach((item) => {
      createWorkOrder({
        vehicle_id: item.vehicle_id,
        type: 'Corrective',
        parts_used: [],
        labor_hours: 6,
        hourly_rate: 140,
        before_notes: `CAE Approved Corrective Repair for ${item.fault_code} (${item.fault_name}). Rank Score: ${item.rank_score}.`,
        assigned_mechanic_id: 'M-01',
        assigned_mechanic_name: 'David Thorne (Workshop Technician)',
        related_fault_code: item.fault_code,
      });
    });

    // Record audit log entry for CAE budget allocation decision
    recordAudit(
      'cae_budget',
      `CAE-ALLOC-${Date.now()}`,
      'APPROVAL',
      {
        total_demand: totalRepairDemand,
        available_budget: caeAvailableBudget,
        approved_count: approvedCount,
        deferred_count: deferredCount,
      },
      {
        approved_items_count: approvedItems.length,
        approved_total_cost: runningCost,
        status: 'APPROVED_BY_DIRECTOR',
      },
      'usr-director-01',
      'DIRECTOR'
    );

    setIsApprovedMessage(true);
    setTimeout(() => setIsApprovedMessage(false), 4000);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Calculator className="h-4 w-4" /> {t('cae.header_tag', {}, 'CAE Budget Optimization (Rule R5)')}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t('cae.header_title', {}, 'CAE Repair Prioritization Matrix')}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {t('cae.header_desc', {}, 'R5 Score = (Severity × 40%) + (Days to Route × 30%) + (ROI/Cost Ratio × 30%) to rank repairs.')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <KPIBadge
            type="Statistical estimate"
            formula="Rank = (Deferral Cost / Repair Cost) * Classification Weight * Failure Likelihood"
          />
        </div>
      </div>

      {/* Formula Explanation Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <ShieldAlert className="h-4 w-4" /> Disclosed Rule R7 Prioritization Formula Breakdown
          </div>
          <span className="text-[11px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg font-mono border border-slate-700">
            No Invented Text — Fully Traceable
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1">
            <div className="font-bold text-white flex items-center justify-between">
              <span>Repair Cost</span>
              <KPIBadge type="Calculated" formula="Parts + Labor" />
            </div>
            <p className="text-[11px] text-slate-400">Direct work order cost to execute immediate intervention.</p>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1">
            <div className="font-bold text-amber-400 flex items-center justify-between">
              <span>Deferral Cost</span>
              <KPIBadge type="Statistical estimate" formula="Repair * Delay Mult" />
            </div>
            <p className="text-[11px] text-slate-400">Statistical financial risk if repair is delayed 30 days.</p>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1">
            <div className="font-bold text-indigo-400 flex items-center justify-between">
              <span>Class Weight</span>
              <KPIBadge type="Configured" formula="Keystone 1.5, Std 1.0" />
            </div>
            <p className="text-[11px] text-slate-400">Strategic route importance tag assigned by management.</p>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1">
            <div className="font-bold text-rose-400 flex items-center justify-between">
              <span>Failure Likelihood</span>
              <KPIBadge type="Statistical estimate" formula="Fault Tier Lookup" />
            </div>
            <p className="text-[11px] text-slate-400">Critical = 0.85, Warning = 0.45, Info = 0.25 likelihood.</p>
          </div>
        </div>
      </div>

      {/* Interactive Parameters Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="h-4 w-4 text-indigo-600" />
            Interactive Sensitivity Parameters
          </h3>
          <span className="text-xs text-slate-500 font-medium">Adjust values to recalculate rank scores</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          {/* Budget Slider */}
          <div className="space-y-2">
            <div className="flex justify-between font-bold text-slate-800">
              <span>Available Maintenance Budget:</span>
              <span className="text-indigo-600 font-black">${caeAvailableBudget.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="1000"
              max="15000"
              step="500"
              value={caeAvailableBudget}
              onChange={(e) => setCaeAvailableBudget(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>$1,000</span>
              <span>$15,000 Cap</span>
            </div>
          </div>

          {/* Keystone Delay Multiplier */}
          <div className="space-y-2">
            <div className="flex justify-between font-bold text-slate-800">
              <span>Keystone Delay Multiplier:</span>
              <span className="text-amber-600 font-black">{caeDelayMultipliers.Keystone}x</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="3.5"
              step="0.1"
              value={caeDelayMultipliers.Keystone}
              onChange={(e) => updateCaeDelayMultiplier('Keystone', Number(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>1.0x (Standard)</span>
              <span>3.5x (High Impact)</span>
            </div>
          </div>

          {/* Standard Delay Multiplier */}
          <div className="space-y-2">
            <div className="flex justify-between font-bold text-slate-800">
              <span>Standard Delay Multiplier:</span>
              <span className="text-slate-700 font-black">{caeDelayMultipliers.Standard}x</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="2.5"
              step="0.1"
              value={caeDelayMultipliers.Standard}
              onChange={(e) => updateCaeDelayMultiplier('Standard', Number(e.target.value))}
              className="w-full accent-slate-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>1.0x</span>
              <span>2.5x</span>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Summary & Approval Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-6 text-xs">
          <div>
            <span className="text-slate-400 font-bold uppercase block text-[10px]">Total Repair Backlog Demand</span>
            <span className="text-xl font-black text-slate-900">${totalRepairDemand.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase block text-[10px]">Approved Items</span>
            <span className="text-xl font-black text-emerald-600">{approvedCount} Repairs (${itemsWithCumulative.filter(i => i.isWithinBudget).reduce((s, i) => s + i.repair_cost, 0).toLocaleString()})</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase block text-[10px]">Deferred Risks</span>
            <span className="text-xl font-black text-amber-600">{deferredCount} Repairs</span>
          </div>
        </div>

        <button
          onClick={handleApproveAllocation}
          className="px-5 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 shadow-xs transition cursor-pointer flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Authorize Approved Repairs</span>
        </button>
      </div>

      {isApprovedMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          Work orders created for all {approvedCount} approved high-rank repairs!
        </div>
      )}

      {/* Ranked Repair List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
        <h3 className="text-base font-bold text-slate-900">
          Rank-Ordered Repairs (Sorted by Rank Score Descending)
        </h3>

        <div className="space-y-3">
          {itemsWithCumulative.map((item, idx) => (
            <div
              key={item.vehicle_id}
              className={`p-4 rounded-xl border transition space-y-3 ${
                item.isWithinBudget
                  ? 'bg-white border-emerald-200 hover:border-emerald-400'
                  : 'bg-amber-50/40 border-amber-200 hover:border-amber-400'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white font-black text-xs">
                    #{idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{item.vehicle_name}</span>
                      <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {item.vehicle_plate}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          item.classification === 'Keystone'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.classification} (Weight {item.classification_weight}x)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Fault Code: <span className="font-mono font-bold text-slate-800">{item.fault_code}</span> - {item.fault_name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">CAE Rank Score</div>
                    <div className="text-lg font-black text-indigo-600">{item.rank_score}</div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      item.isWithinBudget
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.isWithinBudget ? 'Approved (In Budget)' : 'Deferred Risk'}
                  </span>
                </div>
              </div>

              {/* Math breakdown row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Repair Cost</span>
                  <span className="font-bold text-slate-900">${item.repair_cost.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Deferral Risk Cost</span>
                  <span className="font-bold text-amber-600">${item.deferral_cost.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Failure Likelihood</span>
                  <span className="font-bold text-slate-800">{(item.failure_likelihood * 100).toFixed(0)}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Cumulative Total</span>
                  <span className={`font-bold ${item.isWithinBudget ? 'text-emerald-700' : 'text-rose-600'}`}>
                    ${item.cumulativeCost.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
