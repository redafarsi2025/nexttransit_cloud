import { supabase } from '../lib/supabase';
import { Tire, TireInspection, TirePosition, TireStatus } from '../types';

// Below this tread depth (mm), a tire is flagged as needing replacement. Most jurisdictions set a
// legal minimum around 1.6mm; this uses a slightly higher, earlier-warning threshold so fleet
// managers see it before it becomes a compliance issue, not after.
export const TREAD_DEPTH_REPLACEMENT_THRESHOLD_MM = 3;

export const tireService = {
  /**
   * Get tires (optionally filtered by vehicle).
   */
  async getTires(vehicleId?: string): Promise<Tire[]> {
    let query = supabase.from('tires').select('*');
    if (vehicleId) {
      query = query.eq('vehicle_id', vehicleId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`getTires failed: ${error.message}`);
    }
    return (data || []) as Tire[];
  },

  /**
   * Register a new tire (in stock or already mounted on a vehicle).
   */
  async addTire(input: {
    tenant_id: string;
    vehicle_id?: string | null;
    position?: TirePosition;
    brand?: string;
    model?: string;
    serial_number?: string;
    status?: TireStatus;
    install_date?: string;
    install_odometer?: number;
    latest_tread_depth_mm?: number;
    rotation_due_odometer?: number;
    notes?: string;
  }): Promise<Tire> {
    const { data, error } = await supabase
      .from('tires')
      .insert({
        tenant_id: input.tenant_id,
        vehicle_id: input.vehicle_id ?? null,
        position: input.position ?? 'UNASSIGNED',
        brand: input.brand,
        model: input.model,
        serial_number: input.serial_number,
        status: input.status ?? 'in_service',
        install_date: input.install_date,
        install_odometer: input.install_odometer,
        latest_tread_depth_mm: input.latest_tread_depth_mm,
        rotation_due_odometer: input.rotation_due_odometer,
        notes: input.notes,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'addTire insert returned no data');
    }
    return data as Tire;
  },

  /**
   * Update a tire's record (position, status, vehicle assignment, notes, etc.).
   */
  async updateTire(id: string, updates: Partial<Omit<Tire, 'id' | 'tenant_id' | 'created_at'>>): Promise<Tire> {
    const { data, error } = await supabase
      .from('tires')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'updateTire failed');
    }
    return data as Tire;
  },

  /**
   * Delete a tire record entirely (e.g. scrapped, entered by mistake).
   */
  async deleteTire(id: string): Promise<void> {
    const { error } = await supabase.from('tires').delete().eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Get inspection history for a specific tire, most recent first.
   */
  async getTireInspections(tireId: string): Promise<TireInspection[]> {
    const { data, error } = await supabase
      .from('tire_inspections')
      .select('*')
      .eq('tire_id', tireId)
      .order('inspection_date', { ascending: false });

    if (error) {
      throw new Error(`getTireInspections failed: ${error.message}`);
    }
    return (data || []) as TireInspection[];
  },

  /**
   * Log a new tread-depth inspection. The database trigger
   * sync_tire_latest_tread_depth (20260832000000_tire_management.sql) keeps
   * tires.latest_tread_depth_mm in sync automatically on insert.
   */
  async addTireInspection(input: {
    tenant_id: string;
    tire_id: string;
    vehicle_id?: string | null;
    inspection_date?: string;
    tread_depth_mm: number;
    pressure_bar?: number;
    notes?: string;
  }): Promise<TireInspection> {
    const { data, error } = await supabase
      .from('tire_inspections')
      .insert({
        tenant_id: input.tenant_id,
        tire_id: input.tire_id,
        vehicle_id: input.vehicle_id ?? null,
        inspection_date: input.inspection_date || new Date().toISOString(),
        tread_depth_mm: input.tread_depth_mm,
        pressure_bar: input.pressure_bar,
        notes: input.notes,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'addTireInspection insert returned no data');
    }
    return data as TireInspection;
  },

  /**
   * A tire needs attention if its latest tread depth is below the replacement threshold, or it
   * has been explicitly flagged 'needs_replacement'.
   */
  needsAttention(tire: Tire): boolean {
    if (tire.status === 'needs_replacement') return true;
    if (tire.latest_tread_depth_mm != null && tire.latest_tread_depth_mm < TREAD_DEPTH_REPLACEMENT_THRESHOLD_MM) return true;
    return false;
  },
};
