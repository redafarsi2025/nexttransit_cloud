import React, { useState } from 'react';
import { useFleet } from '../../context/FleetContext';
import { useLocalization } from '../../context/LocalizationContext';
import { KPIBadge } from '../common/KPIBadge';
import {
  Truck,
  AlertTriangle,
  Send,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';

export const DriverMobileView: React.FC = () => {
  const { vehicles, submitDriverIncident } = useFleet();
  const { t } = useLocalization();

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || '');
  const [incidentCategory, setIncidentCategory] = useState<'Noise' | 'Warning Light' | 'Damage' | 'Other'>('Noise');
  const [description, setDescription] = useState<string>('');
  const [submittedMsg, setSubmittedMsg] = useState<string | null>(null);

  const currentVehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    submitDriverIncident(selectedVehicleId, incidentCategory, description, 'Mohamed Farsi (Driver)');

    setSubmittedMsg(`Report submitted for ${currentVehicle.plate}! If no OBD fault matches, Rule R6 Investigation alert was dispatched.`);
    setDescription('');
    setTimeout(() => setSubmittedMsg(null), 5000);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-xl mx-auto">
      {/* Driver Mobile Header */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <Smartphone className="h-4 w-4" /> {t('driver.header_tag', {}, 'Fleet Driver Mobile View')}
          </div>
          <KPIBadge type="Calculated" formula="Rule R6 Investigation Auto-Trigger" />
        </div>
        <div>
          <h1 className="text-xl font-black">{t('driver.header_title', {}, 'Pre-Trip & Route Incident Logger')}</h1>
          <p className="text-xs text-slate-300">{t('driver.header_desc', {}, 'Driver companion view for vehicle checks and incident logging.')}</p>
        </div>
      </div>

      {/* Vehicle Selection & Telemetry Status Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">{t('driver.select_vehicle', {}, 'Select Assigned Coach / Van')}</label>
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800"
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.plate}) — {t('common.status', {}, 'Status')}: {t(`status.${v.status.toLowerCase()}`, {}, v.status)}
              </option>
            ))}
          </select>
        </div>

        {currentVehicle && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-black text-slate-900 text-sm">{currentVehicle.name}</span>
                <span className="ml-2 font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {currentVehicle.plate}
                </span>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  currentVehicle.status === 'Healthy'
                    ? 'bg-emerald-100 text-emerald-800'
                    : currentVehicle.status === 'Attention'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {t(`status.${currentVehicle.status.toLowerCase()}`, {}, currentVehicle.status)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('common.route', {}, 'Route')}</span>
                <span className="font-bold text-slate-800">{currentVehicle.scheduled_route}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">{t('common.departure', {}, 'Departure')}</span>
                <span className="font-bold text-slate-800">{t('common.in_days', { days: currentVehicle.scheduled_use_days }, `In ${currentVehicle.scheduled_use_days} Days`)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Incident Submission Form */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          {t('driver.report_title', {}, 'Report Driver Observed Issue / Noise (Rule R6)')}
        </h2>

        {submittedMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {submittedMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">{t('driver.issue_category', {}, 'Issue Category')}</label>
            <div className="grid grid-cols-2 gap-2">
              {(['Noise', 'Warning Light', 'Damage', 'Other'] as const).map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setIncidentCategory(cat)}
                  className={`p-2.5 rounded-xl font-bold transition cursor-pointer text-center ${
                    incidentCategory === cat
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {t(`incident.category_${cat.toLowerCase().replace(' ', '_')}`, {}, cat)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">{t('driver.symptom_desc', {}, 'Description of Symptoms')}</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('driver.symptom_placeholder', {}, 'Describe what you heard, saw, or felt during drive or pre-trip inspection...')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
          >
            <Send className="h-4 w-4" />
            <span>{t('driver.btn_submit', {}, 'Submit Driver Incident Report')}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

