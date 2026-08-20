import { Router } from 'express';
import { requireAuth } from './middleware';

export const assignmentRouter = Router();

assignmentRouter.use(requireAuth);

assignmentRouter.get('/vehicle/:vehicleId', async (req, res) => {
  const supabase = (req as any).supabase;
  const { vehicleId } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('vehicle_assignments')
      .select('*, driver:profiles(id, first_name, last_name, role)')
      .eq('vehicle_id', vehicleId)
      .order('assigned_at', { ascending: false });
      
    if (error) throw error;
    
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

assignmentRouter.get('/vehicle/:vehicleId/current', async (req, res) => {
  const supabase = (req as any).supabase;
  const { vehicleId } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('vehicle_assignments')
      .select('*, driver:profiles(id, first_name, last_name, role)')
      .eq('vehicle_id', vehicleId)
      .is('unassigned_at', null)
      .maybeSingle();
      
    if (error) throw error;
    
    res.json(data || null);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

assignmentRouter.post('/vehicle/:vehicleId/assign', async (req, res) => {
  const supabase = (req as any).supabase;
  const { vehicleId } = req.params;
  const { driver_id } = req.body;
  
  if (!driver_id) {
    return res.status(400).json({ error: 'driver_id is required' });
  }
  
  try {
    // Transaction via an RPC call (reassign_vehicle_driver) is the best way to handle this in Supabase
    // But we can also do it via standard API calls if RPC is not available yet.
    // For Atomicity as requested, let's call a database RPC if we create one, or just execute an update then insert.
    // Let's implement this using a Supabase RPC "assign_driver_to_vehicle"
    const { data, error } = await supabase.rpc('assign_driver_to_vehicle', {
      p_vehicle_id: vehicleId,
      p_driver_id: driver_id
    });
    
    if (error) throw error;
    
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

assignmentRouter.post('/vehicle/:vehicleId/unassign', async (req, res) => {
  const supabase = (req as any).supabase;
  const { vehicleId } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('vehicle_assignments')
      .update({ unassigned_at: new Date().toISOString() })
      .eq('vehicle_id', vehicleId)
      .is('unassigned_at', null)
      .select();
      
    if (error) throw error;
    
    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
