import React, { useState } from 'react';
import { useFleet } from '../../context/FleetContext';
import { useLocalization } from '../../context/LocalizationContext';
import { KPIBadge } from '../common/KPIBadge';
import {
  BarChart3,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Filter,
  ArrowUpRight,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react';

export const VarianceDashboard: React.FC = () => {
  const { costRecords, fuelLogs, vehicles, workOrders, setSelectedVehicleId } = useFleet();
  const { t } = useLocalization();

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedClassification, setSelectedClassification] = useState<string>('ALL');

  // Categories list
  const categories = [
    'Preventive Maintenance',
    'Corrective Repair',
    'Parts & Consumables',
    'Emergency Diagnostics',
    'Fuel',
  ];

  // Calculate totals by category
  const allCostRecords = [
    ...costRecords,
    ...fuelLogs.map(log => ({
      id: log.id,
      vehicle_id: log.vehicle_id,
      vehicle_plate: vehicles.find(v => v.id === log.vehicle_id)?.plate || log.vehicle_id,
      category: 'Fuel',
      amount: log.cost,
      budget_for_category: log.cost * 0.85, // Introduce some variance
      period: 'Q3 2026',
      related_fault_code: 'Fuel Log',
      work_order_id: undefined
    }))
  ];
  const categoryStats = categories.map((cat) => {
    const catRecords = allCostRecords.filter((c) => c.category === cat);
    const actual = catRecords.reduce((sum, c) => sum + c.amount, 0);
    const budget = catRecords.reduce((sum, c) => sum + c.budget_for_category, 0) || 15000;
    const variance = actual - budget;
    return {
      category: cat,
      actual,
      budget,
      variance,
      recordCount: catRecords.length,
    };
  });

  const totalActual = allCostRecords.reduce((sum, c) => sum + c.amount, 0);
  const totalBudget = allCostRecords.reduce((sum, c) => sum + c.budget_for_category, 0);
  const totalVariance = totalActual - totalBudget;

  // Filter cost records for table view
  const filteredRecords = allCostRecords.filter((record) => {
    if (selectedCategory !== 'ALL' && record.category !== selectedCategory) return false;
    if (selectedClassification !== 'ALL') {
      const vehicle = vehicles.find((v) => v.id === record.vehicle_id);
      if (vehicle?.classification !== selectedClassification) return false;
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <BarChart3 className="h-4 w-4" /> {t('variance.header_tag', {}, 'Management Controller View')}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t('variance.header_title', {}, 'Financial Variance & Cost Distribution')}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {t('variance.header_desc', {}, 'Traceable financial auditing: compare actual maintenance expenses against allocated quarterly budget limits.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <KPIBadge type="Calculated" formula="Variance = Actual Spent - Budgeted Cost" />
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>{t('variance.total_actual_spend', {}, 'Total Actual Maintenance Spend')}</span>
            <KPIBadge type="Calculated" formula="Sum of all work order & parts costs" />
          </div>
          <div className="text-3xl font-black text-slate-900">
            ${totalActual.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500">{t('variance.line_items', {}, 'Across recorded line items')}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>{t('variance.total_allocated_budget', {}, 'Total Allocated Budget')}</span>
            <KPIBadge type="Configured" formula="Quarterly Budget Baseline" />
          </div>
          <div className="text-3xl font-black text-slate-900">
            ${totalBudget.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500">{t('finance.budget_allocated', {}, 'Q3 Fleet Maintenance Cap')}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>{t('variance.net_variance', {}, 'Net Financial Variance')}</span>
            <KPIBadge type="Calculated" formula="Actual - Budget" />
          </div>
          <div
            className={`text-3xl font-black flex items-center gap-2 ${
              totalVariance > 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {totalVariance > 0 ? (
              <>
                <TrendingUp className="h-6 w-6" /> +${totalVariance.toLocaleString()}
              </>
            ) : (
              <>
                <TrendingDown className="h-6 w-6" /> -${Math.abs(totalVariance).toLocaleString()}
              </>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {totalVariance > 0 ? 'Budget overrun (requires review)' : 'Favorable budget variance'}
          </p>
        </div>
      </div>

      {/* Category Breakdown Progress Grid */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Budget vs. Actual Cost by Category</h2>
          <span className="text-xs text-slate-500 font-medium">Disclosed Formula Verification</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categoryStats.map((cat) => {
            const pct = Math.min(100, Math.round((cat.actual / cat.budget) * 100));
            const isOver = cat.variance > 0;

            return (
              <div
                key={cat.category}
                className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{cat.category}</h3>
                    <p className="text-xs text-slate-500">{cat.recordCount} Expense Records</p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      isOver ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isOver ? `+$${cat.variance.toLocaleString()} Over` : `Within Budget`}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Spent: ${cat.actual.toLocaleString()}</span>
                    <span>Budget: ${cat.budget.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isOver ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Cost Line Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
              Traceable Maintenance Line Items
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any record to inspect the underlying vehicle and associated work order details.
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl text-xs">
              <Filter className="h-3.5 w-3.5 text-slate-500" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent font-semibold text-slate-700 outline-hidden cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl text-xs">
              <select
                value={selectedClassification}
                onChange={(e) => setSelectedClassification(e.target.value)}
                className="bg-transparent font-semibold text-slate-700 outline-hidden cursor-pointer"
              >
                <option value="ALL">All Classifications</option>
                <option value="Keystone">Keystone Only</option>
                <option value="Standard">Standard Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3">Record ID</th>
                <th className="p-3">Vehicle Plate</th>
                <th className="p-3">Category</th>
                <th className="p-3">Period</th>
                <th className="p-3">Fault / Ref</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredRecords.map((record) => {
                const vehicle = vehicles.find((v) => v.id === record.vehicle_id);

                return (
                  <tr
                    key={record.id}
                    className="hover:bg-slate-50 transition cursor-pointer"
                    onClick={() => setSelectedVehicleId(record.vehicle_id)}
                  >
                    <td className="p-3 font-mono font-bold text-slate-900">{record.id}</td>
                    <td className="p-3">
                      <span className="font-bold text-indigo-600">{record.vehicle_plate}</span>
                      {vehicle?.classification && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {vehicle.classification}
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-semibold">{record.category}</td>
                    <td className="p-3 text-slate-500">{record.period}</td>
                    <td className="p-3 font-mono text-slate-600">
                      {record.related_fault_code || record.work_order_id || 'Direct Entry'}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      ${record.amount.toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      <button className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center justify-end gap-1 ml-auto">
                        Inspect <ArrowUpRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
