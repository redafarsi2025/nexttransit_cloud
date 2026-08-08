import React, { useState, useEffect, useMemo } from 'react';
import { useFleet } from '../../context/FleetContext';
import { useLocalization } from '../../context/LocalizationContext';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Radio,
  Cpu,
  Activity,
  AlertTriangle,
  MapPin,
  RefreshCw,
  CheckCircle2,
  Sliders,
  Terminal,
  Zap,
  Navigation,
  ShieldAlert,
  TrendingUp,
  BarChart2,
  Thermometer,
  Gauge,
  Brain,
  Sparkles,
  Clock,
  Wrench,
  Flame,
  Bot,
  Layers,
} from 'lucide-react';
import {
  DeviceMapping,
  Position,
  ActiveFaultCode,
  Vehicle,
  PredictiveAiResult,
} from '../../types';
import {
  fetchDeviceMappings,
  getProviderForVehicle,
  ManualEntryProvider,
  saveDeviceMapping,
  NextTransitIoTGatewayAdapter,
} from '../../services/telematicsService';
import { analyzeVehiclePredictiveRisk } from '../../services/predictiveAiService';

interface VehicleTelemetryState {
  vehicle: Vehicle;
  mapping?: DeviceMapping;
  providerName: string;
  isConnected: boolean;
  position: Position | null;
  faultCodes: ActiveFaultCode[];
  lastUpdate: string;
}

