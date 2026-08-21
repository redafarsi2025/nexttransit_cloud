import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default icon path issues with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface VehicleMapProps {
  latitude: number;
  longitude: number;
  plate: string;
  name: string;
  status: string;
}

export const VehicleMap: React.FC<VehicleMapProps> = ({ latitude, longitude, plate, name, status }) => {
  const position: [number, number] = [latitude, longitude];

  return (
    <div className="h-64 w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm relative z-0">
      <MapContainer center={position} zoom={13} scrollWheelZoom={false} className="h-full w-full" style={{ zIndex: 0 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>
            <div className="font-sans">
              <div className="font-semibold text-slate-800">{plate}</div>
              <div className="text-sm text-slate-500">{name}</div>
              <div className="text-xs mt-1 font-medium px-2 py-0.5 rounded-full inline-block bg-slate-100">
                {status}
              </div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};
