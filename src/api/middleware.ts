import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../lib/supabaseAdmin';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.split(' ')[1];
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase env vars not configured for auth verification' });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Attach user and supabase client to request for downstream use
    (req as any).user = user;
    (req as any).supabase = supabase;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

/**
 * 'platform-auth-check' middleware to gate access to platform admin areas.
 * Verifies request's JWT against the 'platform_admins' table and returns 403 for unauthorized users.
 */
export const platformAuthCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(403).json({ error: 'Forbidden: Missing or invalid Authorization header' });
    }
    const token = authHeader.split(' ')[1];

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase env vars not configured for auth verification' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
    }

    // Verify against the 'platform_admins' table in Supabase using the privileged client
    const { data: adminRecord, error: tableError } = await supabaseAdmin
      .from('platform_admins')
      .select('id')
      .eq('id', user.id)
      .single();

    if (tableError || !adminRecord) {
      return res.status(403).json({ error: 'Forbidden: You do not have Platform Admin privileges' });
    }

    // Attach user and supabase client to request for downstream use
    (req as any).user = user;
    (req as any).supabase = supabase;

    next();
  } catch (error) {
    console.error('Platform auth check middleware error:', error);
    return res.status(403).json({ error: 'Forbidden: Unauthorized' });
  }
};
