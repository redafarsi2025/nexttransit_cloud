import React, { useState, useMemo } from 'react';
import { useFleet } from '../../context/FleetContext';
import { useLocalization } from '../../context/LocalizationContext';
import { tireService, TREAD_DEPTH_REPLACEMENT_THRESHOLD_MM } from '../../services/tireService';
import { Tire, TirePosition, TireStatus } from '../../types';
import {
  CircleDot,
  AlertTriangle,
  PlusCircle,
  Gauge,
  Wrench,
  CheckCircle2,
  Pencil,
  Trash2,
  X as XIcon,
  Save,
  ClipboardList,
} from 'lucide-react';

const POSITIONS: TirePosition[] = ['FL', 'FR', 'RL_OUTER', 'RL_INNER', 'RR_OUTER', 'RR_INNER', 'SPARE', 'UNASSIGNED'];
const STATUSES: TireStatus[] = ['in_service', 'in_stock', 'retired', 'needs_replacement'];

const POSITION_LABELS: Record<TirePosition, string> = {
  FL: 'Avant Gauche',
  FR: 'Avant Droit',
  RL_OUTER: 'Arrière Gauche Ext.',
  RL_INNER: 'Arrière Gauche Int.',
  RR_OUTER: 'Arrière Droit Ext.',
  RR_INNER: 'Arrière Droit Int.',
  SPARE: 'Roue de Secours',
  UNASSIGNED: 'Non Assigné',
};

const STATUS_LABELS: Record<TireStatus, string> = {
  in_service: 'En Service',
  in_stock: 'En Stock',
  retired: 'Retiré',
  needs_replacement: 'À Remplacer',
};

