import { supabase } from '../lib/supabase';
import type { VehicleAssignment, AssignmentType } from '../types';

export const driverService = {
  async assignDriverToVehicle(vehicleId: string, driverId: string, assignmentType: AssignmentType = 'PRIMARY'): Promise<VehicleAssignment> {
    const { data, error } = await supabase.rpc('assign_driver_to_vehicle', {
      p_vehicle_id: vehicleId,
      p_driver_id: driverId,
      p_assignment_type: assignmentType
    });

    if (error) {
      throw new Error(`Failed to assign driver: ${error.message}`);
    }
    return data as unknown as VehicleAssignment;
  },

  async deactivateDriver(driverId: string): Promise<void> {
    const { error } = await supabase.rpc('deactivate_driver', {
      p_driver_id: driverId
    });

    if (error) {
      throw new Error(`Failed to deactivate driver: ${error.message}`);
    }
  }
};
