import { Router } from 'express';
import { requireAuth } from './middleware';

export const inventoryRouter = Router();

inventoryRouter.use(requireAuth);

inventoryRouter.get('/', async (req, res) => {
  const supabase = (req as any).supabase;
  
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*');
      
    if (error) throw error;
    
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
