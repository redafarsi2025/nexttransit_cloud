import { supabase } from '../lib/supabase';
import { Subscription } from '../types';

const inMemorySubscriptions = new Map<string, Subscription>();

/**
 * Get company subscription status.
 * Used by RBAC middleware to gate access when status is 'past_due' or 'cancelled'.
 */
export async function getSubscriptionStatus(companyId: string): Promise<Subscription> {
  if (inMemorySubscriptions.has(companyId)) {
    return inMemorySubscriptions.get(companyId)!;
  }

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (!error && data) {
      const sub = data as Subscription;
      inMemorySubscriptions.set(companyId, sub);
      return sub;
    }
  } catch (err) {
    console.warn('Subscription fetch error, using default trial subscription:', err);
  }

  // Default trial subscription
  const defaultSub: Subscription = {
    id: `sub-${companyId}`,
    company_id: companyId,
    plan: 'enterprise_trial',
    status: 'trial',
    current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  };
  inMemorySubscriptions.set(companyId, defaultSub);
  return defaultSub;
}

/**
 * Update subscription status (for testing / admin billing screen actions).
 */
export async function updateSubscriptionStatus(
  companyId: string,
  status: 'trial' | 'active' | 'past_due' | 'cancelled',
  plan: 'enterprise_trial' | 'professional' | 'enterprise' = 'enterprise'
): Promise<Subscription> {
  const existing = await getSubscriptionStatus(companyId);
  const updated: Subscription = {
    ...existing,
    status,
    plan,
    current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
  };

  inMemorySubscriptions.set(companyId, updated);

  try {
    await supabase.from('subscriptions').upsert(updated);
  } catch (e) {
    console.warn('Skipped DB write for subscription status update:', e);
  }

  return updated;
}
