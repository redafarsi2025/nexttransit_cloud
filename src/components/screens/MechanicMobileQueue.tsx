import React, { useState } from 'react';
import { useFleet } from '../../context/FleetContext';
import { useLocalization } from '../../context/LocalizationContext';
import { KPIBadge } from '../common/KPIBadge';
import {
  Smartphone,
  Wrench,
  Activity,
  CheckCircle2,
  Clock,
  PlusCircle,
  QrCode,
  ShieldAlert,
} from 'lucide-react';

export const MechanicMobileQueue: React.FC = () => {
  const {
    workOrders,
    vehicles,
    inventory,
    logOBDFault,
    closeWorkOrder,
    setSelectedVehicleId,
  } = useFleet();
  const { t } = useLocalization();

  const [scanVehicleId, setScanVehicleId] = useState<string>(vehicles[0]?.id || '');
  const [scanFaultCode, setScanFaultCode] = useState<string>('P0299');
  const [scanFaultName, setScanFaultName] = useState<string>('Turbocharger Boost Sensor Circuit Low');
  const [scanSeverity, setScanSeverity] = useState<'Critical' | 'Warning' | 'Info'>('Critical');
  const [scanPartId, setScanPartId] = useState<string>('TURBO-SENS-01');

  const [scanSuccessMsg, setScanSuccessMsg] = useState<string | null>(null);

  const [closeWOId, setCloseWOId] = useState<string | null>(null);
  const [closeNotes, setCloseNotes] = useState<string>('Replaced faulty sensor and reset ECU parameters.');

  const assignedWorkOrders = workOrders.filter((wo) => wo.status !== 'Closed');

  const handleSimulateOBDScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const vehicle = vehicles.find((v) => v.id === scanVehicleId);
    if (!vehicle) return;

    await logOBDFault(scanVehicleId, {
      code: scanFaultCode,
      name: scanFaultName,
      severity: scanSeverity,
      required_part_id: scanPartId || undefined,
      required_intervention: `Replace ${scanFaultName} component and clear fault log.`,
    });

    setScanSuccessMsg(`Logged fault ${scanFaultCode} on ${vehicle.plate}. Rules R1/R3/R4 triggered!`);
    setTimeout(() => setScanSuccessMsg(null), 4000);
  };

  const handleCloseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeWOId) return;
    closeWorkOrder(closeWOId, closeNotes);
    setCloseWOId(null);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto">
      {/* Mobile Card Header */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <Smartphone className="h-4 w-4" /> {t('mechanic.header_tag', {}, 'Workshop Mechanic Mobile View')}
          </div>
          <KPIBadge type="Calculated" formula="Direct OBD Telemetry Linkage" />
        </div>
        <h1 className="text-xl font-black tracking-tight">{t('mechanic.header_title', {}, 'Workshop Task Queue & Diagnostic Scan')}</h1>
        <p className="text-xs text-slate-400">
          {t('mechanic.header_desc', {}, 'Mobile view for technicians. Scan vehicle OBD ports and close completed work orders.')}
        </p>
      </div>

      {/* Interactive OBD Scanner Tool */}
      <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
          <QrCode className="h-5 w-5 text-indigo-600" />
          {t('mechanic.scanner_title', {}, 'Simulate OBD-II Diagnostic Scan (Golden Path Trigger)')}
        </div>
        <p className="text-xs text-slate-500">
          {t('mechanic.scanner_desc', {}, 'Connect virtual scanner to vehicle ECU to log diagnostic trouble codes (DTCs).')}
        </p>

        {scanSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {scanSuccessMsg}
          </div>
        )}

        <form onSubmit={handleSimulateOBDScan} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">{t('mechanic.target_vehicle', {}, 'Target Vehicle in Workshop')}</label>
            <select
              value={scanVehicleId}
              onChange={(e) => setScanVehicleId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.plate}) — {t('common.status', {}, 'Status')}: {t(`status.${v.status.toLowerCase()}`, {}, v.status)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">{t('mechanic.obd_code', {}, 'OBD Trouble Code')}</label>
              <input
                type="text"
                value={scanFaultCode}
                onChange={(e) => setScanFaultCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono font-bold text-indigo-600"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">{t('mechanic.severity_tier', {}, 'Severity Tier')}</label>
              <select
                value={scanSeverity}
                onChange={(e) => setScanSeverity(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-800"
              >
                <option value="Critical">{t('severity.critical', {}, 'Critical (Red)')}</option>
                <option value="Warning">{t('severity.warning', {}, 'Warning (Amber)')}</option>
                <option value="Info">{t('severity.info', {}, 'Info (Blue)')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">{t('mechanic.fault_name', {}, 'Fault Name / Description')}</label>
            <input
              type="text"
              value={scanFaultName}
              onChange={(e) => setScanFaultName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-medium text-slate-800"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">{t('mechanic.linked_part', {}, 'Linked Part Required from Warehouse')}</label>
            <select
              value={scanPartId}
              onChange={(e) => setScanPartId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-medium text-slate-800"
            >
              <option value="">{t('mechanic.none_required', {}, 'None Required')}</option>
              {inventory.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (SKU: {p.sku} - Stock: {p.quantity})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
          >
            <Activity className="h-4 w-4" />
            <span>{t('mechanic.btn_scan', {}, 'Execute OBD Fault Scan Log')}</span>
          </button>
        </form>
      </div>

      {/* Active Work Orders */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Wrench className="h-4 w-4 text-indigo-600" />
          {t('mechanic.assigned_orders', {}, 'Assigned Open Work Orders')} ({assignedWorkOrders.length})
        </h3>

        {assignedWorkOrders.map((wo) => (
          <div
            key={wo.id}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono font-black text-slate-900 text-sm">{wo.id}</span>
                <span className="ml-2 font-bold text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {wo.vehicle_plate}
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                {t(`wostatus.${wo.status.toLowerCase().replace(' ', '_')}`, {}, wo.status)}
              </span>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium">
              "{wo.before_after_notes?.before || ''}"
            </p>

            <button
              onClick={() => setCloseWOId(wo.id)}
              className="w-full py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{t('mechanic.complete_deduct', {}, 'Complete & Deduct Parts')}</span>
            </button>
          </div>
        ))}
      </div>

      {/* Close WO Dialog */}
      {closeWOId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-3 border border-slate-200 shadow-xl">
            <h3 className="font-bold text-slate-900 text-sm">{t('mechanic.close_wo_title', {}, 'Close Work Order #')}{closeWOId}</h3>
            <textarea
              rows={3}
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-medium"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setCloseWOId(null)}
                className="px-3 py-2 bg-slate-100 font-bold rounded-xl cursor-pointer"
              >
                {t('common.cancel', {}, 'Cancel')}
              </button>
              <button
                onClick={handleCloseSubmit}
                className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl cursor-pointer"
              >
                {t('mechanic.submit_completion', {}, 'Submit Completion')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

