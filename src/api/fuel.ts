import { Router } from 'express';
import { requireAuth } from './middleware';

export const fuelRouter = Router();

fuelRouter.use(requireAuth);

fuelRouter.post('/', async (req, res) => {
  const supabase = (req as any).supabase;
  
  try {
    const { data, error } = await supabase
      .from('fuel_logs')
      .insert(req.body)
      .select()
      .single();
      
    if (error) throw error;
    
    // Audit Log should be inserted here
    await supabase.from('audit_log').insert({
      action: 'FUEL_LOG_CREATED',
      resource_type: 'fuel_logs',
      resource_id: data.id,
      details: req.body
    });
    
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

fuelRouter.get('/', async (req, res) => {
  const supabase = (req as any).supabase;
  
  try {
    const { data, error } = await supabase
      .from('fuel_logs')
      .select('*')
      .order('date', { ascending: false });
      
    if (error) throw error;
    
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
