import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useVehiclePositions } from '../../hooks/useVehiclePositions';

// Fix Leaflet's default icon path issues with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface FleetMapProps {
  vehicles: any[]; // Using any to align with current context's vehicle typing if not strictly typed
  onVehicleClick: (id: string) => void;
}

export const FleetMap: React.FC<FleetMapProps> = ({ vehicles, onVehicleClick }) => {
  // Center on Algiers as default, or average of vehicles
  const defaultPosition: [number, number] = [36.7525, 3.04197]; // Algiers
  const { positions } = useVehiclePositions();

  const locatedVehicles = vehicles.filter((v) => positions.has(v.id));
  const unlocatedCount = vehicles.length - locatedVehicles.length;

  return (
    <div className="h-96 w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative z-0 mb-6">
      <MapContainer center={defaultPosition} zoom={11} scrollWheelZoom={true} className="h-full w-full" style={{ zIndex: 0 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {locatedVehicles.map((v) => {
          const pos = positions.get(v.id)!;

          return (
            <Marker key={v.id} position={[pos.latitude, pos.longitude]}>
              <Popup>
                <div className="font-sans min-w-[150px]">
                  <div className="font-bold text-slate-900">{v.plate}</div>
                  <div className="text-xs text-slate-500 mb-2">{v.name}</div>

                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      v.status === 'Healthy' ? 'bg-emerald-100 text-emerald-800' :
                      v.status === 'Attention' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {v.status}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">{(v.mileage || 0).toLocaleString()} km</span>
                  </div>

                  <button
                    onClick={() => onVehicleClick(v.id)}
                    className="w-full mt-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold py-1.5 rounded transition cursor-pointer"
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      {unlocatedCount > 0 && (
        <div className="absolute bottom-2 left-2 z-[1000] bg-white/90 text-[11px] text-slate-600 px-2 py-1 rounded shadow">
          {unlocatedCount} vehicle{unlocatedCount > 1 ? 's' : ''} without GPS signal
        </div>
      )}
    </div>
  );
};
