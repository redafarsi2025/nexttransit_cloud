import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface VehiclePosition {
  vehicleId: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  recordedAt: string;
}

// Matches the Control Room doc's realtime decision: wallboards subscribe to consolidated state,
// not the raw telemetry stream, so this polls the vehicle_latest_position view (itself derived
// from telemetry_events, see 20260827000000_vehicle_latest_position.sql) rather than opening a
// realtime channel on a potentially high-frequency raw event log.
const POLL_INTERVAL_MS = 20000;

interface VehicleLatestPositionRow {
  vehicle_id: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  recorded_at: string;
}

export function useVehiclePositions(): { positions: Map<string, VehiclePosition>; loading: boolean } {
  const [positions, setPositions] = useState<Map<string, VehiclePosition>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchPositions = async () => {
      const { data, error } = await supabase
        .from('vehicle_latest_position')
        .select('vehicle_id, latitude, longitude, heading, recorded_at');

      if (cancelled) return;

      if (error) {
        console.error('Failed to fetch vehicle positions:', error.message);
        setLoading(false);
        return;
      }

      const next = new Map<string, VehiclePosition>();
      for (const row of (data as VehicleLatestPositionRow[] | null) || []) {
        next.set(row.vehicle_id, {
          vehicleId: row.vehicle_id,
          latitude: row.latitude,
          longitude: row.longitude,
          heading: row.heading,
          recordedAt: row.recorded_at,
        });
      }
      setPositions(next);
      setLoading(false);
    };

    fetchPositions();
    const interval = setInterval(fetchPositions, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { positions, loading };
}
