import React, { useState, useEffect, useRef } from 'react';
import { Activity, Server, Cpu, Database, Play, Pause, RefreshCw, Trash2, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';

interface SystemMetric {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  value: string;
  load: number; // 0 to 100
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  service: string;
  message: string;
}

interface QueueStatus {
  name: string;
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  rate: string;
}

export const SystemHealth: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'queues' | 'logs'>('metrics');
  const [isStreaming, setIsStreaming] = useState(true);
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [queueData, setQueueData] = useState<QueueStatus[]>([
    { name: 'telemetry-raw-parsing', active: 3, waiting: 0, completed: 154238, failed: 12, rate: '423 msg/s' },
    { name: 'obd2-dtc-lookup', active: 1, waiting: 0, completed: 48922, failed: 2, rate: '88 msg/s' },
    { name: 'email-alert-notifications', active: 0, waiting: 0, completed: 1845, failed: 0, rate: '2 msg/s' },
    { name: 'maintenance-auto-dispatch', active: 0, waiting: 0, completed: 352, failed: 1, rate: '0.5 msg/s' },
    { name: 'ai-maintenance-forecasting', active: 0, waiting: 0, completed: 89, failed: 0, rate: 'Periodic' }
  ]);

  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([
    { name: 'EMQX MQTT Broker', status: 'healthy', value: '42ms avg response', load: 34 },
    { name: 'PostgreSQL Database Engine', status: 'healthy', value: '18 active pools', load: 12 },
    { name: 'TimescaleDB (Telemetry Timeseries)', status: 'healthy', value: '1,240 inserts/s', load: 45 },
    { name: 'Redis Cache (DTC Dictionary & Session)', status: 'healthy', value: '98.4% hit rate', load: 8 },
    { name: 'Vite & Dev Server Middlewares', status: 'healthy', value: '3000 port binding', load: 5 }
  ]);

  const logScrollRef = useRef<HTMLDivElement>(null);

  // Initial logs
  useEffect(() => {
    const initialLogs: LogEntry[] = [
      { id: '1', timestamp: new Date(Date.now() - 5000).toISOString(), level: 'info', service: 'MQTT_BROKER', message: 'Client Teltonika_FMC650_99238 connected on tenant TNT-NEXTR-001' },
      { id: '2', timestamp: new Date(Date.now() - 4000).toISOString(), level: 'info', service: 'CAN_PARSER', message: 'Successfully parsed J1939 raw CAN frame: PG_61444 (EEC1) [Engine Speed: 850 RPM, Load: 24%]' },
      { id: '3', timestamp: new Date(Date.now() - 3500).toISOString(), level: 'warn', service: 'DIAG_ENGINE', message: 'Vehicle V-002: Transient SPN-110 FMI-15 Engine Coolant Temperature Warning detected' },
      { id: '4', timestamp: new Date(Date.now() - 2500).toISOString(), level: 'info', service: 'DB_TIMESERIES', message: 'TimescaleDB: Chunk created successfully for partition _hyper_2_28_chunk' },
      { id: '5', timestamp: new Date(Date.now() - 1000).toISOString(), level: 'error', service: 'API_GATEWAY', message: 'Failed OBD-II DTC Lookup attempt: Remote dict database timed out, falling back to local SQLite dictionary' }
    ];
    setLogs(initialLogs);
  }, []);

  // Live streaming logs simulation
  useEffect(() => {
    if (!isStreaming) return;

    const logMessages = [
      { level: 'info' as const, service: 'MQTT_BROKER', message: 'Telemetry ping received from vehicle FMC130_94022 (Tenant: TNT-NUMIL-002)' },
      { level: 'info' as const, service: 'CAN_PARSER', message: 'DTC Parser: Decoded generic OBD2 fault code P0301 (Cylinder 1 Misfire Detected)' },
      { level: 'warn' as const, service: 'DIAG_ENGINE', message: 'R1 Safety trigger evaluated: Vehicle V-041 state remains healthy (Non-critical diagnostic)' },
      { level: 'info' as const, service: 'BULL_QUEUE', message: 'Job [pdf-report-generator:839] pushed to completed queue' },
      { level: 'error' as const, service: 'TELE_INGEST', message: 'Parser Exception: Raw frame CRC checksum failed from device IMEI_354892283011' },
      { level: 'info' as const, service: 'WARRANTY_VAL', message: 'Active Warranty validation check: Maintenance on V-009 authorized (Volvo Algerian OEM)' },
      { level: 'info' as const, service: 'FUEL_INGEST', message: 'Fuel transaction logged for V-015: 140.5 Litres (DZD 4,200) - Odometer synchronized' }
    ];

    const interval = setInterval(() => {
      const randomMsg = logMessages[Math.floor(Math.random() * logMessages.length)];
      const newLog: LogEntry = {
        id: Math.random().toString(),
        timestamp: new Date().toISOString(),
        ...randomMsg
      };
      setLogs((prev) => [...prev.slice(-99), newLog]);
    }, 2000);

    return () => clearInterval(interval);
  }, [isStreaming]);

  // Auto scroll logs
  useEffect(() => {
    if (logScrollRef.current && isStreaming) {
      logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
    }
  }, [logs, isStreaming]);

  const triggerManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      // Simulate slight metrics changes
      setSystemMetrics(prev => prev.map(metric => ({
        ...metric,
        load: Math.max(5, Math.min(95, metric.load + Math.floor(Math.random() * 11) - 5))
      })));
      
      // Simulate queue changes
      setQueueData(prev => prev.map(q => ({
        ...q,
        completed: q.completed + Math.floor(Math.random() * 50)
      })));

      setIsRefreshing(false);
    }, 800);
  };

  const handleClearFailedJobs = (queueName: string) => {
    setQueueData(prev => prev.map(q => {
      if (q.name === queueName) {
        return { ...q, failed: 0 };
      }
      return q;
    }));
  };

  const filteredLogs = logs.filter(log => {
    if (logFilter === 'all') return true;
    return log.level === logFilter;
  });

  return (
    <div className="space-y-6" id="system-health-root">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center">
            <Activity className="w-6 h-6 mr-3 text-indigo-500 shrink-0" />
            System Health & Realtime Telemetry
          </h1>
          <p className="text-slate-400 mt-1">Supervise internal processes, EMQX broker queue sizes, and ingestion pipelines.</p>
        </div>
        <button
          onClick={triggerManualRefresh}
          disabled={isRefreshing}
          className="flex items-center px-4 py-2 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg hover:bg-slate-700 transition-all disabled:opacity-50"
          id="btn-refresh-health"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing Engine...' : 'Refresh Cluster Metrics'}
        </button>
      </div>

      {/* Tabs navigation */}
      <div className="border-b border-slate-800 flex space-x-6" id="health-tabs">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'metrics'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
          id="tab-metrics"
        >
          Resources & Database Pools
        </button>
        <button
          onClick={() => setActiveTab('queues')}
          className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'queues'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
          id="tab-queues"
        >
          BullMQ Queue Dashboard
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'logs'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
          id="tab-logs"
        >
          Raw Ingestion Log Stream
        </button>
      </div>

      {/* Metrics tab view */}
      {activeTab === 'metrics' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="metrics-tab-content">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-medium text-slate-100 mb-4 flex items-center">
                <Server className="w-5 h-5 mr-2 text-indigo-400" />
                Host Containers & Cluster Status
              </h3>
              <div className="space-y-4">
                {systemMetrics.map((metric, idx) => (
                  <div key={idx} className="p-4 bg-slate-900 rounded-lg border border-slate-700/60">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${metric.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <span className="font-semibold text-slate-200">{metric.name}</span>
                      </div>
                      <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">
                        {metric.value}
                      </span>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Load Factor</span>
                        <span>{metric.load}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            metric.load > 80 ? 'bg-red-500' : metric.load > 50 ? 'bg-amber-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${metric.load}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-medium text-slate-100 mb-4 flex items-center">
                <Cpu className="w-5 h-5 mr-2 text-indigo-400" />
                Cluster Load Summary
              </h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-1 text-slate-300">
                    <span>CPU Usage (Cluster Total)</span>
                    <span className="font-medium">42%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: '42%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1 text-slate-300">
                    <span>Memory Allocation (RSS)</span>
                    <span className="font-medium">68%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: '68%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1 text-slate-300">
                    <span>Network Throughput (I/O)</span>
                    <span className="font-medium">23.8 MB/s</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: '38%' }} />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-700/60 text-xs text-slate-400 space-y-2">
                <div className="flex justify-between">
                  <span>Server Zone:</span>
                  <span className="font-medium text-slate-200">GCP europe-west2 (London)</span>
                </div>
                <div className="flex justify-between">
                  <span>Docker Containers:</span>
                  <span className="font-medium text-slate-200">6 Healthy</span>
                </div>
                <div className="flex justify-between">
                  <span>DTC DB Version:</span>
                  <span className="font-medium text-slate-200">v1.4.2 (SAE-compliant)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Queues tab view */}
      {activeTab === 'queues' && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm" id="queues-tab-content">
          <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/40 flex justify-between items-center">
            <h3 className="text-lg font-medium text-slate-100 flex items-center">
              <Database className="w-5 h-5 mr-2 text-indigo-400" />
              Active BullMQ Job Queues (Redis Backend)
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
              Redis Connected
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Queue Identifier</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Active</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Waiting</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Failed</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Throughput</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Cleanup</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {queueData.map((q, idx) => (
                  <tr key={idx} className="hover:bg-slate-750 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-slate-200">{q.name}</div>
                      <div className="text-xs text-slate-500">BullMQ Queue Cluster</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-indigo-400">
                      {q.active}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-slate-300">
                      {q.waiting}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-emerald-400">
                      {q.completed.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-block text-sm font-bold px-2 py-0.5 rounded ${q.failed > 0 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-slate-500'}`}>
                        {q.failed}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-300">
                      {q.rate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => handleClearFailedJobs(q.name)}
                        disabled={q.failed === 0}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-30"
                        title="Purge Failed Jobs"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Logs tab view */}
      {activeTab === 'logs' && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-sm flex flex-col h-[520px]" id="logs-tab-content">
          <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/40 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex items-center space-x-3">
              <span className="flex h-2.5 w-2.5 relative">
                {isStreaming && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isStreaming ? 'bg-indigo-500' : 'bg-slate-500'}`}></span>
              </span>
              <span className="font-semibold text-slate-200">Raw Ingest Diagnostics Stream</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Log filter buttons */}
              <div className="flex bg-slate-900 border border-slate-700 p-0.5 rounded-lg text-xs font-semibold">
                {(['all', 'info', 'warn', 'error'] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => setLogFilter(level)}
                    className={`px-3 py-1.5 rounded-md uppercase transition-all ${
                      logFilter === level
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>

              {/* Streaming state controllers */}
              <button
                onClick={() => setIsStreaming(!isStreaming)}
                className={`flex items-center px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                  isStreaming
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                }`}
              >
                {isStreaming ? (
                  <>
                    <Pause className="w-3.5 h-3.5 mr-1.5" /> Pause Stream
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 mr-1.5" /> Resume Stream
                  </>
                )}
              </button>

              <button
                onClick={() => setLogs([])}
                className="flex items-center px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-200 text-xs font-bold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear Terminal
              </button>
            </div>
          </div>

          {/* Simulated shell logger terminal */}
          <div
            ref={logScrollRef}
            className="flex-1 bg-slate-950 p-4 font-mono text-xs overflow-y-auto space-y-2 text-slate-300"
          >
            {filteredLogs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-600 italic">
                -- Terminal empty. Waiting for J1939 CAN frames, OBD2 queries, and client pings --
              </div>
            ) : (
              filteredLogs.map((log) => {
                let textClass = 'text-slate-300';
                let icon = <CheckCircle className="w-3.5 h-3.5 text-slate-500 inline mr-1" />;
                if (log.level === 'warn') {
                  textClass = 'text-amber-400';
                  icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400 inline mr-1" />;
                } else if (log.level === 'error') {
                  textClass = 'text-red-400 font-semibold';
                  icon = <ShieldAlert className="w-3.5 h-3.5 text-red-400 inline mr-1" />;
                }

                return (
                  <div key={log.id} className={`py-1 px-2 rounded hover:bg-slate-900 transition-colors ${textClass}`}>
                    <span className="text-slate-500 mr-2">[{log.timestamp.split('T')[1].slice(0, 8)}]</span>
                    <span className="text-indigo-400 bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-900 text-[10px] uppercase font-bold mr-2">
                      {log.service}
                    </span>
                    {icon}
                    <span>{log.message}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
