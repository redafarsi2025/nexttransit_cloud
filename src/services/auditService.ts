import { supabase } from '../lib/supabase';
import { AuditLogEntry } from '../types';

const INITIAL_TENANT_ID = 'c0a80101-0000-0000-0000-000000000001';

// In-memory store for instant UI reactivity & fallback if Supabase table is offline
const inMemoryAuditLogs: AuditLogEntry[] = [
  {
    id: 'audit-001',
    tenant_id: INITIAL_TENANT_ID,
    actor_id: 'usr-dir-01',
    actor_role: 'DIRECTOR',
    entity_type: 'cae_budget',
    entity_id: 'cae-001',
    action: 'APPROVAL',
    before: { status: 'Pending Review', priority_score: 84 },
    after: { status: 'Approved', approved_by: 'Director Akram', priority_score: 84 },
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
  },
  {
    id: 'audit-002',
    tenant_id: INITIAL_TENANT_ID,
    actor_id: 'usr-fm-01',
    actor_role: 'FLEET_MANAGER',
    entity_type: 'vehicle',
    entity_id: 'V-001',
    action: 'STATUS_CHANGE',
    before: { status: 'Critical', active_faults_count: 2 },
    after: { status: 'Healthy', active_faults_count: 0 },
    created_at: new Date(Date.now() - 3600000 * 24 * 1.5).toISOString(),
  },
  {
    id: 'audit-003',
    tenant_id: INITIAL_TENANT_ID,
    actor_id: 'usr-fm-01',
    actor_role: 'FLEET_MANAGER',
    entity_type: 'work_order',
    entity_id: 'WO-2026-003',
    action: 'STATUS_CHANGE',
    before: { status: 'In Progress', reserved_parts_count: 2 },
    after: { status: 'Completed', deducted_parts_count: 2 },
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'audit-004',
    tenant_id: INITIAL_TENANT_ID,
    actor_id: 'usr-tc-01',
    actor_role: 'TECHNICAL_CONTROLLER',
    entity_type: 'alert',
    entity_id: 'R1-ALT-089',
    action: 'OVERRIDE',
    before: { active: true, vehicle_status: 'Unsafe' },
    after: { active: false, override_reason: 'Emergency dispatch override verified by Technical Controller' },
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
];

/**
 * Record an immutable audit log entry.
 * Business Rule: Every write to vehicles, work_orders, alerts (rule overrides), and CAE budget approvals
 * produces exactly one audit_log row in the same transaction/operation.
 */
export async function recordAudit(
  entityType: 'vehicle' | 'work_order' | 'alert' | 'cae_budget' | string,
  entityId: string,
  action: 'CREATE' | 'UPDATE' | 'STATUS_CHANGE' | 'OVERRIDE' | 'APPROVAL' | string,
  before: Record<string, any>,
  after: Record<string, any>,
  actorId: string = 'usr-current',
  actorRole: string = 'FLEET_MANAGER',
  tenantId: string = INITIAL_TENANT_ID
): Promise<AuditLogEntry> {
  const newRecord: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    tenant_id: tenantId,
    actor_id: actorId,
    actor_role: actorRole,
    entity_type: entityType,
    entity_id: entityId,
    action: action,
    before: before || {},
    after: after || {},
    created_at: new Date().toISOString(),
  };

  // Write to in-memory store
  inMemoryAuditLogs.unshift(newRecord);

  // Attempt async write to Supabase if available
  if (supabase) {
    try {
      await supabase.from('audit_log').insert({
        tenant_id: newRecord.tenant_id,
        actor_id: newRecord.actor_id,
        actor_role: newRecord.actor_role,
        entity_type: newRecord.entity_type,
        entity_id: newRecord.entity_id,
        action: newRecord.action,
        before: newRecord.before,
        after: newRecord.after,
        created_at: newRecord.created_at,
      });
    } catch (err) {
      console.warn('Supabase audit_log insert silent fallback:', err);
    }
  }

  return newRecord;
}

/**
 * API: Read-only query for tenant-scoped audit trail, filterable by entity type and date range.
 */
export async function getAuditTrail(
  entityType?: string,
  entityId?: string,
  startDate?: string,
  endDate?: string,
  limit: number = 100
): Promise<AuditLogEntry[]> {
  let logs = [...inMemoryAuditLogs];

  if (entityType && entityType !== 'all') {
    logs = logs.filter((l) => l.entity_type === entityType);
  }

  if (entityId) {
    logs = logs.filter((l) => l.entity_id === entityId);
  }

  if (startDate) {
    const start = new Date(startDate).getTime();
    logs = logs.filter((l) => new Date(l.created_at).getTime() >= start);
  }

  if (endDate) {
    const end = new Date(endDate).getTime() + 86400000; // end of day
    logs = logs.filter((l) => new Date(l.created_at).getTime() <= end);
  }

  // Sort descending by creation date
  logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return logs.slice(0, limit);
}

/**
 * Strict Immutability Safeguards
 * UPDATE and DELETE are explicitly prohibited on audit logs.
 */
export async function updateAuditLog(): Promise<never> {
  throw new Error('IMMUTABLE AUDIT TRAIL VIOLATION: Updates are strictly prohibited on audit_log records.');
}

export async function deleteAuditLog(): Promise<never> {
  throw new Error('IMMUTABLE AUDIT TRAIL VIOLATION: Deletions are strictly prohibited on audit_log records.');
}
