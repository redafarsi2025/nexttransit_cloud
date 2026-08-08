import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Define DB path for JSON file-backed persistence
const DB_FILE_PATH = path.join(process.cwd(), 'platform_db.json');

export interface PlatformAdmin {
  id: string;
  full_name: string;
  email: string;
  status: 'active' | 'disabled';
  created_at: string;
}

export interface PlatformAuditLog {
  id: string;
  actor_id: string;
  actor_email?: string;
  tenant_id: string | null;
  action: string;
  before: any;
  after: any;
  created_at: string;
}

export interface TenantConfigItem {
  id: string;
  societyName: string;
  enabled_modules: string[];
  operatingRegion: string;
  contactEmail: string;
  created_at: string;
}

export interface SubscriptionItem {
  id: string;
  company_id: string;
  tenant_id: string;
  plan: 'enterprise_trial' | 'professional' | 'enterprise';
  status: 'trial' | 'active' | 'past_due' | 'cancelled';
  max_vehicles?: number;
  current_period_end: string;
  created_at: string;
}

export interface BackendConfigItem {
  id: string;
  tenant_id: string | null; // null means global
  hosting_provider: 'supabase_cloud' | 'vps_algeria';
  updated_at: string;
}

interface PlatformSchema {
  platform_admins: PlatformAdmin[];
  platform_audit_log: PlatformAuditLog[];
  tenants: TenantConfigItem[];
  subscriptions: SubscriptionItem[];
  backend_config: BackendConfigItem[];
  impersonation_tokens: Array<{
    token: string;
    admin_id: string;
    tenant_id: string;
    expires_at: string;
  }>;
}

// Initial seed data
const DEFAULT_SCHEMA: PlatformSchema = {
  platform_admins: [
    {
      id: 'plat-admin-001',
      full_name: 'Farsi Reda',
      email: 'FarsiReda@gmail.com',
      status: 'active',
      created_at: new Date().toISOString()
    },
    {
      id: 'plat-admin-002',
      full_name: 'SaaS Operator Support',
      email: 'operator@nexttransit.com',
      status: 'active',
      created_at: new Date().toISOString()
    }
  ],
  platform_audit_log: [
    {
      id: 'pal-001',
      actor_id: 'plat-admin-001',
      actor_email: 'FarsiReda@gmail.com',
      tenant_id: null,
      action: 'PLATFORM_BOOT',
      before: null,
      after: { status: 'SaaS Operator Control Panel Active' },
      created_at: new Date().toISOString()
    }
  ],
  tenants: [
    {
      id: 'c0a80101-0000-0000-0000-000000000001',
      societyName: 'Numilog Logistics Spa (Grand Master Flotte)',
      enabled_modules: [
        'STRATEGIC_DASHBOARD',
        'VARIANCE_DASHBOARD',
        'FLEET_HEALTH_GRID',
        'INVENTORY_DASHBOARD',
        'WORK_ORDER_QUEUE',
        'PM_SCHEDULES',
        'FUEL_LOGS',
        'TELEMETRY_STREAM',
        'AUDIT_LOG'
      ],
      operatingRegion: 'Algérie - Réseau National Flotte Lourde',
      contactEmail: 'direction.flotte@numilog.dz',
      created_at: new Date().toISOString()
    },
    {
      id: 'tenant-demo-oran',
      societyName: 'Oran Multi-Temp Cold Chain Logistics',
      enabled_modules: [
        'STRATEGIC_DASHBOARD',
        'FLEET_HEALTH_GRID',
        'WORK_ORDER_QUEUE',
        'FUEL_LOGS'
      ],
      operatingRegion: 'Oran - Hub Ouest',
      contactEmail: 'contact@oran-coldchain.dz',
      created_at: new Date().toISOString()
    }
  ],
  subscriptions: [
    {
      id: 'sub-numilog-001',
      company_id: 'cmp-numilog-001',
      tenant_id: 'c0a80101-0000-0000-0000-000000000001',
      plan: 'enterprise',
      status: 'active',
      max_vehicles: 500,
      current_period_end: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      created_at: new Date().toISOString()
    },
    {
      id: 'sub-oran-001',
      company_id: 'cmp-oran-001',
      tenant_id: 'tenant-demo-oran',
      plan: 'professional',
      status: 'active',
      max_vehicles: 50,
      current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      created_at: new Date().toISOString()
    }
  ],
  backend_config: [
    {
      id: 'bc-global',
      tenant_id: null,
      hosting_provider: 'vps_algeria',
      updated_at: new Date().toISOString()
    },
    {
      id: 'bc-numilog',
      tenant_id: 'c0a80101-0000-0000-0000-000000000001',
      hosting_provider: 'vps_algeria',
      updated_at: new Date().toISOString()
    }
  ],
  impersonation_tokens: []
};

