import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  Save,
  AlertTriangle,
  Hash,
  Gauge,
  CalendarDays,
  Route,
  User,
  Shield,
  ChevronDown,
} from 'lucide-react';
import { Vehicle, VehicleStatus, VehicleClassification } from '../../types';
import { useLocalization } from '../../context/LocalizationContext';

// -------------------------------------------------------
// Types
// -------------------------------------------------------
type VehicleFormInput = {
  plate: string;
  name: string;
  classification: VehicleClassification;
  status: VehicleStatus;
  status_reason: string;
  mileage: number;
  next_service_mileage: number;
  next_service_date: string;
  scheduled_use_days: number;
  scheduled_route: string;
  assigned_driver_id: string;
  fault_score: number;
  compliance_score: number;
  freshness_score: number;
  last_check_date: string;
  classification_weight: number;
  delay_multiplier: number;
  hasWarranty: boolean;
  warrantyManufacturer: string;
  warrantyExpiryDate: string;
  warrantyExpiryMileage: number;
  warrantyCoveredSystems: string[];
  warrantyStatus: 'active' | 'expiring_soon' | 'expired';
};

const DEFAULT_FORM: VehicleFormInput = {
  plate: '',
  name: '',
  classification: 'Standard',
  status: 'Healthy',
  status_reason: 'Véhicule opérationnel — aucun défaut actif.',
  mileage: 0,
  next_service_mileage: 15000,
  next_service_date: '',
  scheduled_use_days: 30,
  scheduled_route: '',
  assigned_driver_id: '',
  fault_score: 100,
  compliance_score: 100,
  freshness_score: 0,
  last_check_date: new Date().toISOString().split('T')[0],
  classification_weight: 1.0,
  delay_multiplier: 1.4,
  hasWarranty: false,
  warrantyManufacturer: '',
  warrantyExpiryDate: '',
  warrantyExpiryMileage: 100000,
  warrantyCoveredSystems: ['Engine', 'Transmission'],
  warrantyStatus: 'active',
};

interface AddEditVehicleModalProps {
  /** Pass null/undefined to open in CREATE mode, a Vehicle to open in EDIT mode */
  vehicle?: Vehicle | null;
  onClose: () => void;
  onSave: (
    data: Omit<Vehicle, 'id' | 'active_fault_codes' | 'maintenance_history'>
  ) => Promise<{ error: string | null }>;
  isReadOnly?: boolean;
}

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
function toFormInput(v: Vehicle): VehicleFormInput {
  return {
    plate: v.plate,
    name: v.name,
    classification: v.classification,
    status: v.status,
    status_reason: v.status_reason,
    mileage: v.mileage,
    next_service_mileage: v.next_service_mileage,
    next_service_date: v.next_service_date,
    scheduled_use_days: v.scheduled_use_days,
    scheduled_route: v.scheduled_route || '',
    assigned_driver_id: v.assigned_driver_id || '',
    fault_score: v.fault_score,
    compliance_score: v.compliance_score,
    freshness_score: v.freshness_score,
    last_check_date: v.last_check_date,
    classification_weight: v.classification_weight,
    delay_multiplier: v.delay_multiplier,
    hasWarranty: !!v.warranty,
    warrantyManufacturer: v.warranty?.manufacturer || '',
    warrantyExpiryDate: v.warranty?.expiry_date ? v.warranty.expiry_date.split('T')[0] : '',
    warrantyExpiryMileage: v.warranty?.expiry_mileage || 100000,
    warrantyCoveredSystems: v.warranty?.covered_systems || ['Engine', 'Transmission'],
    warrantyStatus: v.warranty?.status || 'active',
  };
}

