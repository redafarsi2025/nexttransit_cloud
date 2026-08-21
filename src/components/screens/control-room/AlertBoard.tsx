import React from 'react';
import { WallboardHeader } from '../../control-room/WallboardHeader';
import { WallboardCard } from '../../control-room/WallboardCard';
import { useFleet } from '../../../context/FleetContext';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

export const AlertBoard: React.FC = () => {
  const { alerts } = useFleet();
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950">
      <WallboardHeader title="Critical Alerts Monitor" subtitle="Real-time incident feed" />
      <div className="p-8 flex-1 flex flex-col">
        <WallboardCard title="Active Critical Incidents" className="flex-1">
          {criticalAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <ShieldAlert className="w-16 h-16 mb-4 opacity-50" />
              <div className="text-xl tracking-wider uppercase font-bold">No Critical Alerts</div>
              <div className="text-sm mt-2">All systems operating normally</div>
            </div>
          ) : (
            <div className="space-y-4">
              {criticalAlerts.map(alert => (
                <div key={alert.id} className={`p-6 border-l-4 rounded-r-xl flex items-start gap-4 ${
                  alert.severity === 'critical' ? 'bg-rose-950/30 border-rose-500' : 'bg-amber-950/30 border-amber-500'
                }`}>
                  <AlertTriangle className={`w-8 h-8 shrink-0 ${
                    alert.severity === 'critical' ? 'text-rose-500' : 'text-amber-500'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-3 py-1 rounded font-bold text-xs uppercase tracking-wider ${
                        alert.severity === 'critical' ? 'bg-rose-900/50 text-rose-400' : 'bg-amber-900/50 text-amber-400'
                      }`}>
                        {alert.rule_id}
                      </span>
                      <span className="text-slate-400 text-sm font-mono">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-white text-lg font-bold mb-1">{alert.title}</div>
                    <div className="text-slate-300">{alert.description}</div>
                    {alert.vehicle_id && (
                      <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded text-sm text-slate-300 font-mono">
                        <span className="text-slate-500">Vehicle:</span> {alert.vehicle_id}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </WallboardCard>
      </div>
    </div>
  );
};
