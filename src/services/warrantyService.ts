import { supabase } from '../lib/supabase';
import { Warranty } from '../types';

export const warrantyService = {
  async getWarrantyStatus(vehicleId: string): Promise<Warranty | null> {
    try {
      const { data, error } = await supabase
        .from('warranties')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.warn('Error fetching warranty:', error);
        return null;
      }
      
      return data as Warranty | null;
    } catch (e) {
      console.warn('Exception in getWarrantyStatus:', e);
      return null;
    }
  },

  async checkWarrantyRisk(
    vehicleId: string,
    proposedAction: string,
    currentMileage?: number
  ): Promise<boolean> {
    const warranty = await this.getWarrantyStatus(vehicleId);
    
    if (!warranty) return false;
    
    // Check if expired
    if (warranty.status === 'expired') return false;
    if (warranty.expiry_date && new Date(warranty.expiry_date) < new Date()) return false;
    if (warranty.expiry_mileage && currentMileage && currentMileage >= warranty.expiry_mileage) return false;

    // A very simple logic for authorized actions based on proposedAction text.
    // In a real scenario, this would consult a manufacturer database or API.
    const isAuthorizedAction = proposedAction.toLowerCase().includes('authorized') || 
                               proposedAction.toLowerCase().includes('oem') ||
                               proposedAction.toLowerCase().includes('dealer');
    
    // Determine which system the action is touching (mock logic for demo)
    const touchesEngine = proposedAction.toLowerCase().includes('engine') || proposedAction.toLowerCase().includes('cylinder');
    const touchesTransmission = proposedAction.toLowerCase().includes('transmission') || proposedAction.toLowerCase().includes('gearbox');
    const touchesElectrical = proposedAction.toLowerCase().includes('battery') || proposedAction.toLowerCase().includes('wiring');

    let touchesCoveredSystem = false;
    if (touchesEngine && warranty.covered_systems.includes('engine')) touchesCoveredSystem = true;
    if (touchesTransmission && warranty.covered_systems.includes('transmission')) touchesCoveredSystem = true;
    if (touchesElectrical && warranty.covered_systems.includes('electrical')) touchesCoveredSystem = true;
    
    // If it touches a covered system but is NOT an authorized action, there is a warranty risk.
    if (touchesCoveredSystem && !isAuthorizedAction) {
      return true;
    }

    return false;
  }
};
