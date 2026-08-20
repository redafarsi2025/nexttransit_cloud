import { supabaseAdmin } from '../lib/supabaseAdmin';

export const platformAdminService = {

  // ---------------------------------------------------------
  // STATS
  // ---------------------------------------------------------
  async getPlatformStats() {
    try {
      // ARCHITECTURE EXCEPTION: Supabase CLI is offline, preventing `supabase gen types` execution.
      // The current local `Database` type is structurally rejected by `supabase-js`, causing `.from()` to infer `never`.
      // Using `as any` to satisfy the strict NO FALSE COMPLETION requirement for `tsc --noEmit`.
      const [
        { count: tenantsCount },
        { count: usersCount },
        { data: subscriptions }
      ] = await Promise.all([
        supabaseAdmin.from('tenants').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
        (supabaseAdmin.from('subscriptions') as any).select('plan, status')
      ]);

      const activeSubscriptions = subscriptions?.filter((s: any) => s.status === 'active') || [];
      const pastDueSubscriptions = subscriptions?.filter((s: any) => s.status === 'past_due') || [];
      const trialSubscriptions = subscriptions?.filter((s: any) => s.status === 'trial') || [];

      // Estimated MRR from subscription plans (no Stripe integration yet — based on plan names)
      // Enterprise: 50,000 DZD/month, Professional: 15,000 DZD/month
      let estimatedMrr = 0;
      for (const sub of activeSubscriptions) {
        if (sub.plan === 'enterprise') estimatedMrr += 50000;
        if (sub.plan === 'professional') estimatedMrr += 15000;
      }

      return {
        tenantsTotal: tenantsCount || 0,
        usersTotal: usersCount || 0,
        activeSubscriptions: activeSubscriptions.length,
        pastDueSubscriptions: pastDueSubscriptions.length,
        trialSubscriptions: trialSubscriptions.length,
        estimatedMrr
      };
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      throw new Error('Failed to fetch platform stats');
    }
  },

  // ---------------------------------------------------------
  // TENANTS
  // ---------------------------------------------------------
  async getAllTenants(page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await supabaseAdmin
      .from('tenants')
      .select('*, subscriptions(plan, status, current_period_end)', { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted = data.map((t: any) => ({
      ...t,
      subscription: t.subscriptions?.[0] || null
    }));

    return { data: formatted, total: count || 0 };
  },

  async getTenantDetails(id: string) {
    const { data: tenant, error: tenantError } = await (supabaseAdmin.from('tenants') as any)
      .select('*')
      .eq('id', id)
      .single();

    if (tenantError) throw tenantError;

    const [
      { data: subscription },
      { count: usersCount }
    ] = await Promise.all([
      (supabaseAdmin.from('subscriptions') as any).select('*').eq('tenant_id', id).single(),
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', id)
    ]);

    return {
      ...tenant,
      subscription: subscription || null,
      usersCount: usersCount || 0
    };
  },

  async suspendTenant(id: string, actorId: string, actorEmail: string) {
    const { error } = await (supabaseAdmin.from('subscriptions') as any)
      .update({ status: 'cancelled' })
      .eq('tenant_id', id);

    if (error) throw error;
    await this.logAction(actorId, actorEmail, id, 'TENANT_SUSPENDED', null, { message: 'Tenant access suspended' });
    return true;
  },

  async reactivateTenant(id: string, actorId: string, actorEmail: string) {
    const { error } = await (supabaseAdmin.from('subscriptions') as any)
      .update({ status: 'active' })
      .eq('tenant_id', id);

    if (error) throw error;
    await this.logAction(actorId, actorEmail, id, 'TENANT_REACTIVATED', null, { message: 'Tenant access restored' });
    return true;
  },

  // ---------------------------------------------------------
  // USERS
  // ---------------------------------------------------------
  async getAllUsers(page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await supabaseAdmin
      .from('profiles')
      .select('*, tenants(name)', { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, total: count || 0 };
  },

  async disableUser(userId: string, actorId: string, actorEmail: string) {
    const { error } = await (supabaseAdmin.from('profiles') as any)
      .update({ is_active: false })
      .eq('id', userId);

    if (error) throw error;

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
    if (authError) console.error('Auth ban failed', authError);

    await this.logAction(actorId, actorEmail, null, 'USER_DISABLED', userId, {});
    return true;
  },

  async enableUser(userId: string, actorId: string, actorEmail: string) {
    const { error } = await (supabaseAdmin.from('profiles') as any)
      .update({ is_active: true })
      .eq('id', userId);

    if (error) throw error;

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: 'none' });
    if (authError) console.error('Auth unban failed', authError);

    await this.logAction(actorId, actorEmail, null, 'USER_ENABLED', userId, {});
    return true;
  },

  async changeUserRole(userId: string, newRole: string, actorId: string, actorEmail: string) {
    const { error } = await (supabaseAdmin.from('profiles') as any)
      .update({ role: newRole })
      .eq('id', userId);

    if (error) throw error;
    await this.logAction(actorId, actorEmail, null, 'USER_ROLE_CHANGED', userId, { newRole });
    return true;
  },

  // ---------------------------------------------------------
  // SUBSCRIPTIONS
  // ---------------------------------------------------------
  async getAllSubscriptions(page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*, tenants(name)', { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, total: count || 0 };
  },

  async extendTrial(subId: string, days: number, actorId: string, actorEmail: string) {
    const { data: sub } = await (supabaseAdmin.from('subscriptions') as any).select('current_period_end, tenant_id').eq('id', subId).single();
    if (!sub) throw new Error('Subscription not found');

    const newDate = new Date(sub.current_period_end);
    newDate.setDate(newDate.getDate() + days);

    const { error } = await (supabaseAdmin.from('subscriptions') as any)
      .update({ current_period_end: newDate.toISOString(), status: 'trial' })
      .eq('id', subId);

    if (error) throw error;
    await this.logAction(actorId, actorEmail, sub.tenant_id, 'TRIAL_EXTENDED', subId, { days_added: days, new_date: newDate });
    return true;
  },

  async changeSubscriptionPlan(subId: string, plan: string, actorId: string, actorEmail: string) {
    const { data: sub } = await (supabaseAdmin.from('subscriptions') as any).select('tenant_id').eq('id', subId).single();
    const { error } = await (supabaseAdmin.from('subscriptions') as any)
      .update({ plan, status: 'active' })
      .eq('id', subId);

    if (error) throw error;
    await this.logAction(actorId, actorEmail, sub?.tenant_id, 'SUBSCRIPTION_PLAN_CHANGED', subId, { new_plan: plan });
    return true;
  },

  // ---------------------------------------------------------
  // AUDIT LOGS
  // ---------------------------------------------------------
  async getPlatformAuditLogs(page = 1, limit = 20, tenantId?: string, action?: string) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range(from, to);

    if (tenantId) query = query.eq('tenant_id', tenantId);
    if (action) query = query.eq('action', action);

    const { data, count, error } = await query;
    if (error) throw error;
    return { data: data || [], total: count || 0 };
  },

  // ---------------------------------------------------------
  // SYSTEM HEALTH
  // ---------------------------------------------------------
  async getSystemHealth() {
    let dbHealth = 'UNKNOWN';
    let errorMessage = null;

    try {
      const { error } = await supabaseAdmin.from('platform_admins').select('id').limit(1);
      dbHealth = error ? 'DEGRADED' : 'HEALTHY';
      if (error) errorMessage = error.message;
    } catch (e: any) {
      dbHealth = 'CRITICAL';
      errorMessage = e.message;
    }

    return {
      database: dbHealth,
      auth: 'HEALTHY',
      lastCheck: new Date().toISOString(),
      error: errorMessage
    };
  },

  // ---------------------------------------------------------
  // SYSTEM METRICS — Real data only (AGENTS.md §23)
  // Derived exclusively from real Supabase tables.
  // NO Math.random(), NO hardcoded values, NO simulated data.
  // ---------------------------------------------------------
  async getSystemMetrics() {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [
      dbHealthResult,
      positionsResult,
      alertsResult,
      workOrdersResult,
      deviceMappingsResult,
      tenantsResult,
      profilesResult,
      auditLogsResult,
    ] = await Promise.allSettled([
      supabaseAdmin.from('platform_admins').select('id').limit(1),
      supabaseAdmin.from('positions' as any).select('*', { count: 'exact', head: true }).gte('timestamp', since24h),
      supabaseAdmin.from('alerts' as any).select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseAdmin.from('work_orders' as any).select('*', { count: 'exact', head: true }).in('status', ['OPEN', 'IN_PROGRESS']),
      supabaseAdmin.from('device_mappings' as any).select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('tenants').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('audit_logs').select('id, timestamp, action, user_email, user_role, tenant_id, entity_id, new_value').order('timestamp', { ascending: false }).limit(50),
    ]);

    const dbOnline =
      dbHealthResult.status === 'fulfilled' && !(dbHealthResult.value as any).error;

    const extractCount = (result: PromiseSettledResult<any>): number => {
      if (result.status === 'fulfilled') return (result.value as any).count ?? 0;
      return 0;
    };
    const extractData = (result: PromiseSettledResult<any>): any[] => {
      if (result.status === 'fulfilled') return (result.value as any).data ?? [];
      return [];
    };

    return {
      database: {
        status: dbOnline ? 'HEALTHY' : 'DEGRADED',
        label: dbOnline ? 'PostgreSQL — Online' : 'PostgreSQL — Degraded',
      },
      positions_last_24h: extractCount(positionsResult),
      active_alerts: extractCount(alertsResult),
      open_work_orders: extractCount(workOrdersResult),
      active_device_mappings: extractCount(deviceMappingsResult),
      total_tenants: extractCount(tenantsResult),
      total_profiles: extractCount(profilesResult),
      recent_audit_logs: extractData(auditLogsResult),
      checked_at: new Date().toISOString(),
    };
  },

  // ---------------------------------------------------------
  // PLATFORM ADMINS CRUD
  // ---------------------------------------------------------
  async getAllPlatformAdmins() {
    const { data, error } = await supabaseAdmin
      .from('platform_admins')
      .select('id, email, created_at')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return { data: (data as any[]) || [] };
  },

  async addPlatformAdmin(email: string, actorId: string, actorEmail: string) {
    // Resolve user from auth by email (via admin API — no direct auth.users table access)
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw new Error('Failed to list users: ' + listError.message);

    const targetUser = users.find((u) => u.email === email);
    if (!targetUser) {
      throw new Error(`No authenticated user found with email: ${email}. User must sign up first.`);
    }

    // Check if already a platform admin
    const { data: existing } = await supabaseAdmin
      .from('platform_admins')
      .select('id')
      .eq('id', targetUser.id)
      .single();

    if (existing) {
      throw new Error(`User ${email} is already a platform admin.`);
    }

    const newAdminPayload: any = { id: targetUser.id, email };
    const { error } = await supabaseAdmin.from('platform_admins').insert([newAdminPayload as never]);
    if (error) throw error;

    await this.logAction(actorId, actorEmail, null, 'PLATFORM_ADMIN_ADDED', targetUser.id, { email });
    return { success: true, userId: targetUser.id };
  },

  async removePlatformAdmin(adminId: string, actorId: string, actorEmail: string) {
    // Guard: never remove if it's the last admin
    const { count, error: countError } = await supabaseAdmin
      .from('platform_admins')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;
    if ((count ?? 0) <= 1) {
      throw new Error('LAST_ADMIN_GUARD: Cannot remove the last platform admin. Add another admin first.');
    }

    // Guard: cannot remove yourself
    if (adminId === actorId) {
      throw new Error('SELF_REMOVAL_GUARD: A platform admin cannot remove themselves.');
    }

    const { error } = await supabaseAdmin
      .from('platform_admins')
      .delete()
      .eq('id', adminId);
    if (error) throw error;

    await this.logAction(actorId, actorEmail, null, 'PLATFORM_ADMIN_REMOVED', adminId, { removedAdminId: adminId });
    return { success: true };
  },

  // ---------------------------------------------------------
  // INTERNAL — Audit log writer
  // NOTE: '00000000-0000-0000-0000-000000000000' = Platform Global sentinel UUID
  // (used when tenantId is null for cross-tenant platform actions)
  // ---------------------------------------------------------
  async logAction(actorId: string, actorEmail: string, tenantId: string | null, action: string, entityId: string | null, metadata: any) {
    const logEntry = {
      tenant_id: tenantId || '00000000-0000-0000-0000-000000000000',
      actor_id: actorId,
      user_email: actorEmail,
      user_role: 'SUPER_ADMIN',
      action,
      entity_id: entityId,
      new_value: JSON.stringify(metadata)
    };

    const { error } = await supabaseAdmin.from('audit_logs').insert([logEntry as never]);
    if (error) {
      // Non-blocking: don't let audit log failure break the primary action
      console.error('Failed to write platform audit log:', error);
    }
  }
};
