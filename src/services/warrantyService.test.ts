import { describe, it, expect, vi, beforeEach } from 'vitest';
import { warrantyService } from './warrantyService';
import { Warranty } from '../types';

describe('warrantyService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('checkWarrantyRisk', () => {
    it('returns false if no warranty is on file', async () => {
      vi.spyOn(warrantyService, 'getWarrantyStatus').mockResolvedValue(null);
      
      const isRisk = await warrantyService.checkWarrantyRisk('v1', 'Replace engine');
      expect(isRisk).toBe(false);
    });

    it('returns false for active warranty + authorized action', async () => {
      const activeWarranty: Warranty = {
        id: 'w1',
        vehicle_id: 'v1',
        manufacturer: 'Renault',
        expiry_date: '2030-01-01',
        expiry_mileage: 100000,
        covered_systems: ['engine'],
        status: 'active'
      };
      
      vi.spyOn(warrantyService, 'getWarrantyStatus').mockResolvedValue(activeWarranty);
      
      const isRisk = await warrantyService.checkWarrantyRisk('v1', 'Authorized OEM engine repair', 50000);
      expect(isRisk).toBe(false);
    });

    it('returns true for active warranty + risky action on covered system', async () => {
      const activeWarranty: Warranty = {
        id: 'w1',
        vehicle_id: 'v1',
        manufacturer: 'Renault',
        expiry_date: '2030-01-01',
        expiry_mileage: 100000,
        covered_systems: ['engine'],
        status: 'active'
      };
      
      vi.spyOn(warrantyService, 'getWarrantyStatus').mockResolvedValue(activeWarranty);
      
      // Touches engine, but not an authorized action
      const isRisk = await warrantyService.checkWarrantyRisk('v1', 'Aftermarket engine modification', 50000);
      expect(isRisk).toBe(true);
    });

    it('returns false for expired warranty', async () => {
      const expiredWarranty: Warranty = {
        id: 'w1',
        vehicle_id: 'v1',
        manufacturer: 'Renault',
        expiry_date: '2020-01-01', // in the past
        expiry_mileage: 100000,
        covered_systems: ['engine'],
        status: 'expired'
      };
      
      vi.spyOn(warrantyService, 'getWarrantyStatus').mockResolvedValue(expiredWarranty);
      
      const isRisk = await warrantyService.checkWarrantyRisk('v1', 'Aftermarket engine modification', 150000);
      expect(isRisk).toBe(false);
    });
  });
});
