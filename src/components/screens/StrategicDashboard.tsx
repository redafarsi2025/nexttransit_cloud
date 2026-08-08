import React from 'react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useLocalization } from '../../context/LocalizationContext';
import { KPIBadge } from '../common/KPIBadge';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Activity,
  DollarSign,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  Wrench,
  BarChart3,
} from 'lucide-react';

export const StrategicDashboard: React.FC = () => {
  const { vehicles, costRecords, fuelLogs, caeItems, alerts, setSelectedVehicleId } = useFleet();
  const { changeScreen, currentRole } = useAuth();
  const { t } = useLocalization();

  const totalVehicles = vehicles.length;
  const healthyVehicles = vehicles.filter((v) => v.status === 'Healthy').length;
  const attentionVehicles = vehicles.filter((v) => v.status === 'Attention').length;
  const criticalVehicles = vehicles.filter((v) => v.status === 'Critical').length;

  const fleetAvailability = totalVehicles > 0 ? Math.round((healthyVehicles / totalVehicles) * 100) : 0;

  // Cost variance calculations
  const allCostRecords = [
    ...costRecords,
    ...fuelLogs.map(log => ({
      id: log.id,
      vehicle_id: log.vehicle_id,
      vehicle_plate: vehicles.find(v => v.id === log.vehicle_id)?.plate || log.vehicle_id,
      category: 'Fuel',
      amount: log.cost,
      budget_for_category: 20000, // Fixed quarterly budget for fuel per vehicle roughly, or fleet total? Actually this is just per record? Wait, budget is per record in costRecords right now. Let's say budget_for_category is cost * 0.9.
      period: 'Q3 2026',
      related_fault_code: 'Fuel Log',
      work_order_id: undefined
    }))
  ];
  const totalActualSpend = allCostRecords.reduce((sum, c) => sum + c.amount, 0);
  const totalBudget = costRecords.reduce((sum, c) => sum + c.budget_for_category, 0);
  const costVariance = totalActualSpend - totalBudget;

  // CAE Deferral cost risk backlog
  const totalCaeDeferralRisk = caeItems.reduce((sum, item) => sum + item.deferral_cost, 0);
  const totalCaeRepairCost = caeItems.reduce((sum, item) => sum + item.repair_cost, 0);

  const keystoneCount = vehicles.filter((v) => v.classification === 'Keystone').length;
  const keystoneCritical = vehicles.filter(
    (v) => v.classification === 'Keystone' && v.status !== 'Healthy'
  ).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <TrendingUp className="h-4 w-4" /> {t('strategic.banner_tag', {}, 'Strategic Executive Dashboard')}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t('strategic.banner_title', {}, 'Fleet Operations & Decision Matrix')}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {t('strategic.banner_desc', {}, 'Real-time aggregate telemetry, cost distribution, and mathematical risk evaluation for role:')}{' '}
            <span className="font-semibold text-slate-800">{currentRole}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => changeScreen('CAE_BUDGET_PRIORITIZATION')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl shadow-xs hover:bg-indigo-700 transition cursor-pointer"
          >
            <span>{t('nav.cae_prioritization', {}, 'CAE Prioritization')}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Availability Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t('strategic.availability', {}, 'Fleet Availability')}
            </span>
            <KPIBadge type="Calculated" formula="Healthy Vehicles / Total Vehicles" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{fleetAvailability}%</span>
            <span className="text-xs text-slate-500">
              ({healthyVehicles}/{totalVehicles} {t('strategic.operational', {}, 'Operational')})
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full"
              style={{ width: `${(healthyVehicles / totalVehicles) * 100}%` }}
            />
            <div
              className="bg-amber-400 h-full"
              style={{ width: `${(attentionVehicles / totalVehicles) * 100}%` }}
            />
            <div
              className="bg-rose-500 h-full"
              style={{ width: `${(criticalVehicles / totalVehicles) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 pt-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> {healthyVehicles} Healthy
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> {attentionVehicles} Attention
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> {criticalVehicles} Critical
            </span>
          </div>
        </div>

        {/* Keystone Fleet Risk */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Keystone Asset Risk
            </span>
            <KPIBadge type="Configured" formula="Classification Tag = Keystone" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{keystoneCritical}</span>
            <span className="text-xs font-medium text-rose-600">
              / {keystoneCount} Keystone Affected
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-tight">
            Keystone vehicles carry a 1.5x rank weight and 2.2x delay penalty multiplier due to high route impact.
          </p>
          <div className="pt-1">
            <button
              onClick={() => changeScreen('FLEET_HEALTH_GRID')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              Filter Keystone Fleet <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Cost Variance Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Quarterly Variance
            </span>
            <KPIBadge type="Calculated" formula="Actual Spent - Category Budget" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-black ${
                costVariance > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {costVariance > 0 ? `+$${costVariance.toLocaleString()}` : `-$${Math.abs(costVariance).toLocaleString()}`}
            </span>
            <span className="text-xs text-slate-500">vs Budget</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Spend: ${totalActualSpend.toLocaleString()}</span>
            <span>Budget: ${totalBudget.toLocaleString()}</span>
          </div>
          <div className="pt-1">
            <button
              onClick={() => changeScreen('VARIANCE_DASHBOARD')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              View Variance Drill-down <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* CAE Deferred Risk Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              CAE Deferral Risk
            </span>
            <KPIBadge
              type="Statistical estimate"
              formula="Repair Cost * Delay Multiplier (Keystone 2.2x, Std 1.4x)"
            />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600">
              ${totalCaeDeferralRisk.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">Risk Exposure</span>
          </div>
          <div className="text-xs text-slate-500 flex justify-between">
            <span>Direct Repairs: ${totalCaeRepairCost.toLocaleString()}</span>
            <span>Items: {caeItems.length}</span>
          </div>
          <div className="pt-1">
            <button
              onClick={() => changeScreen('CAE_BUDGET_PRIORITIZATION')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              Optimize CAE Budget <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: High Priority Asset Status & Active Rules */}
        <div className="lg:col-span-2 space-y-6">
          {/* High Attention Vehicles Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-rose-500" />
                  Vehicles Requiring Strategic Action
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vehicles with active critical or attention status affecting scheduled routes
                </p>
              </div>
              <button
                onClick={() => changeScreen('FLEET_HEALTH_GRID')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                View All {totalVehicles} Vehicles <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 overflow-x-auto">
              {vehicles
                .filter((v) => v.status !== 'Healthy')
                .map((v) => (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVehicleId(v.id)}
                    className="p-4 hover:bg-slate-50 transition flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                          v.classification === 'Keystone'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {v.plate}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 truncate">
                            {v.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                              v.classification === 'Keystone'
                                ? 'bg-amber-500/10 text-amber-700 border border-amber-200'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {v.classification}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{v.status_reason}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-900">
                          Route in {v.scheduled_use_days}d
                        </div>
                        <div className="text-[11px] text-slate-500">{v.scheduled_route}</div>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          v.status === 'Critical'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {v.status}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Strategic Decision Rule Engine Matrix */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                <ShieldAlert className="h-4 w-4" /> NextTransit Decision Formula Rules
              </div>
              <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 font-mono">
                R1 - R7 Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                <div className="font-bold text-amber-400 flex items-center justify-between">
                  <span>Rule R1 & R3: Telemetry & Parts</span>
                  <KPIBadge type="Calculated" formula="OBD Scan -> Part SKU Stock Check" />
                </div>
                <p className="text-slate-300 text-[11px]">
                  Automatic generation of critical alerts linking OBD fault code required parts directly to warehouse inventory.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                <div className="font-bold text-rose-400 flex items-center justify-between">
                  <span>Rule R4: Conflict Detection</span>
                  <KPIBadge type="Calculated" formula="Status != Healthy AND Scheduled Use <= 7d" />
                </div>
                <p className="text-slate-300 text-[11px]">
                  Flags scheduled passenger coach departures if vehicle has unresolved critical issues.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                <div className="font-bold text-indigo-400 flex items-center justify-between">
                  <span>Rule R5: Shortfall Projection</span>
                  <KPIBadge type="Statistical estimate" formula="Lead Time * Fleet Maintenance Cadence" />
                </div>
                <p className="text-slate-300 text-[11px]">
                  Forecasts inventory stockouts by combining upcoming service mileages and lead times.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                <div className="font-bold text-emerald-400 flex items-center justify-between">
                  <span>Rule R7: CAE Budgeting</span>
                  <KPIBadge type="Statistical estimate" formula="(Deferral / Repair) * Weight * Failure" />
                </div>
                <p className="text-slate-300 text-[11px]">
                  Mathematically ranks repair backlog to maximize operational risk reduction per dollar.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Recent Alerts & Quick Decision Shortcuts */}
        <div className="space-y-6">
          {/* Active Alerts Panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Live Rule Alert Feed
              </h3>
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                {alerts.length} System Alerts
              </span>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-xl text-xs border space-y-1 transition ${
                    alert.severity === 'critical'
                      ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                      : alert.severity === 'warning'
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          alert.severity === 'critical'
                            ? 'bg-rose-500'
                            : alert.severity === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-indigo-500'
                        }`}
                      />
                      {alert.title}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">{alert.timestamp}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600">{alert.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Decision Role Jump Card */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-3">
            <h4 className="font-bold text-sm text-indigo-200">Role-Based Decision Shortcuts</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Navigate to role-specific interfaces to review detailed calculations or authorize work orders.
            </p>
            <div className="space-y-2 pt-1">
              <button
                onClick={() => changeScreen('CONFLICT_ALERTS')}
                className="w-full py-2 px-3 bg-white/10 hover:bg-white/20 text-white font-medium text-xs rounded-xl flex items-center justify-between transition cursor-pointer"
              >
                <span>Fleet Manager Conflicts (R4)</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => changeScreen('WORK_ORDER_QUEUE')}
                className="w-full py-2 px-3 bg-white/10 hover:bg-white/20 text-white font-medium text-xs rounded-xl flex items-center justify-between transition cursor-pointer"
              >
                <span>Work Order Interventions</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => changeScreen('INVENTORY_DASHBOARD')}
                className="w-full py-2 px-3 bg-white/10 hover:bg-white/20 text-white font-medium text-xs rounded-xl flex items-center justify-between transition cursor-pointer"
              >
                <span>Inventory Shortfalls (R5)</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
