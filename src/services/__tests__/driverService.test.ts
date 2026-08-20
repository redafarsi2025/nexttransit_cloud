import { describe, it, expect, vi, beforeEach } from 'vitest';
import { driverService } from '../driverService';

import { supabaseMock, resetSupabaseMock } from '../../../tests/setup/supabaseMock';

vi.mock('../../lib/supabase', async () => {
  const { supabaseMock } = await import('../../../tests/setup/supabaseMock');
  return { supabase: supabaseMock };
});

describe('Driver Service & Assignment Matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSupabaseMock();
  });

  describe('assignDriverToVehicle', () => {
    it('Affecter chauffeur disponible -> Succès', async () => {
      supabaseMock.rpc.mockResolvedValueOnce({
        data: { id: 'assign-1', vehicle_id: 'veh-1', driver_id: 'driver-1', assignment_type: 'PRIMARY' },
        error: null
      });

      const result = await driverService.assignDriverToVehicle('veh-1', 'driver-1');
      expect(result.id).toBe('assign-1');
      expect(supabaseMock.rpc).toHaveBeenCalledWith('assign_driver_to_vehicle', {
        p_vehicle_id: 'veh-1',
        p_driver_id: 'driver-1',
        p_assignment_type: 'PRIMARY'
      });
    });

    it('Affecter chauffeur suspendu -> Refus', async () => {
      supabaseMock.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Driver is not AVAILABLE (Status: SUSPENDED)' }
      });

      await expect(driverService.assignDriverToVehicle('veh-1', 'driver-1')).rejects.toThrow(/SUSPENDED/);
    });

    it('Affecter profil désactivé -> Refus', async () => {
      supabaseMock.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Driver Profile is not active' }
      });

      await expect(driverService.assignDriverToVehicle('veh-1', 'driver-1')).rejects.toThrow(/active/);
    });

    it('Permis expiré -> Refus', async () => {
      supabaseMock.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Driver license has expired' }
      });

      await expect(driverService.assignDriverToVehicle('veh-1', 'driver-1')).rejects.toThrow(/license/);
    });

    it('Certificat médical expiré -> Refus', async () => {
      supabaseMock.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Driver medical certificate has expired' }
      });

      await expect(driverService.assignDriverToVehicle('veh-1', 'driver-1')).rejects.toThrow(/medical/);
    });

    it('Chauffeur autre tenant -> Refus', async () => {
      supabaseMock.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Driver Profile not found or tenant mismatch' }
      });

      await expect(driverService.assignDriverToVehicle('veh-1', 'driver-1')).rejects.toThrow(/tenant/);
    });

    it('Véhicule autre tenant -> Refus', async () => {
      supabaseMock.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Security Error: Vehicle tenant mismatch' }
      });

      await expect(driverService.assignDriverToVehicle('veh-1', 'driver-1')).rejects.toThrow(/tenant mismatch/);
    });
  });

  describe('deactivateDriver', () => {
    it('Désactivation chauffeur -> Toutes affectations fermées', async () => {
      supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: null });

      await driverService.deactivateDriver('driver-1');
      expect(supabaseMock.rpc).toHaveBeenCalledWith('deactivate_driver', { p_driver_id: 'driver-1' });
    });
  });
});
