import { Router } from 'express';
import { requireAuth } from './middleware';
import { PMSubscriptionService } from '../services/maintenance/pmSubscriptionService';
import { supabaseAdmin } from '../lib/supabaseAdmin';

export const pmSubscriptionsRouter = Router();

pmSubscriptionsRouter.use(requireAuth);

/**
 * GET /api/pm/subscriptions
 * Get all subscriptions for the current tenant
 */
pmSubscriptionsRouter.get('/', async (req, res) => {
  const supabase = (req as any).supabase;
  const tenantId = (req as any).user.tenant_id;
  
  try {
    const { data, error } = await supabase
      .from('pm_vehicle_subscriptions')
      .select('*, vehicles(plate, make, model), pm_schedules(title)')
      .eq('tenant_id', tenantId);
      
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pm/subscriptions/:id
 */
pmSubscriptionsRouter.get('/:id', async (req, res) => {
  const supabase = (req as any).supabase;
  const tenantId = (req as any).user.tenant_id;
  
  try {
    const { data, error } = await supabase
      .from('pm_vehicle_subscriptions')
      .select('*, vehicles(plate, make, model), pm_schedules(title)')
      .eq('id', req.params.id)
      .eq('tenant_id', tenantId)
      .single();
      
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pm/subscriptions
 * Create a new subscription
 */
pmSubscriptionsRouter.post('/', async (req, res) => {
  const tenantId = (req as any).user.tenant_id;
  const { vehicle_id, pm_schedule_id, initial_targets } = req.body;
  
  try {
    const subscription = await PMSubscriptionService.createSubscription(
      tenantId,
      vehicle_id,
      pm_schedule_id,
      initial_targets
    );
    
    res.status(201).json(subscription);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/pm/subscriptions/:id
 * Update subscription targets
 */
pmSubscriptionsRouter.patch('/:id', async (req, res) => {
  const supabase = (req as any).supabase;
  const tenantId = (req as any).user.tenant_id;
  
  try {
    const { data, error } = await supabase
      .from('pm_vehicle_subscriptions')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('tenant_id', tenantId)
      .select()
      .single();
      
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/pm/subscriptions/:id
 */
pmSubscriptionsRouter.delete('/:id', async (req, res) => {
  const supabase = (req as any).supabase;
  const tenantId = (req as any).user.tenant_id;
  
  try {
    const { error } = await supabase
      .from('pm_vehicle_subscriptions')
      .delete()
      .eq('id', req.params.id)
      .eq('tenant_id', tenantId);
      
    if (error) throw error;
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pm/subscriptions/:id/resolve
 * Force manual re-resolution (useful for diagnostics)
 */
pmSubscriptionsRouter.post('/:id/resolve', async (req, res) => {
  const supabase = (req as any).supabase;
  const tenantId = (req as any).user.tenant_id;
  
  try {
    // Verify ownership
    const { data: sub, error } = await supabase
      .from('pm_vehicle_subscriptions')
      .select('*')
      .eq('id', req.params.id)
      .eq('tenant_id', tenantId)
      .single();
      
    if (error || !sub) throw new Error('Subscription not found');

    await PMSubscriptionService.resolveSubscription(sub);
    
    // Fetch updated
    const { data: updatedSub } = await supabase
      .from('pm_vehicle_subscriptions')
      .select('*')
      .eq('id', req.params.id)
      .single();

    res.json(updatedSub);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
