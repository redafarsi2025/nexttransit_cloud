import React from 'react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useLocalization } from '../../context/LocalizationContext';
import { FleetAlert } from '../../types';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  X,
  ArrowRight,
  Package,
  Calendar,
} from 'lucide-react';

interface AlertFeedModalProps {
  onClose: () => void;
}

export const AlertFeedModal: React.FC<AlertFeedModalProps> = ({ onClose }) => {
  const { alerts, markAlertRead, setSelectedVehicleId, inventory } = useFleet();
  const { changeScreen } = useAuth();
  const { t } = useLocalization();

  const openAlerts = alerts.filter((a) => !a.read);
  const readAlerts = alerts.filter((a) => a.read);

  const handleActionClick = (alert: FleetAlert) => {
    markAlertRead(alert.id);
    if (alert.vehicle_id) {
      setSelectedVehicleId(alert.vehicle_id);
    }
    if (alert.rule_id === 'R4') {
      changeScreen('CONFLICT_ALERTS');
      onClose();
    } else if (alert.rule_id === 'R3' || alert.rule_id === 'R5') {
      changeScreen('INVENTORY_DASHBOARD');
      onClose();
    } else if (alert.rule_id === 'R6') {
      changeScreen('INCIDENT_REPORTS');
      onClose();
    } else if (alert.rule_id === 'R7') {
      changeScreen('VARIANCE_DASHBOARD');
      onClose();
    } else {
      changeScreen('FLEET_HEALTH_GRID');
      onClose();
    }
  };

  const getAlertIcon = (severity: FleetAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />;
      default:
        return <Info className="h-5 w-5 text-blue-600 shrink-0" />;
    }
  };

  const getRuleBadge = (ruleId: FleetAlert['rule_id']) => {
    const labels: Record<FleetAlert['rule_id'], string> = {
      R1: 'R1: Fault Detected',
      R2: 'R2: Maintenance Due',
      R3: 'R1+R3: Linked Part Alert',
      R4: 'R4: Schedule Conflict',
      R5: 'R5: Stock Shortfall',
      R6: 'R6: Investigation',
      R7: 'R7: Budget Variance',
    };
    return (
      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
        {labels[ruleId]}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs">
      <div className="h-full w-full max-w-lg bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-500/20 p-2 text-red-400 border border-red-500/30">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">{t('alertfeed.title', {}, 'Rule-Based Active Alerts')}</h3>
              <p className="text-xs text-slate-300">
                {openAlerts.length} {t('alertfeed.unread_count', {}, 'unread notification(s)')} • {t('alertfeed.subtitle', {}, 'Linked inventory & schedule rules')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
              <p className="font-semibold text-slate-700">{t('alertfeed.no_alerts', {}, 'No active alerts')}</p>
              <p className="text-xs text-slate-500">{t('alertfeed.all_nominal', {}, 'All fleet systems and inventory thresholds nominal.')}</p>
            </div>
          ) : (
            <>
              {openAlerts.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t('alertfeed.open_alerts', {}, 'Open Alerts')} ({openAlerts.length})
                  </div>
                  {openAlerts.map((alert) => {
                    const linkedPart = alert.part_id ? inventory.find((i) => i.id === alert.part_id) : null;
                    return (
                      <div
                        key={alert.id}
                        className={`rounded-xl border p-4 transition ${
                          alert.severity === 'critical'
                            ? 'border-red-200 bg-red-50/40 hover:bg-red-50/80'
                            : alert.severity === 'warning'
                            ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-50/80'
                            : 'border-blue-200 bg-blue-50/40 hover:bg-blue-50/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            {getAlertIcon(alert.severity)}
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {getRuleBadge(alert.rule_id)}
                                <span className="text-xs text-slate-500">{alert.timestamp}</span>
                              </div>
                              <h4 className="mt-1 font-bold text-slate-900 text-sm">{alert.title}</h4>
                              <p className="mt-1 text-xs text-slate-700 leading-relaxed">
                                {alert.description}
                              </p>

                              {/* R3: Linked Part Info box if part_id is linked */}
                              {linkedPart && (
                                <div className="mt-2.5 rounded-lg bg-white p-2.5 border border-slate-200 flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-emerald-600" />
                                    <div>
                                      <span className="font-semibold text-slate-900">{linkedPart.name}</span>
                                      <span className="text-slate-500 ml-1.5">
                                        (SKU: {linkedPart.sku})
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right font-mono font-semibold">
                                    Stock: {linkedPart.quantity}{' '}
                                    <span className="text-slate-400">/ Thresh: {linkedPart.reorder_threshold}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200/60">
                          <button
                            onClick={() => markAlertRead(alert.id)}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            {t('alertfeed.mark_read', {}, 'Mark as Read')}
                          </button>

                          <button
                            onClick={() => handleActionClick(alert)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                          >
                            <span>{t('alertfeed.inspect_source', {}, 'Inspect Source')}</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {readAlerts.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t('alertfeed.prev_alerts', {}, 'Previous Alerts')} ({readAlerts.length})
                  </div>
                  {readAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 opacity-75 hover:opacity-100 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getRuleBadge(alert.rule_id)}
                          <span className="font-semibold text-xs text-slate-700">{alert.title}</span>
                        </div>
                        <span className="text-xs text-slate-400">{alert.timestamp}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600 line-clamp-2">{alert.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
          <span className="text-xs text-slate-500">
            {t('alertfeed.rules_active', {}, 'Rules R1, R2, R3, R4, R6, R7 are active')}
          </span>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800 cursor-pointer"
          >
            {t('common.close', {}, 'Close Feed')}
          </button>
        </div>
      </div>
    </div>
  );
};