// -------------------------------------------------------
// Component
// -------------------------------------------------------
export const AddEditVehicleModal: React.FC<AddEditVehicleModalProps> = ({
  vehicle,
  onClose,
  onSave,
  isReadOnly = false,
}) => {
  const { t } = useLocalization();
  const isEdit = !!vehicle;

  const [form, setForm] = useState<VehicleFormInput>(
    vehicle ? toFormInput(vehicle) : DEFAULT_FORM
  );
  const [errors, setErrors] = useState<Partial<Record<keyof VehicleFormInput, string>>>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Reset whenever the vehicle prop changes
  useEffect(() => {
    setForm(vehicle ? toFormInput(vehicle) : DEFAULT_FORM);
    setErrors({});
    setServerError(null);
  }, [vehicle]);

  // Sync classification_weight & delay_multiplier automatically
  useEffect(() => {
    if (form.classification === 'Keystone') {
      setForm(prev => ({ ...prev, classification_weight: 1.5, delay_multiplier: 2.2 }));
    } else {
      setForm(prev => ({ ...prev, classification_weight: 1.0, delay_multiplier: 1.4 }));
    }
  }, [form.classification]);

  // -------------------------------------------------------
  // Field handlers
  // -------------------------------------------------------
  const set = <K extends keyof VehicleFormInput>(key: K, value: VehicleFormInput[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const setNum = (key: keyof VehicleFormInput, raw: string) => {
    const n = parseFloat(raw);
    set(key, (isNaN(n) ? 0 : n) as any);
  };

  // -------------------------------------------------------
  // Validation
  // -------------------------------------------------------
  function validate(): boolean {
    const errs: typeof errors = {};
    if (!form.plate.trim()) errs.plate = t('vehicle.validation.plate_required', {}, 'Immatriculation obligatoire');
    if (!form.name.trim()) errs.name = t('vehicle.validation.name_required', {}, 'Nom / modèle obligatoire');
    if (form.mileage < 0) errs.mileage = t('vehicle.validation.mileage_positive', {}, 'Kilométrage doit être >= 0');
    if (!form.status_reason.trim())
      errs.status_reason = t('vehicle.validation.status_reason_required', {}, 'Motif de statut obligatoire');
    if (!form.last_check_date)
      errs.last_check_date = t('vehicle.validation.last_check_required', {}, 'Date de dernier contrôle obligatoire');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // -------------------------------------------------------
  // Submit
  // -------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setServerError(null);

    const payload: Omit<Vehicle, 'id' | 'active_fault_codes' | 'maintenance_history'> = {
      plate: form.plate.trim().toUpperCase(),
      name: form.name.trim(),
      classification: form.classification,
      status: form.status,
      status_reason: form.status_reason.trim(),
      mileage: form.mileage,
      next_service_mileage: form.next_service_mileage,
      next_service_date: form.next_service_date,
      scheduled_use_days: form.scheduled_use_days,
      scheduled_route: form.scheduled_route || undefined,
      assigned_driver_id: form.assigned_driver_id || undefined,
      fault_score: form.fault_score,
      compliance_score: form.compliance_score,
      freshness_score: form.freshness_score,
      last_check_date: form.last_check_date,
      classification_weight: form.classification_weight,
      delay_multiplier: form.delay_multiplier,
      warranty: form.hasWarranty
        ? {
            manufacturer: form.warrantyManufacturer.trim() || 'Constructeur Inconnu',
            expiry_date: form.warrantyExpiryDate ? new Date(form.warrantyExpiryDate).toISOString() : null,
            expiry_mileage: form.warrantyExpiryMileage || null,
            covered_systems: form.warrantyCoveredSystems,
            status: form.warrantyStatus,
          }
        : null,
    };

    const { error } = await onSave(payload);
    setSaving(false);

    if (error) {
      setServerError(error);
    } else {
      onClose();
    }
  };

  // -------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------
  const Field: React.FC<{
    label: string;
    error?: string;
    required?: boolean;
    children: React.ReactNode;
  }> = ({ label, error, required, children }) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <span className="text-[11px] text-rose-600 font-medium">{error}</span>}
    </div>
  );

  const inputCls = (err?: string) =>
    `w-full bg-slate-50 border ${err ? 'border-rose-400' : 'border-slate-200'} rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition`;

  const selectCls = `w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition appearance-none cursor-pointer`;

  const title = isReadOnly
    ? t('vehicle.modal.view_title', {}, 'Détail du véhicule')
    : isEdit
    ? t('vehicle.modal.edit_title', {}, 'Modifier le véhicule')
    : t('vehicle.modal.add_title', {}, 'Ajouter un nouveau véhicule');

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden animate-slide-in-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-700 to-indigo-500">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">{title}</h2>
              <p className="text-xs text-indigo-200">
                {isEdit
                  ? `ID: ${vehicle?.id} — ${vehicle?.plate}`
                  : t('vehicle.modal.add_subtitle', {}, 'Saisie manuelle · Isolé au tenant actif')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            id="vehicle-modal-close"
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <form
          id="vehicle-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-6"
        >
          {serverError && (
            <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl px-4 py-3">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Identification */}
          <section>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-3 flex items-center gap-1.5">
              <Hash className="h-3 w-3" />
              {t('vehicle.modal.section_identity', {}, 'Identification')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('vehicle.modal.plate', {}, 'Immatriculation')} error={errors.plate} required>
                <input
                  id="vehicle-plate"
                  type="text"
                  value={form.plate}
                  onChange={e => set('plate', e.target.value)}
                  disabled={isReadOnly}
                  placeholder="ex: 16-01234-A"
                  className={`${inputCls(errors.plate)} font-mono font-bold uppercase`}
                />
              </Field>

              <Field label={t('vehicle.modal.name', {}, 'Nom / Modèle')} error={errors.name} required>
                <input
                  id="vehicle-name"
                  type="text"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  disabled={isReadOnly}
                  placeholder="ex: Transit-024"
                  className={inputCls(errors.name)}
                />
              </Field>

              <Field label={t('vehicle.modal.classification', {}, 'Classification')}>
                <div className="relative">
                  <select
                    id="vehicle-classification"
                    value={form.classification}
                    onChange={e => set('classification', e.target.value as VehicleClassification)}
                    disabled={isReadOnly}
                    className={selectCls}
                  >
                    <option value="Standard">Standard (1.0x)</option>
                    <option value="Keystone">Keystone (1.5x)</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </Field>

              <Field label={t('vehicle.modal.status', {}, 'Statut opérationnel')}>
                <div className="relative">
                  <select
                    id="vehicle-status"
                    value={form.status}
                    onChange={e => set('status', e.target.value as VehicleStatus)}
                    disabled={isReadOnly}
                    className={selectCls}
                  >
                    <option value="Healthy">Healthy</option>
                    <option value="Attention">Attention</option>
                    <option value="Critical">Critical</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </Field>

              <Field
                label={t('vehicle.modal.status_reason', {}, 'Motif du statut')}
                error={errors.status_reason}
                required
              >
                <input
                  id="vehicle-status-reason"
                  type="text"
                  value={form.status_reason}
                  onChange={e => set('status_reason', e.target.value)}
                  disabled={isReadOnly}
                  placeholder="ex: Aucun défaut actif"
                  className={inputCls(errors.status_reason)}
                />
              </Field>

              <Field
                label={t('vehicle.modal.last_check_date', {}, 'Date dernier contrôle')}
                error={errors.last_check_date}
                required
              >
                <input
                  id="vehicle-last-check-date"
                  type="date"
                  value={form.last_check_date}
                  onChange={e => set('last_check_date', e.target.value)}
                  disabled={isReadOnly}
                  className={inputCls(errors.last_check_date)}
                />
              </Field>
            </div>
          </section>

          {/* Kilometrage & Service */}
          <section>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-3 flex items-center gap-1.5">
              <Gauge className="h-3 w-3" />
              {t('vehicle.modal.section_mileage', {}, 'Kilometrage & Service')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field
                label={t('vehicle.modal.mileage', {}, 'Kilometrage actuel (km)')}
                error={errors.mileage}
              >
                <input
                  id="vehicle-mileage"
                  type="number"
                  min={0}
                  value={form.mileage}
                  onChange={e => setNum('mileage', e.target.value)}
                  disabled={isReadOnly}
                  className={inputCls(errors.mileage)}
                />
              </Field>

              <Field label={t('vehicle.modal.next_service_km', {}, 'Prochain service (km)')}>
                <input
                  id="vehicle-next-service-km"
                  type="number"
                  min={0}
                  value={form.next_service_mileage}
                  onChange={e => setNum('next_service_mileage', e.target.value)}
                  disabled={isReadOnly}
                  className={inputCls()}
                />
              </Field>

              <Field label={t('vehicle.modal.next_service_date', {}, 'Date prochain service')}>
                <input
                  id="vehicle-next-service-date"
                  type="date"
                  value={form.next_service_date}
                  onChange={e => set('next_service_date', e.target.value)}
                  disabled={isReadOnly}
                  className={inputCls()}
                />
              </Field>
            </div>
          </section>

          {/* Planification */}
          <section>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-3 flex items-center gap-1.5">
              <CalendarDays className="h-3 w-3" />
              {t('vehicle.modal.section_planning', {}, 'Planification & Route')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('vehicle.modal.scheduled_use_days', {}, 'Jours avant prochain usage')}>
                <input
                  id="vehicle-scheduled-use-days"
                  type="number"
                  min={0}
                  value={form.scheduled_use_days}
                  onChange={e => setNum('scheduled_use_days', e.target.value)}
                  disabled={isReadOnly}
                  className={inputCls()}
                />
              </Field>

              <Field label={t('vehicle.modal.scheduled_route', {}, 'Route assignee')}>
                <input
                  id="vehicle-scheduled-route"
                  type="text"
                  value={form.scheduled_route}
                  onChange={e => set('scheduled_route', e.target.value)}
                  disabled={isReadOnly}
                  placeholder="ex: Alger - Constantine"
                  className={inputCls()}
                />
              </Field>
            </div>
          </section>

          {/* Affectation */}
          <section>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-3 flex items-center gap-1.5">
              <User className="h-3 w-3" />
              {t('vehicle.modal.section_assignment', {}, 'Affectation')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('vehicle.modal.driver_id', {}, 'ID Chauffeur assigne')}>
                <input
                  id="vehicle-driver-id"
                  type="text"
                  value={form.assigned_driver_id}
                  onChange={e => set('assigned_driver_id', e.target.value)}
                  disabled={isReadOnly}
                  placeholder="ex: DRV-042"
                  className={inputCls()}
                />
              </Field>
            </div>
          </section>

          {/* Warranty Section */}
          <section className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
                <Shield className="h-3 w-3" />
                Garantie Constructeur
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.hasWarranty}
                  onChange={(e) => set('hasWarranty', e.target.checked)}
                  disabled={isReadOnly}
                  className="w-4 h-4 text-indigo-600 rounded border-indigo-300 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-700">Véhicule sous garantie</span>
              </label>
            </div>

            {form.hasWarranty && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <Field label="Constructeur / Marque" required>
                  <input
                    value={form.warrantyManufacturer}
                    onChange={(e) => set('warrantyManufacturer', e.target.value)}
                    disabled={isReadOnly}
                    placeholder="ex: Volvo Trucks"
                    className={inputCls()}
                  />
                </Field>

                <Field label="Date d'expiration" required>
                  <input
                    type="date"
                    value={form.warrantyExpiryDate}
                    onChange={(e) => set('warrantyExpiryDate', e.target.value)}
                    disabled={isReadOnly}
                    className={inputCls()}
                  />
                </Field>

                <Field label="Kilométrage maximal couvert">
                  <input
                    type="number"
                    value={form.warrantyExpiryMileage}
                    onChange={(e) => setNum('warrantyExpiryMileage', e.target.value)}
                    disabled={isReadOnly}
                    className={inputCls()}
                  />
                </Field>

                <Field label="Statut de la garantie">
                  <select
                    value={form.warrantyStatus}
                    onChange={(e) => set('warrantyStatus', e.target.value as any)}
                    disabled={isReadOnly}
                    className={selectCls}
                  >
                    <option value="active">Active</option>
                    <option value="expiring_soon">Expire bientôt</option>
                    <option value="expired">Expirée</option>
                  </select>
                </Field>
                
                <div className="sm:col-span-2">
                  <Field label="Systèmes couverts">
                    <div className="flex flex-wrap gap-2 mt-1">
                      {['Engine', 'Transmission', 'Electrical', 'Chassis'].map((sys) => (
                        <label key={sys} className="flex items-center gap-1.5 bg-white px-3 py-1.5 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition">
                          <input
                            type="checkbox"
                            checked={form.warrantyCoveredSystems.includes(sys)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              set('warrantyCoveredSystems', checked
                                ? [...form.warrantyCoveredSystems, sys]
                                : form.warrantyCoveredSystems.filter((s) => s !== sys)
                              );
                            }}
                            disabled={isReadOnly}
                            className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                          />
                          <span className="text-xs font-semibold text-slate-700">{sys}</span>
                        </label>
                      ))}
                    </div>
                  </Field>
                </div>
              </div>
            )}
          </section>

          {/* Scores diagnostics */}
          <section>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-3 flex items-center gap-1.5">
              <Shield className="h-3 w-3" />
              {t('vehicle.modal.section_scores', {}, 'Scores Diagnostics (0-100)')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label={t('vehicle.modal.fault_score', {}, 'Score Defauts')}>
                <input
                  id="vehicle-fault-score"
                  type="number"
                  min={0}
                  max={100}
                  value={form.fault_score}
                  onChange={e => setNum('fault_score', e.target.value)}
                  disabled={isReadOnly}
                  className={inputCls()}
                />
              </Field>

              <Field label={t('vehicle.modal.compliance_score', {}, 'Score Conformite (%)')}>
                <input
                  id="vehicle-compliance-score"
                  type="number"
                  min={0}
                  max={100}
                  value={form.compliance_score}
                  onChange={e => setNum('compliance_score', e.target.value)}
                  disabled={isReadOnly}
                  className={inputCls()}
                />
              </Field>

              <Field label={t('vehicle.modal.freshness_score', {}, 'Fraicheur (jours)')}>
                <input
                  id="vehicle-freshness-score"
                  type="number"
                  min={0}
                  value={form.freshness_score}
                  onChange={e => setNum('freshness_score', e.target.value)}
                  disabled={isReadOnly}
                  className={inputCls()}
                />
              </Field>
            </div>
          </section>

          {/* CAE tags */}
          <section>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
              <Route className="h-3 w-3" />
              {t('vehicle.modal.section_cae', {}, 'CAE - Parametres calcules automatiquement')}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                Poids classification : x{form.classification_weight}
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
                Multiplicateur delai : x{form.delay_multiplier}
              </span>
            </div>
          </section>
        </form>

        {/* Footer */}
        {!isReadOnly && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/80">
            <button
              type="button"
              onClick={onClose}
              id="vehicle-modal-cancel"
              className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
            >
              {t('common.cancel', {}, 'Annuler')}
            </button>
            <button
              type="submit"
              form="vehicle-form"
              id="vehicle-modal-save"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2 transition cursor-pointer"
            >
              {saving ? (
                <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving
                ? t('common.saving', {}, 'Enregistrement...')
                : isEdit
                ? t('vehicle.modal.save_edit', {}, 'Enregistrer les modifications')
                : t('vehicle.modal.save_create', {}, 'Creer le vehicule')}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>
    </>
  );
};