// Singleton storage helper
class PlatformDatabase {
  private schema: PlatformSchema;

  constructor() {
    this.schema = { ...DEFAULT_SCHEMA };
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(fileContent);
        this.schema = {
          platform_admins: parsed.platform_admins || DEFAULT_SCHEMA.platform_admins,
          platform_audit_log: parsed.platform_audit_log || DEFAULT_SCHEMA.platform_audit_log,
          tenants: parsed.tenants || DEFAULT_SCHEMA.tenants,
          subscriptions: parsed.subscriptions || DEFAULT_SCHEMA.subscriptions,
          backend_config: parsed.backend_config || DEFAULT_SCHEMA.backend_config,
          impersonation_tokens: parsed.impersonation_tokens || []
        };
      } else {
        this.save();
      }
    } catch (e) {
      console.error('Error loading platform database file, using memory storage:', e);
    }
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.schema, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error writing platform database file:', e);
    }
  }

  public getSchema(): PlatformSchema {
    return this.schema;
  }
}

const db = new PlatformDatabase();

export function getPlatformAdmins(): PlatformAdmin[] {
  return db.getSchema().platform_admins;
}

export function isPlatformAdmin(email: string): PlatformAdmin | null {
  const normEmail = email.toLowerCase().trim();
  const admin = db.getSchema().platform_admins.find(a => a.email.toLowerCase().trim() === normEmail);
  if (admin && admin.status === 'active') {
    return admin;
  }
  return null;
}

export function addPlatformAdmin(admin: Omit<PlatformAdmin, 'created_at'>): PlatformAdmin {
  const schema = db.getSchema();
  const existing = schema.platform_admins.find(a => a.email.toLowerCase().trim() === admin.email.toLowerCase().trim());
  if (existing) {
    existing.full_name = admin.full_name;
    existing.status = admin.status;
    db.save();
    return existing;
  }
  const newAdmin: PlatformAdmin = {
    ...admin,
    created_at: new Date().toISOString()
  };
  schema.platform_admins.push(newAdmin);
  db.save();
  return newAdmin;
}

export function getPlatformAuditLogs(page: number = 1, limit: number = 20, tenantId?: string, action?: string): { logs: PlatformAuditLog[], total: number } {
  let logs = [...db.getSchema().platform_audit_log];
  
  if (tenantId) {
    logs = logs.filter(l => l.tenant_id === tenantId);
  }
  if (action) {
    logs = logs.filter(l => l.action === action);
  }
  
  // Sort by date desc
  logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  const total = logs.length;
  const startIndex = (page - 1) * limit;
  const paginatedLogs = logs.slice(startIndex, startIndex + limit);
  
  return {
    logs: paginatedLogs,
    total
  };
}