export const TireModule: React.FC = () => {
  const { vehicles, tires, addTire, updateTire, deleteTire, addTireInspection } = useFleet();
  const { t } = useLocalization();

  const [formVehicleId, setFormVehicleId] = useState<string>('');
  const [formPosition, setFormPosition] = useState<TirePosition>('UNASSIGNED');
  const [formBrand, setFormBrand] = useState<string>('');
  const [formModel, setFormModel] = useState<string>('');
  const [formTreadDepth, setFormTreadDepth] = useState<string>('8.0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<TireStatus>('in_service');
  const [editRotationDue, setEditRotationDue] = useState<string>('');

  const [inspectingId, setInspectingId] = useState<string | null>(null);
  const [inspectionTreadDepth, setInspectionTreadDepth] = useState<string>('');
  const [inspectionPressure, setInspectionPressure] = useState<string>('');
  const [rowActionError, setRowActionError] = useState<string | null>(null);

  const tiresNeedingAttention = useMemo(() => tires.filter((tire) => tireService.needsAttention(tire)), [tires]);
  const avgTreadDepth = useMemo(() => {
    const withReading = tires.filter((t) => t.latest_tread_depth_mm != null);
    if (withReading.length === 0) return null;
    const sum = withReading.reduce((acc, t) => acc + (t.latest_tread_depth_mm || 0), 0);
    return (sum / withReading.length).toFixed(1);
  }, [tires]);
  const overdueRotation = useMemo(() => {
    return tires.filter((tire) => {
      if (!tire.rotation_due_odometer || !tire.vehicle_id) return false;
      const vehicle = vehicles.find((v) => v.id === tire.vehicle_id);
      return vehicle ? vehicle.mileage >= tire.rotation_due_odometer : false;
    });
  }, [tires, vehicles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitFeedback(null);

    const treadDepth = formTreadDepth ? parseFloat(formTreadDepth) : undefined;
    if (treadDepth !== undefined && (isNaN(treadDepth) || treadDepth < 0)) {
      setSubmitFeedback({ type: 'error', message: t('tire.invalid_tread', {}, 'Please enter a valid tread depth.') });
      setIsSubmitting(false);
      return;
    }

    try {
      await addTire({
        tenant_id: '',
        vehicle_id: formVehicleId || null,
        position: formPosition,
        brand: formBrand || undefined,
        model: formModel || undefined,
        status: 'in_service',
        install_date: new Date().toISOString().slice(0, 10),
        latest_tread_depth_mm: treadDepth,
      });
      setSubmitFeedback({ type: 'success', message: t('tire.registered', {}, 'Tire registered successfully.') });
      setFormBrand('');
      setFormModel('');
    } catch (err) {
      setSubmitFeedback({ type: 'error', message: t('tire.save_error', {}, 'Failed to register tire.') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (tire: Tire) => {
    setEditingId(tire.id);
    setEditStatus(tire.status);
    setEditRotationDue(tire.rotation_due_odometer != null ? String(tire.rotation_due_odometer) : '');
    setRowActionError(null);
  };

  const saveEdit = async (id: string) => {
    try {
      await updateTire(id, {
        status: editStatus,
        rotation_due_odometer: editRotationDue ? parseInt(editRotationDue, 10) : null,
      });
      setEditingId(null);
    } catch {
      setRowActionError(t('tire.update_error', {}, 'Failed to update tire.'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('tire.confirm_delete', {}, 'Delete this tire record? This cannot be undone.'))) return;
    try {
      await deleteTire(id);
    } catch {
      setRowActionError(t('tire.delete_error', {}, 'Failed to delete tire.'));
    }
  };

  const startInspection = (tireId: string) => {
    setInspectingId(tireId);
    setInspectionTreadDepth('');
    setInspectionPressure('');
    setRowActionError(null);
  };

  const saveInspection = async (tireId: string, vehicleId: string | null | undefined) => {
    const depth = parseFloat(inspectionTreadDepth);
    if (isNaN(depth) || depth < 0) {
      setRowActionError(t('tire.invalid_tread', {}, 'Please enter a valid tread depth.'));
      return;
    }
    try {
      await addTireInspection({
        tenant_id: '',
        tire_id: tireId,
        vehicle_id: vehicleId,
        tread_depth_mm: depth,
        pressure_bar: inspectionPressure ? parseFloat(inspectionPressure) : undefined,
      });
      setInspectingId(null);
    } catch {
      setRowActionError(t('tire.inspection_error', {}, 'Failed to log inspection.'));
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <CircleDot className="h-4 w-4" /> {t('tire.header_tag', {}, 'Fleet Tire Management')}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t('tire.header_title', {}, 'Tire Position, Tread Depth & Rotation Tracking')}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {t(
              'tire.header_desc', {},
              `Track each tire's position, brand, tread depth history, and rotation schedule. Flags tires below ${TREAD_DEPTH_REPLACEMENT_THRESHOLD_MM}mm tread depth for replacement.`
            )}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>{t('tire.total_tracked', {}, 'Tires Tracked')}</span>
            <CircleDot className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{tires.length}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>{t('tire.avg_tread', {}, 'Avg Tread Depth')}</span>
            <Gauge className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">
            {avgTreadDepth ?? '—'} <span className="text-sm font-semibold text-slate-500">mm</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>{t('tire.needs_replacement', {}, 'Need Replacement')}</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className={`text-3xl font-black ${tiresNeedingAttention.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {tiresNeedingAttention.length}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>{t('tire.rotation_overdue', {}, 'Rotation Overdue')}</span>
            <Wrench className="h-4 w-4 text-amber-600" />
          </div>
          <div className={`text-3xl font-black ${overdueRotation.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {overdueRotation.length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Registration Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <PlusCircle className="h-5 w-5 text-indigo-600" />
            {t('tire.register_title', {}, 'Register a Tire')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('tire.vehicle', {}, 'Vehicle (optional — leave blank for stock)')}</label>
              <select
                value={formVehicleId}
                onChange={(e) => setFormVehicleId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-hidden focus:border-indigo-500 focus:bg-white"
              >
                <option value="">{t('tire.in_stock_option', {}, '— In Stock (unassigned) —')}</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.plate} — {v.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('tire.position', {}, 'Position')}</label>
              <select
                value={formPosition}
                onChange={(e) => setFormPosition(e.target.value as TirePosition)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-hidden focus:border-indigo-500 focus:bg-white"
              >
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>{POSITION_LABELS[p]}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('tire.brand', {}, 'Brand')}</label>
                <input
                  type="text"
                  value={formBrand}
                  onChange={(e) => setFormBrand(e.target.value)}
                  placeholder="Michelin"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-hidden focus:border-indigo-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('tire.model', {}, 'Model')}</label>
                <input
                  type="text"
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                  placeholder="X Multi Energy"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-hidden focus:border-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('tire.initial_tread', {}, 'Initial Tread Depth (mm)')}</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formTreadDepth}
                onChange={(e) => setFormTreadDepth(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-hidden focus:border-indigo-500 focus:bg-white"
              />
            </div>

            {submitFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 ${
                  submitFeedback.type === 'error'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {submitFeedback.type === 'error' ? (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                )}
                <span>{submitFeedback.message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <PlusCircle className="h-4 w-4" />
              {isSubmitting ? t('tire.saving', {}, 'Registering...') : t('tire.submit_btn', {}, 'Register Tire')}
            </button>
          </form>
        </div>

        {/* Tire Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <ClipboardList className="h-5 w-5 text-indigo-600" />
            {t('tire.fleet_tires_title', {}, 'Fleet Tires')}
          </h2>

          {rowActionError && (
            <div className="p-2.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {rowActionError}
            </div>
          )}

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Vehicle</th>
                  <th className="p-3">Position</th>
                  <th className="p-3">Brand / Model</th>
                  <th className="p-3 text-right">Tread Depth</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {tires.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      {t('tire.no_tires', {}, 'No tires registered yet.')}
                    </td>
                  </tr>
                )}
                {tires.map((tire) => {
                  const vehicle = vehicles.find((v) => v.id === tire.vehicle_id);
                  const needsAttention = tireService.needsAttention(tire);
                  const isEditing = editingId === tire.id;
                  const isInspecting = inspectingId === tire.id;

                  if (isEditing) {
                    return (
                      <tr key={tire.id} className="bg-indigo-50/40">
                        <td className="p-2" colSpan={2}>{vehicle?.plate || '— Stock —'} / {POSITION_LABELS[tire.position]}</td>
                        <td className="p-2 text-slate-400">—</td>
                        <td className="p-2 text-right text-slate-400">—</td>
                        <td className="p-2">
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as TireStatus)}
                            className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs"
                          >
                            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                          </select>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center justify-center gap-1.5">
                            <button type="button" onClick={() => saveEdit(tire.id)} title="Save" className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 cursor-pointer">
                              <Save className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => setEditingId(null)} title="Cancel" className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer">
                              <XIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  if (isInspecting) {
                    return (
                      <tr key={tire.id} className="bg-blue-50/40">
                        <td className="p-2" colSpan={2}>{vehicle?.plate || '— Stock —'} / {POSITION_LABELS[tire.position]}</td>
                        <td className="p-2 text-slate-400">{t('tire.log_inspection', {}, 'Log tread depth (mm)')}</td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={inspectionTreadDepth}
                            onChange={(e) => setInspectionTreadDepth(e.target.value)}
                            placeholder="mm"
                            className="w-20 bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-right"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={inspectionPressure}
                            onChange={(e) => setInspectionPressure(e.target.value)}
                            placeholder="bar (optional)"
                            className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <div className="flex items-center justify-center gap-1.5">
                            <button type="button" onClick={() => saveInspection(tire.id, tire.vehicle_id)} title="Save" className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 cursor-pointer">
                              <Save className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => setInspectingId(null)} title="Cancel" className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer">
                              <XIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={tire.id} className={`hover:bg-slate-50 transition ${needsAttention ? 'bg-rose-50/40' : ''}`}>
                      <td className="p-3">
                        <span className="font-bold text-indigo-600">{vehicle?.plate || '— Stock —'}</span>
                        {vehicle?.name && <span className="block text-[10px] text-slate-400">{vehicle.name}</span>}
                      </td>
                      <td className="p-3 text-slate-700">{POSITION_LABELS[tire.position]}</td>
                      <td className="p-3 text-slate-700">
                        {tire.brand || '—'} {tire.model && <span className="text-slate-400">{tire.model}</span>}
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        {tire.latest_tread_depth_mm != null ? (
                          <span className={needsAttention ? 'text-rose-700' : 'text-slate-900'}>{tire.latest_tread_depth_mm} mm</span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">No reading</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {needsAttention ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 inline-flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> {t('tire.status_attention', {}, 'Needs Attention')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {STATUS_LABELS[tire.status]}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button type="button" onClick={() => startInspection(tire.id)} title={t('tire.log_inspection_btn', {}, 'Log Inspection')} className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 cursor-pointer">
                            <Gauge className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => startEdit(tire)} title="Edit" className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 cursor-pointer">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => handleDelete(tire.id)} title="Delete" className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 cursor-pointer">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
