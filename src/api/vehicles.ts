import { Router } from 'express';
import { requireAuth } from './middleware';

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
