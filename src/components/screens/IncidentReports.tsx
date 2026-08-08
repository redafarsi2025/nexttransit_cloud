import React, { useState } from 'react';
import { useFleet } from '../../context/FleetContext';
import { useLocalization } from '../../context/LocalizationContext';
import { KPIBadge } from '../common/KPIBadge';
import {
  FileText,
  AlertTriangle,
  Search,
  CheckCircle2,
  Wrench,
  ShieldAlert,
  Plus,
} from 'lucide-react';

export const IncidentReports: React.FC = () => {
  const { incidents, vehicles, logOBDFault, createWorkOrder, submitDriverIncident, setSelectedVehicleId } = useFleet();
  const { t } = useLocalization();

  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredIncidents = incidents.filter((i) => {
    if (filterType === 'R6_INVESTIGATION' && i.matched_to_fault) return false;
    if (filterType === 'RESOLVED' && i.status !== 'Resolved') return false;
    return true;
  });

  const handleCreateInvestigationWO = (incidentId: string, vehicleId: string, description: string) => {
    createWorkOrder({
      vehicle_id: vehicleId,
      type: 'Investigation',
      parts_used: [],
      labor_hours: 3,
      hourly_rate: 140,
      before_notes: `Investigation Work Order for Incident ${incidentId}: ${description}`,
      assigned_mechanic_id: 'M-01',
      assigned_mechanic_name: 'David Thorne (Workshop Technician)',
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FileText className="h-4 w-4" /> {t('incidents.header_tag', {}, 'Driver Incident Telemetry Reconciliation (Rule R6)')}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t('incidents.header_title', {}, 'Incident Audits & R6 Investigation Queue')}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {t('incidents.header_desc', {}, 'Any driver-reported incident without matching OBD code automatically triggers an R6 Investigation Work Order.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <KPIBadge
            type="Calculated"
            formula="Driver Report Category != Active OBD Fault Code -> R6 Investigation Alert"
          />
        </div>
      </div>

      {/* R6 Explanation Card */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-white">Rule R6 Telemetry Reconciliation</div>
            <p className="text-xs text-slate-400">
              Protects against unreported mechanical issues (e.g. suspension noise, body rattle) that do not trigger electronic fault sensors.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilterType('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
            filterType === 'ALL'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600'
          }`}
        >
          All Incidents ({incidents.length})
        </button>
        <button
          onClick={() => setFilterType('R6_INVESTIGATION')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
            filterType === 'R6_INVESTIGATION'
              ? 'bg-amber-600 text-white'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          R6 Unmatched Investigations ({incidents.filter((i) => !i.matched_to_fault).length})
        </button>
      </div>

      {/* Incidents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredIncidents.map((inc) => (
          <div
            key={inc.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 hover:border-indigo-300 transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-slate-900 text-sm">{inc.id}</span>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {inc.vehicle_plate}
                  </span>
                </div>
                <span className="text-xs text-slate-500 block mt-0.5">
                  Reported by: <span className="font-semibold text-slate-800">{inc.reported_by}</span> on {inc.created_date}
                </span>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  inc.matched_to_fault
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {inc.matched_to_fault ? 'OBD Fault Linked' : 'R6 Investigation Needed'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed font-medium">
              <span className="font-bold block text-slate-900 mb-0.5">Category: {inc.category}</span>
              "{inc.description}"
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <button
                onClick={() => setSelectedVehicleId(inc.vehicle_id)}
                className="text-indigo-600 font-bold hover:text-indigo-800 cursor-pointer"
              >
                Inspect Vehicle {inc.vehicle_plate}
              </button>

              {!inc.matched_to_fault && (
                <button
                  onClick={() => handleCreateInvestigationWO(inc.id, inc.vehicle_id, inc.description)}
                  className="px-3 py-1.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition cursor-pointer flex items-center gap-1"
                >
                  <Wrench className="h-3.5 w-3.5" /> Launch Investigation WO
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
