import React from 'react';
import { useFleet } from '../../context/FleetContext';
import { useLocalization } from '../../context/LocalizationContext';
import { FleetMap } from '../vehicle/FleetMap';
import { Map as MapIcon } from 'lucide-react';

export const FleetMapScreen: React.FC = () => {
  const { vehicles, setSelectedVehicleId } = useFleet();
  const { t } = useLocalization();

  return (
    <div className="p-6 h-[calc(100vh-5rem)] flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <MapIcon className="h-6 w-6 text-indigo-600" />
            {t('nav.fleet_map', {}, 'Carte GPS Flotte')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Suivi géographique en temps réel des véhicules
          </p>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col">
        <div className="flex-1 w-full relative">
            <FleetMap 
              vehicles={vehicles}
              onVehicleClick={(id) => setSelectedVehicleId(id)}
            />
        </div>
      </div>
    </div>
  );
};
