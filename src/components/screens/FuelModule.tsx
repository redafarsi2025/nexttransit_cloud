import React, { useState, useMemo } from 'react';
import { useFleet } from '../../context/FleetContext';
import { useTenant } from '../../context/TenantContext';
import { useLocalization } from '../../context/LocalizationContext';
import { fuelService, CalculatedFuelLog } from '../../services/fuelService';
import { KPIBadge } from '../common/KPIBadge';
import {
  Fuel,
  AlertTriangle,
  PlusCircle,
  TrendingUp,
  Filter,
  CheckCircle2,
  Gauge,
  DollarSign,
  Droplet,
  History,
} from 'lucide-react';

export const FuelModule: React.FC = () => {
  const { vehicles, fuelLogs, addFuelLog } = useFleet();
  const { activeTenant } = useTenant();
  const { t } = useLocalization();

  // Selected vehicle filter for trend view
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('ALL');

  // Form State
  const [formVehicleId, setFormVehicleId] = useState<string>(vehicles[0]?.id || 'V-024');
  const [formLiters, setFormLiters] = useState<string>('120');
  const [formCost, setFormCost] = useState<string>('180');
  const [formOdometer, setFormOdometer] = useState<string>('126500');
  const [formLoggedAt, setFormLoggedAt] = useState<string>(
    new Date().toISOString().slice(0, 16)
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitFeedback, setSubmitFeedback] = useState<{
    type: 'success' | 'anomaly' | 'error';
    message: string;
  } | null>(null);

  const currencySymbol = activeTenant?.currencySymbol || '$';

  // Evaluate all fuel logs with consumption and anomaly detection
  const evaluatedLogs: CalculatedFuelLog[] = useMemo(() => {
    return fuelService.detectAnomalies(fuelLogs);
  }, [fuelLogs]);

  // Filtered evaluated logs for trend view
  const filteredEvaluatedLogs = useMemo(() => {
    if (selectedVehicleId === 'ALL') {
      return evaluatedLogs;
    }
    return evaluatedLogs.filter((item) => item.log.vehicle_id === selectedVehicleId);
  }, [evaluatedLogs, selectedVehicleId]);

  // Anomaly logs only
  const anomalyLogs = useMemo(() => {
    return evaluatedLogs.filter((item) => item.isAnomalous);
  }, [evaluatedLogs]);

  // High-level aggregates
  const totalLiters = useMemo(
    () => fuelLogs.reduce((sum, l) => sum + Number(l.liters || 0), 0),
    [fuelLogs]
  );
  const totalCost = useMemo(
    () => fuelLogs.reduce((sum, l) => sum + Number(l.cost || 0), 0),
    [fuelLogs]
  );
  const validConsumptionItems = useMemo(
    () => evaluatedLogs.filter((e) => e.consumptionLPer100Km !== null),
    [evaluatedLogs]
  );
  const avgConsumption = useMemo(() => {
    if (validConsumptionItems.length === 0) return 0;
    const sum = validConsumptionItems.reduce(
      (acc, curr) => acc + (curr.consumptionLPer100Km || 0),
      0
    );
    return (sum / validConsumptionItems.length).toFixed(1);
  }, [validConsumptionItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitFeedback(null);

    const liters = parseFloat(formLiters);
    const cost = parseFloat(formCost);
    const odometer = parseInt(formOdometer, 10);

    if (isNaN(liters) || liters <= 0 || isNaN(cost) || cost < 0 || isNaN(odometer) || odometer <= 0) {
      setSubmitFeedback({
        type: 'error',
        message: t('fuel.invalid_input', {}, 'Please enter valid positive values for Liters, Cost, and Odometer.'),
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const created = await addFuelLog({
        vehicle_id: formVehicleId,
        liters,
        cost,
        odometer_km: odometer,
        logged_at: formLoggedAt ? new Date(formLoggedAt).toISOString() : undefined,
      });

      if (created.anomaly_flag) {
        setSubmitFeedback({
          type: 'anomaly',
          message: t(
            'fuel.anomaly_logged',
            {},
            '⚠️ Fuel log recorded. WARNING: High consumption anomaly detected (>20% over 90-day baseline)!'
          ),
        });
      } else {
        setSubmitFeedback({
          type: 'success',
          message: t('fuel.success_logged', {}, 'Fuel log recorded successfully within normal baseline range.'),
        });
      }

      // Increment odometer for convenience in next log
      setFormOdometer((odometer + 400).toString());
    } catch (err) {
      setSubmitFeedback({
        type: 'error',
        message: t('fuel.save_error', {}, 'Failed to record fuel log.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Fuel className="h-4 w-4" /> {t('fuel.header_tag', {}, 'Telemetry & Fleet Fuel Operations')}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t('fuel.header_title', {}, 'Fuel Consumption & R7 Anomaly Detection')}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {t(
              'fuel.header_desc', {},
              'Track fuel logs, compute L/100km efficiency between refueling events, and flag consumption spikes exceeding 20% over the trailing 90-day baseline.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <KPIBadge type="Calculated" formula="Consumption = (Liters / Distance_km) * 100" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>{t('fuel.total_volume', {}, 'Total Fuel Volume')}</span>
            <Droplet className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">
            {totalLiters.toLocaleString()} L
          </div>
          <p className="text-xs text-slate-500">{fuelLogs.length} {t('fuel.recorded_logs', {}, 'recorded refuel entries')}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>{t('fuel.total_cost', {}, 'Total Fuel Expenditure')}</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">
            {currencySymbol}{totalCost.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500">{t('fuel.feeds_r7', {}, 'Feeds R7 Cost Category')}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>{t('fuel.avg_consumption', {}, 'Fleet Avg Consumption')}</span>
            <Gauge className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">
            {avgConsumption} <span className="text-sm font-semibold text-slate-500">L/100km</span>
          </div>
          <p className="text-xs text-slate-500">{t('fuel.consecutive_baseline', {}, 'Across consecutive logs')}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>{t('fuel.anomalies_flagged', {}, 'R7 Fuel Anomalies')}</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className={`text-3xl font-black ${anomalyLogs.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {anomalyLogs.length}
          </div>
          <p className="text-xs text-slate-500">{t('fuel.exceeds_20pct', {}, '>20% over 90d baseline')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Log Entry Form (1 col) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-indigo-600" />
              {t('fuel.log_entry_title', {}, 'Record Refuel Entry')}
            </h2>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded">
              Rule R7
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('fuel.select_vehicle', {}, 'Vehicle')}
              </label>
              <select
                value={formVehicleId}
                onChange={(e) => setFormVehicleId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-hidden focus:border-indigo-500 focus:bg-white"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate} — {v.name} ({v.classification})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('fuel.volume_liters', {}, 'Fuel Volume (Liters)')}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  value={formLiters}
                  onChange={(e) => setFormLiters(e.target.value)}
                  placeholder="120"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-hidden focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('fuel.cost_amount', {}, `Cost (${currencySymbol})`)}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formCost}
                  onChange={(e) => setFormCost(e.target.value)}
                  placeholder="180"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-hidden focus:border-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('fuel.odometer_km', {}, 'Odometer (km)')}
              </label>
              <input
                type="number"
                min="0"
                value={formOdometer}
                onChange={(e) => setFormOdometer(e.target.value)}
                placeholder="125400"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-hidden focus:border-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('fuel.logged_at', {}, 'Refuel Date & Time')}
              </label>
              <input
                type="datetime-local"
                value={formLoggedAt}
                onChange={(e) => setFormLoggedAt(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 outline-hidden focus:border-indigo-500 focus:bg-white"
              />
            </div>

            {submitFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 ${
                  submitFeedback.type === 'anomaly'
                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                    : submitFeedback.type === 'error'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {submitFeedback.type === 'anomaly' ? (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                ) : submitFeedback.type === 'error' ? (
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
              {isSubmitting ? t('fuel.saving', {}, 'Recording...') : t('fuel.submit_btn', {}, 'Record Refuel Entry')}
            </button>
          </form>
        </div>

        {/* Per-Vehicle Consumption Trend & History (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="h-5 w-5 text-indigo-600" />
                {t('fuel.consumption_trend_title', {}, 'Per-Vehicle Consumption & Log Trend')}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('fuel.trend_subtitle', {}, 'Calculated consumption (L/100km) between consecutive odometer intervals.')}
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl text-xs">
              <Filter className="h-3.5 w-3.5 text-slate-500" />
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="bg-transparent font-semibold text-slate-700 outline-hidden cursor-pointer"
              >
                <option value="ALL">All Fleet Vehicles</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate} — {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Refuel Date</th>
                  <th className="p-3">Vehicle</th>
                  <th className="p-3">Odometer</th>
                  <th className="p-3 text-right">Distance</th>
                  <th className="p-3 text-right">Liters</th>
                  <th className="p-3 text-right">Cost</th>
                  <th className="p-3 text-right">L/100km</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredEvaluatedLogs.map((item) => {
                  const vehicle = vehicles.find((v) => v.id === item.log.vehicle_id);

                  return (
                    <tr
                      key={item.log.id}
                      className={`hover:bg-slate-50 transition ${
                        item.isAnomalous ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      <td className="p-3 font-mono text-slate-600">
                        {new Date(item.log.logged_at).toLocaleDateString()} {new Date(item.log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-indigo-600">{vehicle?.plate || item.log.vehicle_id}</span>
                        {vehicle?.name && (
                          <span className="block text-[10px] text-slate-400">{vehicle.name}</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-slate-700">
                        {item.log.odometer_km.toLocaleString()} km
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">
                        {item.distanceKm !== null ? `+${item.distanceKm} km` : '—'}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        {item.log.liters} L
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        {currencySymbol}{item.log.cost.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        {item.consumptionLPer100Km !== null ? (
                          <span
                            className={
                              item.isAnomalous ? 'text-rose-700 text-sm' : 'text-slate-900'
                            }
                          >
                            {item.consumptionLPer100Km} L/100km
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Initial Base Log</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {item.isAnomalous ? (
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 inline-flex items-center gap-1"
                            title={`Exceeds 90-day baseline avg (${item.trailing90DayAvg} L/100km) by >20%`}
                          >
                            <AlertTriangle className="h-3 w-3" /> Anomaly
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Normal
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Anomaly Audit Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <h2 className="text-base font-bold text-slate-900">
              {t('fuel.anomaly_section_title', {}, 'R7 Fuel Consumption Anomaly Audit')}
            </h2>
          </div>
          <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
            {anomalyLogs.length} {t('fuel.flagged_count', {}, 'Flagged Logs')}
          </span>
        </div>

        {anomalyLogs.length === 0 ? (
          <div className="p-6 rounded-xl border border-slate-100 bg-slate-50 text-center space-y-1">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
            <p className="text-xs font-bold text-slate-800">
              {t('fuel.no_anomalies_title', {}, 'Zero Fuel Consumption Anomalies Detected')}
            </p>
            <p className="text-[11px] text-slate-500">
              {t('fuel.no_anomalies_desc', {}, 'All recorded fuel logs fall within 20% of their trailing 90-day vehicle baselines.')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {anomalyLogs.map((item) => {
              const vehicle = vehicles.find((v) => v.id === item.log.vehicle_id);

              return (
                <div
                  key={item.log.id}
                  className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-indigo-900">
                      {vehicle?.plate || item.log.vehicle_id} ({vehicle?.name})
                    </span>
                    <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                      +20% Baseline Spike
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs font-medium text-slate-700 bg-white p-2.5 rounded-lg border border-rose-100">
                    <div>
                      <span className="block text-[10px] text-slate-400">Recorded Rate</span>
                      <span className="font-bold text-rose-700 text-sm">
                        {item.consumptionLPer100Km} L/100km
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">90d Baseline</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {item.trailing90DayAvg} L/100km
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">Refuel Volume</span>
                      <span className="font-bold text-slate-800 text-sm">{item.log.liters} L</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-rose-900 leading-tight">
                    Refuel logged on {new Date(item.log.logged_at).toLocaleDateString()} at {item.log.odometer_km} km.
                    Consumption spike requires driver incident review or diagnostic check for fuel line leakage / injector malfunction.
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
