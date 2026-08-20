import { Router } from 'express';
import { requireAuth } from './middleware';
import { PMSubscriptionService } from '../services/maintenance/pmSubscriptionService';

export const vehicleRouter = Router();

vehicleRouter.use(requireAuth);

vehicleRouter.get('/', async (req, res) => {
  const supabase = (req as any).supabase;
  
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*');
      
    if (error) throw error;
    
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

vehicleRouter.post('/', async (req, res) => {
  const supabase = (req as any).supabase;
  
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .insert(req.body)
      .select()
      .single();
      
    if (error) throw error;
    
    // Audit Log should be inserted here
    await supabase.from('audit_log').insert({
      action: 'VEHICLE_CREATED',
      resource_type: 'vehicles',
      resource_id: data.id,
      details: req.body
    });
    
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Added for Phase 3B.1 PM resolution on vehicle update
vehicleRouter.put('/:id', async (req, res) => {
  const supabase = (req as any).supabase;
  const vehicleId = req.params.id;
  
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .update(req.body)
      .eq('id', vehicleId)
      .select()
      .single();
      
    if (error) throw error;
    
    // Audit Log
    await supabase.from('audit_log').insert({
      action: 'VEHICLE_UPDATED',
      resource_type: 'vehicles',
      resource_id: data.id,
      details: req.body
    });

    // Re-resolve PM rules since make/model/year might have changed
    await PMSubscriptionService.reResolveForVehicle(vehicleId);
    
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

vehicleRouter.patch('/:id', async (req, res) => {
  const supabase = (req as any).supabase;
  const vehicleId = req.params.id;
  
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .update(req.body)
      .eq('id', vehicleId)
      .select()
      .single();
      
    if (error) throw error;
    
    // Re-resolve PM rules
    await PMSubscriptionService.reResolveForVehicle(vehicleId);
    
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
