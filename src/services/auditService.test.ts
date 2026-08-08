import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordAudit,
  getAuditTrail,
  updateAuditLog,
  deleteAuditLog,
} from './auditService';

describe('Immutable Audit Trail (Contractual Compliance Ledger)', () => {
  const TEST_TENANT = 'c0a80101-0000-0000-0000-000000000001';

  it('records vehicle status change mutations accurately with before/after state delta', async () => {
    const log = await recordAudit(
      'vehicle',
      'V-001',
      'STATUS_CHANGE',
      { status: 'Critical', active_faults: 2 },
      { status: 'Healthy', active_faults: 0 },
      'usr-fm-01',
      'FLEET_MANAGER',
      TEST_TENANT
    );

    expect(log).toBeDefined();
    expect(log.entity_type).toBe('vehicle');
    expect(log.entity_id).toBe('V-001');
    expect(log.action).toBe('STATUS_CHANGE');
    expect(log.before).toEqual({ status: 'Critical', active_faults: 2 });
    expect(log.after).toEqual({ status: 'Healthy', active_faults: 0 });
    expect(log.actor_role).toBe('FLEET_MANAGER');

    const trail = await getAuditTrail('vehicle', 'V-001');
    expect(trail.some((entry) => entry.id === log.id)).toBe(true);
  });

  it('records work order status transitions with mechanic metadata', async () => {
    const log = await recordAudit(
      'work_order',
      'WO-2026-999',
      'STATUS_CHANGE',
      { status: 'Open', labor_hours: 4 },
      { status: 'Closed', closed_date: '2026-08-04', after_notes: 'Brake pads replaced' },
      'usr-mech-01',
      'MECHANIC',
      TEST_TENANT
    );

    expect(log.entity_type).toBe('work_order');
    expect(log.entity_id).toBe('WO-2026-999');
    expect(log.action).toBe('STATUS_CHANGE');
    expect(log.after.status).toBe('Closed');

    const trail = await getAuditTrail('work_order', 'WO-2026-999');
    expect(trail.length).toBeGreaterThan(0);
    expect(trail[0].after.after_notes).toBe('Brake pads replaced');
  });

  it('records CAE budget prioritization approvals with decision context', async () => {
    const log = await recordAudit(
      'cae_budget',
      'CAE-ALLOC-2026',
      'APPROVAL',
      { total_demand: 18500, available_budget: 15000 },
      { approved_count: 3, approved_total_cost: 14200, status: 'APPROVED' },
      'usr-dir-01',
      'DIRECTOR',
      TEST_TENANT
    );

    expect(log.entity_type).toBe('cae_budget');
    expect(log.action).toBe('APPROVAL');
    expect(log.actor_role).toBe('DIRECTOR');
    expect(log.after.approved_total_cost).toBe(14200);

    const caeTrail = await getAuditTrail('cae_budget');
    expect(caeTrail.some((entry) => entry.id === log.id)).toBe(true);
  });

  it('records R1-R7 rule overrides with reason context', async () => {
    const log = await recordAudit(
      'alert',
      'ALT-R1-042',
      'OVERRIDE',
      { vehicle_id: 'V-003', severity: 'Critical' },
      { override_reason: 'Emergency dispatch authorized by Director Akram' },
      'usr-dir-01',
      'DIRECTOR',
      TEST_TENANT
    );

    expect(log.entity_type).toBe('alert');
    expect(log.action).toBe('OVERRIDE');
    expect(log.after.override_reason).toBe('Emergency dispatch authorized by Director Akram');
  });

  it('strictly enforces append-only immutability by rejecting UPDATE and DELETE attempts', async () => {
    await expect(updateAuditLog()).rejects.toThrow(
      'IMMUTABLE AUDIT TRAIL VIOLATION: Updates are strictly prohibited on audit_log records.'
    );

    await expect(deleteAuditLog()).rejects.toThrow(
      'IMMUTABLE AUDIT TRAIL VIOLATION: Deletions are strictly prohibited on audit_log records.'
    );
  });
});
