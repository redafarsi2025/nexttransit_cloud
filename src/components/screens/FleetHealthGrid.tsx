import React, { useState } from 'react';
import { useFleet } from '../../context/FleetContext';
import { useLocalization } from '../../context/LocalizationContext';
import { KPIBadge } from '../common/KPIBadge';
import {
  Activity,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Truck,
  Gauge,
  ChevronDown,
  ChevronUp,
  Wrench,
  ChevronRight,
} from 'lucide-react';

export const FleetHealthGrid: React.FC = () => {
  const { vehicles, setSelectedVehicleId, logOBDFault } = useFleet();
  const { t } = useLocalization();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [classificationFilter, setClassificationFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSubscores, setShowSubscores] = useState<Record<string, boolean>>({});

  const toggleSubscore = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSubscores((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredVehicles = vehicles.filter((v) => {
    if (statusFilter !== 'ALL' && v.status !== statusFilter) return false;
    if (classificationFilter !== 'ALL' && v.classification !== classificationFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return v.plate.toLowerCase().includes(q) || v.name.toLowerCase().includes(q);
    }
    return true;
  });

  const healthyCount = vehicles.filter((v) => v.status === 'Healthy').length;
  const attentionCount = vehicles.filter((v) => v.status === 'Attention').length;
  const criticalCount = vehicles.filter((v) => v.status === 'Critical').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Status Filter Pills */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Activity className="h-4 w-4" /> {t('health.header_tag', {}, 'Technical & Operations Fleet Grid')}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t('health.header_title', {}, 'Fleet Health Telemetry & Diagnostic Grid')}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {t('health.header_desc', {}, 'Real-time status tracking across all fleet vehicles with single-line plain language status explanations.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <KPIBadge type="Calculated" formula="Fault Severity + OBD Telemetry Integration" />
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Vehicles ({vehicles.length})
          </button>
          <button
            onClick={() => setStatusFilter('Healthy')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              statusFilter === 'Healthy'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Healthy ({healthyCount})
          </button>
          <button
            onClick={() => setStatusFilter('Attention')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              statusFilter === 'Attention'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Attention ({attentionCount})
          </button>
          <button
            onClick={() => setStatusFilter('Critical')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              statusFilter === 'Critical'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <AlertCircle className="h-3.5 w-3.5" /> Critical ({criticalCount})
          </button>
        </div>

        {/* Search & Classification Filter */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search plate or model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={classificationFilter}
            onChange={(e) => setClassificationFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-hidden cursor-pointer"
          >
            <option value="ALL">All Classifications</option>
            <option value="Keystone">Keystone Fleet (1.5x Weight)</option>
            <option value="Standard">Standard Fleet (1.0x Weight)</option>
          </select>
        </div>
      </div>

      {/* Grid of Vehicles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVehicles.map((vehicle) => {
          const isSubscoreOpen = !!showSubscores[vehicle.id];

          return (
            <div
              key={vehicle.id}
              onClick={() => setSelectedVehicleId(vehicle.id)}
              className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between overflow-hidden group"
            >
              {/* Card Header */}
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition">
                      {vehicle.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                        vehicle.classification === 'Keystone'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {vehicle.classification}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                      vehicle.status === 'Healthy'
                        ? 'bg-emerald-100 text-emerald-800'
                        : vehicle.status === 'Attention'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {vehicle.status === 'Healthy' && <CheckCircle2 className="h-3 w-3" />}
                    {vehicle.status === 'Attention' && <AlertTriangle className="h-3 w-3" />}
                    {vehicle.status === 'Critical' && <AlertCircle className="h-3 w-3" />}
                    {vehicle.status}
                  </span>
                </div>

                <div className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50/60 px-2.5 py-1 rounded-lg w-max">
                  Plate: {vehicle.plate}
                </div>

                {/* Plain-Language Status Reason */}
                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium leading-relaxed">
                  {vehicle.status_reason}
                </p>

                {/* Active Fault Codes summary */}
                {vehicle.active_fault_codes.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Active OBD Diagnostic Faults ({vehicle.active_fault_codes.length})
                    </span>
                    <div className="space-y-1">
                      {vehicle.active_fault_codes.map((fault, idx) => (
                        <div
                          key={idx}
                          className="text-xs p-2 rounded-lg bg-rose-50 border border-rose-100 text-rose-900 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-mono font-bold mr-1.5">{fault.code}</span>
                            <span>{fault.name}</span>
                          </div>
                          <span className="text-[10px] font-bold uppercase text-rose-700 shrink-0 ml-1">
                            {fault.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Route & Schedule info */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Scheduled Departure
                    </span>
                    <span className="font-bold text-slate-800">
                      In {vehicle.scheduled_use_days} Days
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Assigned Route
                    </span>
                    <span className="font-bold text-slate-800 truncate block">
                      {vehicle.scheduled_route || 'Unassigned'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sub-scores Collapsible Section */}
              <div className="border-t border-slate-100 bg-slate-50/50 p-3">
                <button
                  onClick={(e) => toggleSubscore(vehicle.id, e)}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Gauge className="h-3.5 w-3.5 text-indigo-500" />
                    Sub-score Diagnostics (Fault, Compliance, Freshness)
                  </span>
                  {isSubscoreOpen ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>

                {isSubscoreOpen && (
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs pt-1 border-t border-slate-200/60">
                    <div className="p-2 bg-white rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Fault</div>
                      <div className="font-bold text-slate-800 mt-0.5">{vehicle.fault_score}/100</div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Compliance</div>
                      <div className="font-bold text-slate-800 mt-0.5">
                        {vehicle.compliance_score}%
                      </div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Freshness</div>
                      <div className="font-bold text-slate-800 mt-0.5">
                        {vehicle.freshness_score}d ago
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
