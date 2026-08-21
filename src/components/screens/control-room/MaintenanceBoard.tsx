import React from 'react';
import { WallboardHeader } from '../../control-room/WallboardHeader';
import { WallboardCard } from '../../control-room/WallboardCard';
import { useFleet } from '../../../context/FleetContext';
import { Wrench, AlertTriangle } from 'lucide-react';

export const MaintenanceBoard: React.FC = () => {
  const { workOrders } = useFleet();

  // Determine "priority" by type Corrective or Investigation, and not closed.
  const priorityQueue = workOrders
    .filter(wo => (wo.type === 'Corrective' || wo.type === 'Investigation') && wo.status !== 'Closed')
    .slice(0, 5);
    
  const inProgress = workOrders
    .filter(wo => wo.status === 'In Progress')
    .slice(0, 5);
  
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950">
      <WallboardHeader title="Maintenance Operations" subtitle="Live work order queue" />
      <div className="p-8 flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        <WallboardCard title="Priority Queue" titleClassName="text-rose-500">
          {priorityQueue.length === 0 ? (
            <div className="text-slate-500 flex items-center justify-center h-48">No high priority tasks</div>
          ) : (
            <div className="space-y-4">
              {priorityQueue.map(wo => (
                <div key={wo.id} className="bg-rose-950/20 border-l-4 border-rose-500 p-4 rounded flex justify-between items-center">
                  <div>
                    <div className="text-rose-400 font-bold mb-1">{wo.type} Maintenance</div>
                    <div className="text-slate-400 text-sm">{wo.vehicle_plate}</div>
                  </div>
                  <AlertTriangle className="text-rose-500 w-6 h-6" />
                </div>
              ))}
            </div>
          )}
        </WallboardCard>
        
        <WallboardCard title="In Progress" titleClassName="text-amber-500">
          {inProgress.length === 0 ? (
            <div className="text-slate-500 flex items-center justify-center h-48">No tasks in progress</div>
          ) : (
            <div className="space-y-4">
              {inProgress.map(wo => (
                <div key={wo.id} className="bg-amber-950/20 border-l-4 border-amber-500 p-4 rounded flex justify-between items-center">
                  <div>
                    <div className="text-amber-400 font-bold mb-1">{wo.type} Maintenance</div>
                    <div className="text-slate-400 text-sm">{wo.vehicle_plate}</div>
                  </div>
                  <Wrench className="text-amber-500 w-6 h-6" />
                </div>
              ))}
            </div>
          )}
        </WallboardCard>

      </div>
    </div>
  );
};