export const TelemetryStream: React.FC = () => {
  const { vehicles, logOBDFault, createWorkOrder } = useFleet();
  const { t } = useLocalization();

  const [deviceMappings, setDeviceMappings] = useState<DeviceMapping[]>([]);
  const [telemetryStates, setTelemetryStates] = useState<Record<string, VehicleTelemetryState>>({});
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [eventLogs, setEventLogs] = useState<{ id: string; time: string; text: string; level: 'info' | 'warn' | 'error' }[]>([]);

  // Phase 2 Predictive AI & Adapter States
  const [selectedAiVehicleId, setSelectedAiVehicleId] = useState<string>('');
  const [predictiveResult, setPredictiveResult] = useState<PredictiveAiResult | null>(null);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState<boolean>(false);

  useEffect(() => {
    if (vehicles.length > 0 && !selectedAiVehicleId) {
      setSelectedAiVehicleId(vehicles[0].id);
    }
  }, [vehicles]);

  const addLog = (text: string, level: 'info' | 'warn' | 'error' = 'info') => {
    const newLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      time: new Date().toLocaleTimeString(),
      text,
      level,
    };
    setEventLogs((prev) => [newLog, ...prev.slice(0, 24)]);
  };

  const handleRunPredictiveAi = async () => {
    const targetVehicle = vehicles.find((v) => v.id === selectedAiVehicleId) || vehicles[0];
    if (!targetVehicle) return;

    setIsAnalyzingAi(true);
    addLog(`🧠 Invoking Gemini 3.6 Flash Predictive AI Failure Model for vehicle ${targetVehicle.name} (${targetVehicle.plate})...`);

    try {
      const result = await analyzeVehiclePredictiveRisk(targetVehicle);
      setPredictiveResult(result);
      if (result.predictive_r1_alert) {
        addLog(
          `🚨 PREDICTIVE R1 ALERT: High breakdown risk (${result.failure_likelihood_percentage}%) predicted in ~${result.estimated_hours_to_failure}h on [${result.critical_subsystem}]!`,
          'error'
        );
      } else {
        addLog(
          `✅ Predictive AI analysis complete for ${targetVehicle.plate}. System health nominal (${result.failure_likelihood_percentage}% risk).`,
          'info'
        );
      }
    } catch (err) {
      addLog('Predictive AI analysis encountered an error.', 'error');
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const handleDispatchPredictiveWorkOrder = async () => {
    if (!predictiveResult) return;

    const targetVehicle = vehicles.find((v) => v.id === predictiveResult.vehicle_id);
    if (!targetVehicle) return;

    try {
      if (createWorkOrder) {
        await createWorkOrder({
          vehicle_id: targetVehicle.id,
          type: 'Preventive',
          assigned_mechanic_id: targetVehicle.assigned_mechanic_id || 'MEC-01',
          assigned_mechanic_name: 'Atelier Central (R1-Prédictive Dispatch)',
          related_fault_code: `PRED-AI-${predictiveResult.critical_subsystem.substring(0, 3).toUpperCase()}`,
          labor_hours: 4,
          hourly_rate: 85,
          parts_used: [],
          before_notes: `DÉCLENCHEMENT PRÉVENTIF IA (R1-Prédictive) : Risque de panne estimé à ${predictiveResult.failure_likelihood_percentage}% sous ${predictiveResult.estimated_hours_to_failure}h. Sous-système : ${predictiveResult.critical_subsystem}. Action recommandée : ${predictiveResult.recommended_action}`,
        });
      }

      addLog(`📋 Dispatched Preventive Work Order for ${targetVehicle.plate} based on Gemini R1-Prédictive recommendation.`, 'info');
    } catch (err) {
      addLog('Failed to dispatch preventive work order.', 'error');
    }
  };

  const handleSwitchAdapter = async (vehicleId: string, newProvider: any) => {
    const current = deviceMappings.find((m) => m.vehicle_id === vehicleId);
    const updatedMapping = await saveDeviceMapping({
      id: current?.id,
      tenant_id: current?.tenant_id || '',
      vehicle_id: vehicleId,
      provider: newProvider,
      external_device_id: newProvider === 'nexttransit_gateway' ? `NT-GW-${vehicleId}` : `EXT-DEV-${vehicleId}`,
    });

    setDeviceMappings((prev) => {
      const existingIdx = prev.findIndex((m) => m.vehicle_id === vehicleId);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = updatedMapping;
        return next;
      }
      return [...prev, updatedMapping];
    });

    addLog(`🔄 Ingestion adapter updated for ${vehicleId} -> [${newProvider.toUpperCase()}]`, 'info');
    loadTelemetryData();
  };

  const loadTelemetryData = async () => {
    setIsRefreshing(true);
    try {
      const mappings = await fetchDeviceMappings();
      setDeviceMappings(mappings);

      const nextStates: Record<string, VehicleTelemetryState> = {};

      for (const v of vehicles) {
        const mapping = mappings.find((m) => m.vehicle_id === v.id);
        const provider = getProviderForVehicle(v.id, mappings, vehicles);

        const position = await provider.getPosition(v.id);
        const faultCodes = await provider.getFaultCodes(v.id);

        nextStates[v.id] = {
          vehicle: v,
          mapping,
          providerName: provider.providerName,
          isConnected: provider.isConnected,
          position,
          faultCodes,
          lastUpdate: new Date().toLocaleTimeString(),
        };
      }

      setTelemetryStates(nextStates);
      addLog(`Loaded telematics streams for ${vehicles.length} vehicles via TelematicsProvider abstraction layer.`);
    } catch (err) {
      console.warn('Failed to load telematics data', err);
      addLog('Failed to fetch device mappings or telematics stream', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadTelemetryData();
  }, [vehicles.length]);

  // Subscribe to live telemetry updates for each vehicle
  useEffect(() => {
    if (vehicles.length === 0) return;

    const unsubscribers: (() => void)[] = [];

    vehicles.forEach((v) => {
      const provider = getProviderForVehicle(v.id, deviceMappings, vehicles);
      const unsub = provider.subscribe(v.id, ({ faultCodes, position }) => {
        setTelemetryStates((prev) => {
          const current = prev[v.id];
          if (!current) return prev;
          return {
            ...prev,
            [v.id]: {
              ...current,
              position: position !== undefined ? position : current.position,
              faultCodes: faultCodes !== undefined ? faultCodes : current.faultCodes,
              lastUpdate: new Date().toLocaleTimeString(),
            },
          };
        });

        if (faultCodes) {
          addLog(
            `[Stream Callback] Received ${faultCodes.length} fault codes for ${v.name} (${v.plate}) via adapter [${provider.providerName.toUpperCase()}]`,
            faultCodes.some((f) => f.severity === 'Critical') ? 'error' : 'info'
          );
        }
      });
      unsubscribers.push(unsub);
    });

    return () => {
      unsubscribers.forEach((fn) => fn());
    };
  }, [vehicles, deviceMappings]);

  // Handler: Inject simulated fault for Manual provider
  const handleSimulateFault = async (vehicleId: string, severity: 'Critical' | 'Warning') => {
    const v = vehicles.find((item) => item.id === vehicleId);
    if (!v) return;

    const provider = getProviderForVehicle(vehicleId, deviceMappings, vehicles);

    if (provider.providerName !== 'manual') {
      addLog(`Vehicle is connected to ${provider.providerName.toUpperCase()} hardware stub. Hardware stubs do not accept mock injections.`, 'warn');
      return;
    }

    const manualProvider = provider as ManualEntryProvider;

    const simulatedFault: ActiveFaultCode = severity === 'Critical'
      ? {
          code: 'P0217',
          name: 'Engine Overheat Condition (R1 Emergency)',
          severity: 'Critical',
          logged_date: new Date().toISOString().split('T')[0],
          required_intervention: 'Immediate engine shutdown & maintenance dispatch',
        }
      : {
          code: 'P0300',
          name: 'Random/Multiple Cylinder Misfire',
          severity: 'Warning',
          logged_date: new Date().toISOString().split('T')[0],
          required_intervention: 'Inspect spark plugs and fuel injection unit',
        };

    const currentFaults = v.active_fault_codes || [];
    const updatedFaults = [simulatedFault, ...currentFaults.filter((f) => f.code !== simulatedFault.code)];

    manualProvider.setVehicleFaultCodes(vehicleId, updatedFaults);
    await logOBDFault(vehicleId, {
      code: simulatedFault.code,
      name: simulatedFault.name,
      severity: simulatedFault.severity,
      required_intervention: simulatedFault.required_intervention,
    });

    if (severity === 'Critical') {
      addLog(`🚨 RULE R1 TRIGGERED: Critical OBD Fault P0217 injected into ${v.name}. Vehicle status forced to UNSAFE / RED.`, 'error');
    } else {
      addLog(`⚠️ Warning OBD Fault P0300 injected into ${v.name}.`, 'warn');
    }
  };

  // Handler: Ping position update for Manual provider
  const handlePingPosition = (vehicleId: string) => {
    const v = vehicles.find((item) => item.id === vehicleId);
    if (!v) return;

    const provider = getProviderForVehicle(vehicleId, deviceMappings, vehicles);
    if (provider.providerName !== 'manual') return;

    const manualProvider = provider as ManualEntryProvider;

    // Shift coordinates slightly around Algiers logistics corridor
    const latOffset = (Math.random() - 0.5) * 0.05;
    const lngOffset = (Math.random() - 0.5) * 0.05;
    const newPos: Position = {
      latitude: Number((36.7538 + latOffset).toFixed(4)),
      longitude: Number((3.0588 + lngOffset).toFixed(4)),
      speed_kmh: Math.floor(Math.random() * 80) + 20,
      heading_deg: Math.floor(Math.random() * 360),
      timestamp: new Date().toISOString(),
    };

    manualProvider.notifyUpdate(vehicleId, { position: newPos });
    addLog(`📍 GPS Ping received for ${v.name}: [${newPos.latitude}, ${newPos.longitude}] @ ${newPos.speed_kmh} km/h`, 'info');
  };

  const [selectedMetric, setSelectedMetric] = useState<'faults' | 'speed' | 'temp'>('faults');
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState<string>('all');

  const manualAdaptersCount = Object.values(telemetryStates).filter((s) => s.providerName === 'manual').length;
  const hardwareAdaptersCount = Object.values(telemetryStates).filter((s) => s.providerName !== 'manual').length;
  const totalStreamedFaults = Object.values(telemetryStates).reduce((sum, s) => sum + s.faultCodes.length, 0);

  // Generate 60-minute telemetry metric trend for Recharts line chart
  const chartData = useMemo(() => {
    const timeLabels = ['-60m', '-50m', '-40m', '-30m', '-20m', '-10m', 'Now'];

    return timeLabels.map((timeLabel, index) => {
      const isNow = index === timeLabels.length - 1;

      const vehicleMetrics: Record<string, { faults: number; critical: number; speed: number; temp: number }> = {};

      let totalFaults = 0;
      let totalCritical = 0;
      let totalWarning = 0;
      let sumSpeed = 0;
      let maxSpeed = 0;
      let sumTemp = 0;
      let maxTemp = 0;

      vehicles.forEach((v, vIdx) => {
        const state = telemetryStates[v.id];
        const liveFaults = state ? state.faultCodes : (v.active_fault_codes || []);
        const livePos = state ? state.position : null;

        const liveFaultCount = liveFaults.length;
        const liveCritCount = liveFaults.filter((f) => f.severity === 'Critical').length;
        const liveWarnCount = liveFaults.filter((f) => f.severity === 'Warning').length;
        const liveSpeed = livePos?.speed_kmh ?? (50 + (vIdx * 7) % 35);
        const liveTemp = 82 + (liveCritCount > 0 ? 26 : liveWarnCount > 0 ? 12 : (vIdx * 3) % 10);

        let fCount = liveFaultCount;
        let cCount = liveCritCount;
        let wCount = liveWarnCount;
        let speedVal = liveSpeed;
        let tempVal = liveTemp;

        if (!isNow) {
          const offset = (timeLabels.length - 1 - index);
          fCount = Math.max(0, liveFaultCount - (offset > 3 && liveFaultCount > 0 ? 1 : 0));
          cCount = Math.max(0, liveCritCount - (offset > 2 && liveCritCount > 0 ? 1 : 0));
          wCount = Math.max(0, fCount - cCount);
          speedVal = Math.max(10, Math.min(110, liveSpeed + ((index * 13 + vIdx * 17) % 21 - 10)));
          tempVal = Math.max(70, Math.min(115, liveTemp + ((index * 5 + vIdx * 7) % 11 - 5)));
        }

        vehicleMetrics[v.id] = { faults: fCount, critical: cCount, speed: speedVal, temp: tempVal };

        totalFaults += fCount;
        totalCritical += cCount;
        totalWarning += wCount;
        sumSpeed += speedVal;
        if (speedVal > maxSpeed) maxSpeed = speedVal;
        sumTemp += tempVal;
        if (tempVal > maxTemp) maxTemp = tempVal;
      });

      const count = vehicles.length || 1;
      const avgSpeed = Math.round(sumSpeed / count);
      const avgTemp = Math.round(sumTemp / count);

      const point: Record<string, any> = {
        time: timeLabel,
        totalFaults,
        criticalFaults: totalCritical,
        warningFaults: totalWarning,
        avgSpeed,
        maxSpeed,
        avgTemp,
        maxTemp,
      };

      vehicles.forEach((v) => {
        const m = vehicleMetrics[v.id];
        point[`faults_${v.id}`] = m.faults;
        point[`speed_${v.id}`] = m.speed;
        point[`temp_${v.id}`] = m.temp;
      });

      return point;
    });
  }, [vehicles, telemetryStates]);

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl border border-indigo-900/50 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              {t('telemetry.header_tag', {}, 'Vendor-Agnostic Telematics Layer')}
            </div>
            <h1 className="text-2xl font-black text-white flex items-center gap-3">
              {t('telemetry.header_title', {}, 'Real-Time Telemetry Stream & Positions')}
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </h1>
            <p className="text-xs text-indigo-200/80 mt-1 max-w-2xl">
              {t('telemetry.header_desc', {}, 'Visualize real-time OBD-II diagnostic streams and GPS coordinates normalized via the TelematicsProvider abstraction layer.')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadTelemetryData}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Stream
            </button>
          </div>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t('telemetry.active_streams', {}, 'Active Fleet Streams')}
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">{vehicles.length}</div>
            <span className="text-[11px] font-semibold text-slate-500">Normalized via TelematicsProvider</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t('telemetry.manual_adapters', {}, 'Manual / Pilot Adapters')}
            </span>
            <div className="text-2xl font-black text-emerald-700 mt-1">{manualAdaptersCount}</div>
            <span className="text-[11px] font-semibold text-emerald-600">Declarative data entry (Mode Déclaratif)</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t('telemetry.phase2_standby', {}, 'Phase 2 Adapter Standby')}
            </span>
            <div className="text-2xl font-black text-amber-600 mt-1">{hardwareAdaptersCount}</div>
            <span className="text-[11px] font-semibold text-amber-700">Teltonika & Flespi/Wialon stubs</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Cpu className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t('telemetry.active_faults', {}, 'Active OBD Faults Streamed')}
            </span>
            <div className="text-2xl font-black text-red-600 mt-1">{totalStreamedFaults}</div>
            <span className="text-[11px] font-semibold text-red-600">Monitored by Rule R1 Emergency Stop</span>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Recharts Telemetry Metrics & Fault Trend Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                {t('telemetry.chart_title', {}, 'Telemetry & Diagnostic Trend (Last 60 Mins)')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('telemetry.chart_desc', {}, 'Real-time progression of OBD fault codes, GPS speeds, and engine thermal metrics across the fleet.')}
              </p>
            </div>
          </div>

          {/* Metric Selector & Vehicle Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
              <button
                onClick={() => setSelectedMetric('faults')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedMetric === 'faults'
                    ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                OBD Faults
              </button>
              <button
                onClick={() => setSelectedMetric('speed')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedMetric === 'speed'
                    ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Gauge className="w-3.5 h-3.5" />
                Speed (km/h)
              </button>
              <button
                onClick={() => setSelectedMetric('temp')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedMetric === 'temp'
                    ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Thermometer className="w-3.5 h-3.5" />
                Engine Temp (°C)
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Filter:
              </label>
              <select
                value={selectedVehicleFilter}
                onChange={(e) => setSelectedVehicleFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">Entire Fleet (Aggregated)</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.plate})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Recharts Responsive Line Chart */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
                }}
                itemStyle={{ color: '#f8fafc', padding: '2px 0' }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '16px', fontSize: '12px', fontWeight: 600 }}
              />

              {selectedMetric === 'faults' && selectedVehicleFilter === 'all' && (
                <>
                  <Line
                    type="monotone"
                    dataKey="totalFaults"
                    name="Total OBD Faults"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="criticalFaults"
                    name="Critical (R1 Alerts)"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={{ r: 4, fill: '#ef4444' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="warningFaults"
                    name="Warning Level"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#f59e0b' }}
                  />
                </>
              )}

              {selectedMetric === 'speed' && selectedVehicleFilter === 'all' && (
                <>
                  <Line
                    type="monotone"
                    dataKey="avgSpeed"
                    name="Fleet Avg Speed (km/h)"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#06b6d4', strokeWidth: 2, stroke: '#ffffff' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="maxSpeed"
                    name="Peak Speed (km/h)"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={{ r: 3, fill: '#3b82f6' }}
                  />
                </>
              )}

              {selectedMetric === 'temp' && selectedVehicleFilter === 'all' && (
                <>
                  <Line
                    type="monotone"
                    dataKey="avgTemp"
                    name="Fleet Avg Temp (°C)"
                    stroke="#f97316"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#f97316', strokeWidth: 2, stroke: '#ffffff' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="maxTemp"
                    name="Max Engine Temp (°C)"
                    stroke="#dc2626"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#dc2626' }}
                  />
                </>
              )}

              {selectedVehicleFilter !== 'all' && (
                <Line
                  type="monotone"
                  dataKey={`${selectedMetric}_${selectedVehicleFilter}`}
                  name={
                    vehicles.find((v) => v.id === selectedVehicleFilter)?.name ||
                    selectedVehicleFilter
                  }
                  stroke={selectedMetric === 'faults' ? '#ef4444' : selectedMetric === 'speed' ? '#06b6d4' : '#f97316'}
                  strokeWidth={3}
                  dot={{ r: 5, strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 7 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PHASE 2: GEMINI 3.6 FLASH PREDICTIVE AI FAILURE FORECASTING PANEL */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl border border-indigo-800/60 p-6 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-indigo-900/60 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600/30 text-indigo-300 rounded-2xl border border-indigo-500/40">
              <Brain className="w-6 h-6 text-indigo-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Phase 2 • Gemini 3.6 Flash
                </span>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Predictive R1-Engine Active
                </span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight mt-1">
                Analyse IA Prédictive & Modélisation de Dégradation CAN-Bus
              </h2>
              <p className="text-xs text-indigo-200/70 mt-0.5">
                Anticipation des pannes physiques 72 heures avant l'apparition des codes d'erreur OBD réels via régression prédictive Gemini.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedAiVehicleId}
              onChange={(e) => setSelectedAiVehicleId(e.target.value)}
              className="bg-slate-800/90 border border-indigo-700/60 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.plate}) • {v.classification}
                </option>
              ))}
            </select>

            <button
              onClick={handleRunPredictiveAi}
              disabled={isAnalyzingAi}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isAnalyzingAi ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  Calcul Inférence IA...
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4 text-indigo-200" />
                  Analyser Risque Prédictif (Gemini 3.6)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Predictive AI Output Display */}
        {predictiveResult ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Risk Score & R1-Prédictive Trigger Badge */}
            <div className="bg-slate-800/60 rounded-xl p-5 border border-indigo-800/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-indigo-200 mb-2">
                  <span>Probabilité de Panne Estimée</span>
                  <span className="font-mono text-[10px] text-slate-400">Score IA</span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-4xl font-black font-mono ${
                      predictiveResult.failure_likelihood_percentage >= 70
                        ? 'text-red-400'
                        : predictiveResult.failure_likelihood_percentage >= 40
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {predictiveResult.failure_likelihood_percentage}%
                  </span>
                  <span className="text-xs text-slate-400 font-medium">risque critique</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-700/60 h-2.5 rounded-full overflow-hidden mt-3">
                  <div
                    className={`h-full transition-all duration-500 ${
                      predictiveResult.failure_likelihood_percentage >= 70
                        ? 'bg-red-500'
                        : predictiveResult.failure_likelihood_percentage >= 40
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${predictiveResult.failure_likelihood_percentage}%` }}
                  ></div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/50 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" /> Temps Avant Défaillance:
                    </span>
                    <span className="font-bold font-mono text-white">
                      ~{predictiveResult.estimated_hours_to_failure} heures
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-400" /> Sous-système Critiqué:
                    </span>
                    <span className="font-bold text-indigo-300">{predictiveResult.critical_subsystem}</span>
                  </div>
                </div>
              </div>

              {predictiveResult.predictive_r1_alert ? (
                <div className="mt-4 p-3 bg-red-950/80 border border-red-500/50 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-red-300 font-bold text-xs uppercase">
                    <ShieldAlert className="w-4 h-4 text-red-400 animate-bounce" />
                    Alerte R1-Prédictive Active
                  </div>
                  <p className="text-[11px] text-red-200/90 leading-tight">
                    Le seuil critique de 72h a été franchi par l'infrarouge télémétrique. Un ordre préventif est préconisé avant le départ du véhicule.
                  </p>
                  <button
                    onClick={handleDispatchPredictiveWorkOrder}
                    className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    Créer Ordre Préventif R1
                  </button>
                </div>
              ) : (
                <div className="mt-4 p-3 bg-emerald-950/60 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Aucune alerte R1-Prédictive. Risque dans les tolérances de flotte.</span>
                </div>
              )}
            </div>

            {/* Middle & Right Column: Telemetry Anomalies & Gemini Rationale */}
            <div className="lg:col-span-2 space-y-4">
              {/* Anomalies Table */}
              <div className="bg-slate-800/60 rounded-xl p-4 border border-indigo-800/40">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-200 mb-2 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" /> Anomalies Capteurs & Écarts de Télémétrie
                </h4>

                {predictiveResult.telemetry_anomalies.length > 0 ? (
                  <div className="space-y-2">
                    {predictiveResult.telemetry_anomalies.map((anom, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2"
                      >
                        <div>
                          <span className="font-bold text-indigo-300">{anom.sensor}</span>
                          <span className="text-[11px] text-slate-400 block font-mono">
                            Actuel: <strong className="text-white">{anom.current_value}</strong> (Nominal: {anom.baseline_value})
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-amber-300 bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded shrink-0">
                          {anom.deviation}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">
                    Aucune anomalie critique de capteur détectée dans le flux de télémétrie direct.
                  </div>
                )}
              </div>

              {/* Gemini AI Rationale & Action Plan */}
              <div className="bg-indigo-950/50 rounded-xl p-4 border border-indigo-700/50 space-y-2">
                <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold uppercase">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-300" /> Recommandations & Justification Gemini AI
                </div>
                <p className="text-xs text-slate-200 leading-relaxed italic">
                  "{predictiveResult.reasoning_fr}"
                </p>
                <div className="pt-2 border-t border-indigo-800/40 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Intervention conseillée :</span>
                  <span className="font-bold text-white text-[11px] bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                    {predictiveResult.recommended_action}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/40 rounded-xl p-8 text-center border border-dashed border-indigo-800/50">
            <Brain className="w-10 h-10 text-indigo-400/60 mx-auto mb-2" />
            <p className="text-sm font-semibold text-indigo-200">
              Sélectionnez un véhicule ci-dessus et lancez l'Inférence Prédictive Gemini 3.6 Flash.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              L'IA modélisera l'usure de friction des freins, la température de transmission et la dégradation hydraulique.
            </p>
          </div>
        )}
      </div>

      {/* Grid of Vehicle Stream Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {vehicles.map((v) => {
          const state = telemetryStates[v.id];
          if (!state) return null;

          const { providerName, isConnected, position, faultCodes, mapping, lastUpdate } = state;
          const criticalFault = faultCodes.find((f) => f.severity === 'Critical');

          return (
            <div
              key={v.id}
              className={`bg-white rounded-2xl border ${
                criticalFault
                  ? 'border-red-300 ring-2 ring-red-500/20 shadow-md'
                  : 'border-slate-200 shadow-2xs'
              } overflow-hidden flex flex-col justify-between`}
            >
              {/* Card Header */}
              <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">
                    {v.plate.substring(0, 5)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900">{v.name}</h3>
                      <span className="text-xs font-mono font-semibold text-slate-500">({v.plate})</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span>{v.classification}</span>
                      <span>•</span>
                      <span className="font-mono text-[11px]">ID: {v.id}</span>
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                    v.status === 'Healthy'
                      ? 'bg-emerald-100 text-emerald-800'
                      : v.status === 'Critical'
                      ? 'bg-red-100 text-red-800 animate-pulse'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {v.status}
                </span>
              </div>

              {/* Adapter & Connection Bar */}
              <div className="px-4 py-2.5 bg-slate-100/60 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <select
                    value={providerName}
                    onChange={(e) => handleSwitchAdapter(v.id, e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                  >
                    <option value="manual">Manual Entry (SaaS Declarative)</option>
                    <option value="nexttransit_gateway">⚡ NextTransit IoT Gateway (Phase 2 CAN-Bus)</option>
                    <option value="teltonika">Teltonika FM-series (Standby)</option>
                    <option value="flespi_wialon">Flespi / Wialon Telematics (Standby)</option>
                  </select>
                </div>

                {isConnected ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    Live Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded">
                    <Radio className="w-3 h-3 text-amber-600 animate-pulse" />
                    Phase 2 Standby
                  </span>
                )}
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-4 flex-1">
                {/* GPS Position Box */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-indigo-600" /> GPS Telemetry Coordinates
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Updated: {lastUpdate}</span>
                  </div>

                  {position ? (
                    <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-xs space-y-1 shadow-inner">
                      <div className="flex justify-between items-center">
                        <span className="text-indigo-400">LAT / LNG:</span>
                        <span className="font-bold text-emerald-400">
                          {position.latitude}° N, {position.longitude}° E
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">SPEED / HEADING:</span>
                        <span>
                          {position.speed_kmh ?? 0} km/h • {position.heading_deg ?? 0}°
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-100 p-3 rounded-xl text-xs text-slate-500 italic text-center border border-dashed border-slate-300">
                      Phase 2 hardware connection pending. GPS telemetry unavailable until credentials wired.
                    </div>
                  )}
                </div>

                {/* OBD Fault Code Stream */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] flex items-center gap-1">
                      <Activity className="w-3 h-3 text-indigo-600" /> OBD-II Diagnostic Stream ({faultCodes.length})
                    </span>
                    {criticalFault && (
                      <span className="text-[10px] font-black text-red-600 bg-red-100 px-2 py-0.5 rounded uppercase">
                        Rule R1 Triggered
                      </span>
                    )}
                  </div>

                  {faultCodes.length > 0 ? (
                    <div className="space-y-2">
                      {faultCodes.map((f, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-xl text-xs border ${
                            f.severity === 'Critical'
                              ? 'bg-red-50 border-red-200 text-red-900'
                              : 'bg-amber-50 border-amber-200 text-amber-900'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="font-mono text-xs">{f.code}</span>
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                f.severity === 'Critical'
                                  ? 'bg-red-200 text-red-900'
                                  : 'bg-amber-200 text-amber-900'
                              }`}
                            >
                              {f.severity}
                            </span>
                          </div>
                          <p className="font-semibold text-xs mt-0.5">{f.name}</p>
                          <p className="text-[11px] opacity-80 mt-1">Intervention: {f.required_intervention}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl text-xs flex items-center gap-2 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Zero active OBD fault codes reported by adapter.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Interactive Actions Footer (For Manual Provider) */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                {providerName === 'manual' ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleSimulateFault(v.id, 'Critical')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] transition-colors cursor-pointer shadow-2xs"
                      >
                        <Zap className="w-3 h-3" />
                        {t('telemetry.simulate_fault_btn', {}, 'Inject R1 Critical Fault')}
                      </button>
                      <button
                        onClick={() => handleSimulateFault(v.id, 'Warning')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] transition-colors cursor-pointer shadow-2xs"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        Warning
                      </button>
                    </div>

                    <button
                      onClick={() => handlePingPosition(v.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition-colors cursor-pointer shadow-2xs"
                    >
                      <Navigation className="w-3 h-3" />
                      {t('telemetry.simulate_ping_btn', {}, 'Ping GPS')}
                    </button>
                  </>
                ) : (
                  <div className="w-full text-center text-xs text-slate-500 font-semibold py-1">
                    🔒 Connected to {providerName.toUpperCase()} hardware adapter stream.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-time Telematics Ingestion Log Console */}
      <div className="bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 p-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200">
              Telematics Ingestion Protocol Event Log
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Interface: TelematicsProvider (R1-R7 Isolated)
          </span>
        </div>

        <div className="font-mono text-xs space-y-1.5 max-h-48 overflow-y-auto pr-2">
          {eventLogs.length > 0 ? (
            eventLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3">
                <span className="text-slate-500 text-[10px] shrink-0">{log.time}</span>
                <span
                  className={
                    log.level === 'error'
                      ? 'text-red-400 font-bold'
                      : log.level === 'warn'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }
                >
                  {log.text}
                </span>
              </div>
            ))
          ) : (
            <div className="text-slate-500 italic">No telematics events logged yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};
