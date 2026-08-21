import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateLargeFleetDemoData, seedDemoTenant, DEMO_TENANT_UUID } from './demoSeedService';

import { supabaseMock, resetSupabaseMock } from '../../tests/setup/supabaseMock';

vi.mock('../lib/supabase', async () => {
  const { supabaseMock } = await import('../../tests/setup/supabaseMock');
  return { supabase: supabaseMock };
});

describe('demoSeedService Smoke Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSupabaseMock();
  });

  describe('generateLargeFleetDemoData', () => {
    it('generates a heterogeneous transport & logistics fleet for Numilog (~83 vehicles)', () => {
      const dataset = generateLargeFleetDemoData(DEMO_TENANT_UUID);

      // Verify tenant config
      expect(dataset.tenantConfig.id).toBe(DEMO_TENANT_UUID);
      expect(dataset.tenantConfig.societyName).toContain('Numilog Logistics Spa');

      // Verify row counts
      expect(dataset.vehicles).toHaveLength(83);
      expect(dataset.warranties.length).toBeGreaterThanOrEqual(83);
      // Trailers (RM-*) are non-motorized and excluded from fuel logs.
      expect(dataset.fuelLogs.length).toBeGreaterThanOrEqual(75);
      expect(dataset.inventoryItems.length).toBeGreaterThanOrEqual(10);
      expect(dataset.workOrders.length).toBeGreaterThanOrEqual(5);
      expect(dataset.deviceMappings.length).toBeGreaterThanOrEqual(75);
      expect(dataset.auditLogs.length).toBeGreaterThanOrEqual(3);
      expect(dataset.incidents.length).toBeGreaterThanOrEqual(2);
      expect(dataset.costRecords.length).toBeGreaterThanOrEqual(4);
      expect(dataset.alerts.length).toBeGreaterThanOrEqual(7);
    });

    it('covers every heterogeneous vehicle category (trucks, vans, reefers, buses, forklifts, trailers)', () => {
      const dataset = generateLargeFleetDemoData(DEMO_TENANT_UUID);
      const prefixes = new Set(dataset.vehicles.map((v) => v.id.split('-')[0]));
      expect(prefixes).toEqual(new Set(['SR', 'CP', 'FG', 'FR', 'BU', 'CE', 'RM']));
    });

    it('guarantees that at least one alert exists for each rule R1 through R7 out of the box', () => {
      const dataset = generateLargeFleetDemoData(DEMO_TENANT_UUID);
      const ruleIdsInAlerts = dataset.alerts.map((a) => a.rule_id);

      const requiredRules = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'];
      requiredRules.forEach((rule) => {
        expect(ruleIdsInAlerts).toContain(rule);
      });
    });

    it('ensures vehicle health states cover Healthy, Attention, and Critical for R1, R2, and R5', () => {
      const dataset = generateLargeFleetDemoData(DEMO_TENANT_UUID);
      const statuses = dataset.vehicles.map((v) => v.status);

      expect(statuses).toContain('Healthy');
      expect(statuses).toContain('Attention');
      expect(statuses).toContain('Critical');
    });

    it('ensures warranty status covers active, expiring, and expired for warranty checks', () => {
      const dataset = generateLargeFleetDemoData(DEMO_TENANT_UUID);
      const warrantyStatuses = dataset.warranties.map((w) => w.status);

      expect(warrantyStatuses).toContain('active');
      expect(warrantyStatuses).toContain('expired');
    });
  });

  describe('seedDemoTenant', () => {
    it('executes idempotent seeding and returns correct counts', async () => {
      const result = await seedDemoTenant(DEMO_TENANT_UUID);

      expect(result.success).toBe(true);
      expect(result.tenantId).toBe(DEMO_TENANT_UUID);
      expect(result.counts.vehicles).toBe(83);
      expect(result.counts.warranties).toBeGreaterThanOrEqual(83);
      expect(result.counts.fuel_logs).toBeGreaterThanOrEqual(75);
      expect(result.counts.alerts).toBeGreaterThanOrEqual(7);
      expect(result.counts.work_orders).toBeGreaterThanOrEqual(5);
      expect(result.counts.inventory_items).toBeGreaterThanOrEqual(10);
      expect(result.counts.audit_log).toBeGreaterThanOrEqual(3);
    });
  });
});
