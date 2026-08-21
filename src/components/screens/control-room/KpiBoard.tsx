import React from 'react';
import { WallboardHeader } from '../../control-room/WallboardHeader';
import { WallboardCard } from '../../control-room/WallboardCard';
import { useFleet } from '../../../context/FleetContext';
import { Truck, Activity, AlertCircle } from 'lucide-react';

export const KpiBoard: React.FC = () => {
  const { vehicles } = useFleet();

  const total = vehicles.length;
  const online = vehicles.filter(v => v.status === 'Healthy').length;
  const critical = vehicles.filter(v => v.status === 'Critical').length;
  const unknown = vehicles.filter(v => v.status === 'Unknown').length;
  const attention = vehicles.filter(v => v.status === 'Attention').length;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950">
      <WallboardHeader title="Fleet Operations KPI" subtitle="Real-time fleet statistics" />
      <div className="p-8 flex-1 grid grid-cols-1 md:grid-cols-3 gap-8">
        <WallboardCard title="Total Fleet" className="flex flex-col items-center justify-center text-center">
          <Truck className="w-16 h-16 text-slate-500 mb-6" />
          <div className="text-8xl font-extrabold text-white tracking-tighter">{total}</div>
          <div className="text-slate-400 mt-4 text-xl tracking-widest uppercase font-bold">Registered Assets</div>
        </WallboardCard>
        
        <WallboardCard title="Healthy & Active" className="flex flex-col items-center justify-center text-center border-emerald-500/30 bg-emerald-950/10">
          <Activity className="w-16 h-16 text-emerald-500 mb-6" />
          <div className="text-8xl font-extrabold text-emerald-400 tracking-tighter">{online}</div>
          <div className="text-emerald-500/70 mt-4 text-xl tracking-widest uppercase font-bold">In Operation</div>
        </WallboardCard>

        <WallboardCard title="Critical Actions Required" className="flex flex-col items-center justify-center text-center border-rose-500/30 bg-rose-950/10">
          <AlertCircle className="w-16 h-16 text-rose-500 mb-6" />
          <div className="text-8xl font-extrabold text-rose-500 tracking-tighter">{critical}</div>
          <div className="flex gap-4 mt-6">
             <div className="text-center">
               <div className="text-2xl font-bold text-amber-400">{attention}</div>
               <div className="text-amber-500/70 text-sm font-bold uppercase tracking-wider">Attention</div>
             </div>
             <div className="w-px bg-rose-900/50"></div>
             <div className="text-center">
               <div className="text-2xl font-bold text-slate-400">{unknown}</div>
               <div className="text-slate-500 text-sm font-bold uppercase tracking-wider">Unknown</div>
             </div>
          </div>
        </WallboardCard>
      </div>
    </div>
  );
};
