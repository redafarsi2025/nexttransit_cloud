import React from 'react';
import { WallboardHeader } from '../../control-room/WallboardHeader';
import { WallboardCard } from '../../control-room/WallboardCard';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useFleet } from '../../../context/FleetContext';
import { useVehiclePositions } from '../../../hooks/useVehiclePositions';

// Fix Leaflet's default icon path issues with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export const LiveMapBoard: React.FC = () => {
  const { vehicles } = useFleet();
  const { positions } = useVehiclePositions();
  const defaultPosition: [number, number] = [36.7525, 3.04197]; // Algiers

  const locatedVehicles = vehicles.filter((v) => positions.has(v.id));

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950">
      <WallboardHeader
        title="Live Fleet Map"
        subtitle={`Real-time geographic tracking — ${locatedVehicles.length}/${vehicles.length} vehicles reporting GPS`}
      />
      <div className="p-8 flex-1 flex flex-col">
        <WallboardCard className="flex-1 p-0 overflow-hidden" title="">
          <div className="w-full h-full relative z-0">
            <MapContainer center={defaultPosition} zoom={11} scrollWheelZoom={true} className="h-full w-full bg-slate-900" style={{ zIndex: 0 }}>
              <TileLayer
                attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              {locatedVehicles.map((v) => {
                const pos = positions.get(v.id)!;

                return (
                  <Marker key={v.id} position={[pos.latitude, pos.longitude]}>
                    <Popup>
                      <div className="font-sans min-w-[150px]">
                        <div className="font-bold text-slate-900">{v.plate}</div>
                        <div className="text-xs text-slate-500 mb-2">{v.name}</div>

                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            v.status === 'Healthy' ? 'bg-emerald-100 text-emerald-800' :
                            v.status === 'Attention' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {v.status}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">{(v.mileage || 0).toLocaleString()} km</span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </WallboardCard>
      </div>
    </div>
  );
};