export function addPlatformAuditLog(actorId: string, tenantId: string | null, action: string, before: any, after: any): PlatformAuditLog {
  const schema = db.getSchema();
  const actor = schema.platform_admins.find(a => a.id === actorId);
  
  const newLog: PlatformAuditLog = {
    id: `pal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    actor_id: actorId,
    actor_email: actor?.email || 'unknown@nexttransit.com',
    tenant_id: tenantId,
    action,
    before,
    after,
    created_at: new Date().toISOString()
  };
  
  schema.platform_audit_log.push(newLog);
  db.save();
  return newLog;
}

export function getTenantsList(): { id: string; societyName: string; enabled_modules: string[]; operatingRegion: string; contactEmail: string; plan: string; status: string; max_vehicles: number; created_at: string }[] {
  const schema = db.getSchema();
  return schema.tenants.map(t => {
    const sub = schema.subscriptions.find(s => s.tenant_id === t.id) || {
      plan: 'enterprise_trial',
      status: 'trial',
      max_vehicles: 200
    };
    return {
      id: t.id,
      societyName: t.societyName,
      enabled_modules: t.enabled_modules,
      operatingRegion: t.operatingRegion,
      contactEmail: t.contactEmail,
      plan: sub.plan,
      status: sub.status,
      max_vehicles: sub.max_vehicles || 200,
      created_at: t.created_at
    };
  });
}

export function updateTenantModules(actorId: string, tenantId: string, enabled_modules: string[]): boolean {
  const schema = db.getSchema();
  const tenant = schema.tenants.find(t => t.id === tenantId);
  if (!tenant) return false;
  
  const before = { enabled_modules: [...tenant.enabled_modules] };
  tenant.enabled_modules = enabled_modules;
  const after = { enabled_modules: [...tenant.enabled_modules] };
  
  addPlatformAuditLog(actorId, tenantId, 'UPDATE_TENANT_MODULES', before, after);
  db.save();
  return true;
}

export function updateTenantSubscription(actorId: string, tenantId: string, plan: 'enterprise_trial' | 'professional' | 'enterprise', status: 'trial' | 'active' | 'past_due' | 'cancelled', max_vehicles: number): boolean {
  const schema = db.getSchema();
  let sub = schema.subscriptions.find(s => s.tenant_id === tenantId);
  
  if (!sub) {
    sub = {
      id: `sub-${Date.now()}`,
      company_id: `cmp-${tenantId}`,
      tenant_id: tenantId,
      plan,
      status,
      max_vehicles,
      current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      created_at: new Date().toISOString()
    };
    schema.subscriptions.push(sub);
  }
  
  const before = { plan: sub.plan, status: sub.status, max_vehicles: sub.max_vehicles };
  sub.plan = plan;
  sub.status = status;
  sub.max_vehicles = max_vehicles;
  const after = { plan: sub.plan, status: sub.status, max_vehicles: sub.max_vehicles };
  
  addPlatformAuditLog(actorId, tenantId, 'UPDATE_TENANT_SUBSCRIPTION', before, after);
  db.save();
  return true;
}

export function getBackendConfigsList(): BackendConfigItem[] {
  return db.getSchema().backend_config;
}

export function updateBackendConfig(actorId: string, tenantId: string | null, hosting_provider: 'supabase_cloud' | 'vps_algeria'): boolean {
  const schema = db.getSchema();
  let config = schema.backend_config.find(c => c.tenant_id === tenantId);
  
  if (!config) {
    config = {
      id: `bc-${tenantId || 'global'}-${Date.now()}`,
      tenant_id: tenantId,
      hosting_provider,
      updated_at: new Date().toISOString()
    };
    schema.backend_config.push(config);
  }
  
  const before = { hosting_provider: config.hosting_provider };
  config.hosting_provider = hosting_provider;
  config.updated_at = new Date().toISOString();
  const after = { hosting_provider: config.hosting_provider };
  
  addPlatformAuditLog(actorId, tenantId || 'GLOBAL', 'UPDATE_BACKEND_CONFIG', before, after);
  db.save();
  return true;
}

export function createImpersonationToken(actorId: string, adminId: string, tenantId: string): string {
  const schema = db.getSchema();
  const token = `imp-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry
  
  schema.impersonation_tokens.push({
    token,
    admin_id: adminId,
    tenant_id: tenantId,
    expires_at
  });
  
  // Clean up expired ones while we're here
  schema.impersonation_tokens = schema.impersonation_tokens.filter(t => new Date(t.expires_at).getTime() > Date.now());
  
  addPlatformAuditLog(actorId, tenantId, 'IMPERSONATION_TOKEN_ISSUED', null, { token_prefix: token.slice(0, 8), expires_at });
  db.save();
  return token;
}

export function validateImpersonationToken(token: string): { admin_id: string; tenant_id: string } | null {
  const schema = db.getSchema();
  const record = schema.impersonation_tokens.find(t => t.token === token);
  
  if (!record) return null;
  if (new Date(record.expires_at).getTime() < Date.now()) {
    // Expired
    return null;
  }
  
  return {
    admin_id: record.admin_id,
    tenant_id: record.tenant_id
  };
}
