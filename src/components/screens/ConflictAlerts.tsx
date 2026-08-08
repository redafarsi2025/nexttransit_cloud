import React, { useState } from 'react';
import { useFleet } from '../../context/FleetContext';
import { useLocalization } from '../../context/LocalizationContext';
import { KPIBadge } from '../common/KPIBadge';
import {
  AlertTriangle,
  Calendar,
  Truck,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';

export const ConflictAlerts: React.FC = () => {
  const { vehicles, alerts, resolveConflict, setSelectedVehicleId } = useFleet();
  const { t } = useLocalization();

  const [notesModal, setNotesModal] = useState<{
    vehicleId: string;
    action: 'assign_alternate' | 'expedite' | 'defer';
    plate: string;
  } | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');

  // Filter vehicles with R4 Conflict
  const conflictVehicles = vehicles.filter(
    (v) => (v.status === 'Critical' || v.status === 'Attention') && v.scheduled_use_days <= 7
  );

  const handleConfirmResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesModal) return;
    resolveConflict(notesModal.vehicleId, notesModal.action, resolutionNotes || 'Conflict resolved by Fleet Manager.');
    setNotesModal(null);
    setResolutionNotes('');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-600 text-xs font-bold uppercase tracking-wider mb-1">
            <AlertTriangle className="h-4 w-4" /> {t('conflict.header_tag', {}, 'Rule R2 & R4 Conflict Avoidance Engine')}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t('conflict.header_title', {}, 'Route Departure & Open WO Conflict Matrix')}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {t('conflict.header_desc', {}, 'Automatic detection of vehicles scheduled for departure within 3 days that have uncompleted work orders.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <KPIBadge type="Calculated" formula="(Status != Healthy) AND (Scheduled Departure <= 7 Days)" />
        </div>
      </div>

      {/* Formula Explanation Card */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-white">Rule R4 Decision Logic</div>
            <p className="text-xs text-slate-400">
              When a vehicle status transitions to Critical/Attention, the platform checks its scheduled route departure date. If departure is within 7 days, an R4 Operational Risk Alert is dispatched.
            </p>
          </div>
        </div>

        <div className="bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 font-mono text-xs text-amber-400 shrink-0">
          Conflicts Flagged: {conflictVehicles.length}
        </div>
      </div>

      {/* Conflict Vehicles Cards */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-indigo-600" />
          Active Route Departure Conflicts
        </h2>

        {conflictVehicles.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
            <h3 className="font-bold text-slate-900 text-sm">No Active Schedule Conflicts</h3>
            <p className="text-xs text-slate-500">
              All vehicles scheduled for departure in the next 7 days are in Healthy operational status.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {conflictVehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="bg-white rounded-2xl border border-rose-200 shadow-xs p-5 space-y-4 hover:border-rose-400 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-base">{vehicle.name}</span>
                      <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {vehicle.plate}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                      Scheduled Route: <span className="text-slate-800 font-bold">{vehicle.scheduled_route}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
                        vehicle.status === 'Critical'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {vehicle.status}
                    </span>
                    <div className="text-xs font-bold text-rose-600 mt-1 flex items-center justify-end gap-1">
                      <Clock className="h-3 w-3" /> Departure in {vehicle.scheduled_use_days}d
                    </div>
                  </div>
                </div>

                {/* Reason Banner */}
                <div className="p-3 bg-rose-50/80 rounded-xl border border-rose-100 text-xs text-rose-950 font-medium">
                  <span className="font-bold block mb-0.5 text-rose-900">R4 Conflict Trigger:</span>
                  {vehicle.status_reason}
                </div>

                {/* Active Faults List */}
                {vehicle.active_fault_codes.length > 0 && (
                  <div className="space-y-1 text-xs">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Active OBD Telemetry Faults</span>
                    <div className="space-y-1">
                      {vehicle.active_fault_codes.map((f, i) => (
                        <div key={i} className="p-2 bg-slate-50 rounded-lg border border-slate-200 font-mono flex items-center justify-between">
                          <span className="font-bold text-slate-900">{f.code} - {f.name}</span>
                          <span className="text-[10px] font-bold uppercase text-rose-600">{f.severity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolution Action Buttons */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Select Fleet Manager Resolution Action
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-bold">
                    <button
                      onClick={() =>
                        setNotesModal({
                          vehicleId: vehicle.id,
                          action: 'assign_alternate',
                          plate: vehicle.plate,
                        })
                      }
                      className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition cursor-pointer text-center"
                    >
                      Reassign Route
                    </button>

                    <button
                      onClick={() =>
                        setNotesModal({
                          vehicleId: vehicle.id,
                          action: 'expedite',
                          plate: vehicle.plate,
                        })
                      }
                      className="p-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition cursor-pointer text-center"
                    >
                      Expedite Repair
                    </button>

                    <button
                      onClick={() =>
                        setNotesModal({
                          vehicleId: vehicle.id,
                          action: 'defer',
                          plate: vehicle.plate,
                        })
                      }
                      className="p-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition cursor-pointer text-center"
                    >
                      Defer Non-Critical
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolution Confirmation Modal */}
      {notesModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              Confirm Resolution Action for {notesModal.plate}
            </h3>
            <p className="text-xs text-slate-500">
              Action selected:{' '}
              <span className="font-bold text-indigo-600 uppercase">{notesModal.action.replace('_', ' ')}</span>
            </p>

            <form onSubmit={handleConfirmResolve} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Audit Notes / Directives</label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Provide operational context or driver reassignment details..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNotesModal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition cursor-pointer"
                >
                  Confirm & Apply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
