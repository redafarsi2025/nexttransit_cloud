import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { platformAdminService } from '../services/platformAdminService.server';

export const platformAdminRouter = Router();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

// Extend Express Request type locally
interface AuthenticatedPlatformRequest extends Request {
  platformAdmin?: { id: string; email: string };
}

// Strictly gate all routes to only active platform_admins
const requirePlatformAdmin = async (req: AuthenticatedPlatformRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase env vars not configured for auth verification' });
    }
    
    // Initialize standard supabase client with user token to verify JWT
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user || !user.email) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // VERIFY SUPER_ADMIN natively from the database using service role!
    // We check if this user exists in the platform_admins table
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('platform_admins')
      .select('id')
      .eq('id', user.id)
      .single();
      
    if (adminError || !adminData) {
      return res.status(403).json({ error: 'Forbidden: You do not have Platform Admin privileges' });
    }
    
    req.platformAdmin = { id: user.id, email: user.email };
    next();
  } catch (error) {
    console.error('Platform Admin Auth Error:', error);
    res.status(500).json({ error: 'Internal server error during platform auth' });
  }
};

// 1. Auth Check Endpoint
platformAdminRouter.get('/auth-check', requirePlatformAdmin, (req: AuthenticatedPlatformRequest, res: Response) => {
  res.json({ ok: true, admin: req.platformAdmin });
});

// 2. Stats
platformAdminRouter.get('/stats', requirePlatformAdmin, async (req: AuthenticatedPlatformRequest, res: Response) => {
  try {
    const stats = await platformAdminService.getPlatformStats();
    res.json(stats);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 3. Tenants
platformAdminRouter.get('/tenants', requirePlatformAdmin, async (req: AuthenticatedPlatformRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  try {
    const list = await platformAdminService.getAllTenants(page, limit);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

platformAdminRouter.get('/tenants/:id', requirePlatformAdmin, async (req: AuthenticatedPlatformRequest, res: Response) => {
  try {
    const details = await platformAdminService.getTenantDetails(req.params.id);
    res.json(details);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

platformAdminRouter.post('/tenants/:id/suspend', requirePlatformAdmin, async (req: AuthenticatedPlatformRequest, res: Response) => {
  try {
    await platformAdminService.suspendTenant(req.params.id, req.platformAdmin!.id, req.platformAdmin!.email);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

platformAdminRouter.post('/tenants/:id/reactivate', requirePlatformAdmin, async (req: AuthenticatedPlatformRequest, res: Response) => {
  try {
    await platformAdminService.reactivateTenant(req.params.id, req.platformAdmin!.id, req.platformAdmin!.email);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 4. Users
platformAdminRouter.get('/users', requirePlatformAdmin, async (req: AuthenticatedPlatformRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  try {
    const users = await platformAdminService.getAllUsers(page, limit);
    res.json(users);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

platformAdminRouter.post('/users/:id/disable', requirePlatformAdmin, async (req: AuthenticatedPlatformRequest, res: Response) => {
  try {
    await platformAdminService.disableUser(req.params.id, req.platformAdmin!.id, req.platformAdmin!.email);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

platformAdminRouter.post('/users/:id/enable', requirePlatformAdmin, async (req: AuthenticatedPlatformRequest, res: Response) => {
  try {
    await platformAdminService.enableUser(req.params.id, req.platformAdmin!.id, req.platformAdmin!.email);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

platformAdminRouter.post('/users/:id/role', requirePlatformAdmin, async (req: AuthenticatedPlatformRequest, res: Response) => {
  try {
    await platformAdminService.changeUserRole(req.params.id, req.body.role, req.platformAdmin!.id, req.platformAdmin!.email);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 5. Subscriptions
platformAdminRouter.get('/subscriptions', requirePlatformAdmin, async (req: AuthenticatedPlatformRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  try {
    const subs = await platformAdminService.getAllSubscriptions(page, limit);
    res.json(subs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

platformAdminRouter.post('/subscriptions/:id/extend-trial', requirePlatformAdmin, async (req: AuthenticatedPlatformRequest, res: Response) => {
  try {
    await platformAdminService.extendTrial(req.params.id, req.body.days || 30, req.platformAdmin!.id, req.platformAdmin!.email);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

platformAdminRouter.post('/subscriptions/:id/change-plan', requirePlatformAdmin, async (req: AuthenticatedPlatformRequest, res: Response) => {
  try {
    await platformAdminService.changeSubscriptionPlan(req.params.id, req.body.plan, req.platformAdmin!.id, req.platformAdmin!.email);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 6. Audit Logs
platformAdminRouter.get('/audit-logs', requirePlatformAdmin, async (req: AuthenticatedPlatformRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const tenantId = req.query.tenantId as string || undefined;
  const action = req.query.action as string || undefined;

  try {
    const result = await platformAdminService.getPlatformAuditLogs(page, limit, tenantId, action);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 7. Health
platformAdminRouter.get('/health', requirePlatformAdmin, async (req: AuthenticatedPlatformRequest, res: Response) => {
  try {
    const health = await platformAdminService.getSystemHealth();
    res.json(health);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 8. Platform Admins CRUD
const AddAdminSchema = z.object({ email: z.string().email('Invalid email format') });

platformAdminRouter.get('/admins', requirePlatformAdmin, async (req: AuthenticatedPlatformRequest, res: Response) => {
  try {
    const result = await platformAdminService.getAllPlatformAdmins();
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

platformAdminRouter.post('/admins', requirePlatformAdmin, async (req: AuthenticatedPlatformRequest, res: Response) => {
  const parseResult = AddAdminSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid input', details: parseResult.error.format() });
  }
  try {
    const result = await platformAdminService.addPlatformAdmin(
      parseResult.data.email,
      req.platformAdmin!.id,
      req.platformAdmin!.email
    );
    res.json(result);
  } catch (e: any) {
    // Return 400 for business rule errors (user not found, already admin)
    const status = e.message.includes('No authenticated user') || e.message.includes('already a platform admin') ? 400 : 500;
    res.status(status).json({ error: e.message });
  }
});

platformAdminRouter.delete('/admins/:id', requirePlatformAdmin, async (req: AuthenticatedPlatformRequest, res: Response) => {
  try {
    const result = await platformAdminService.removePlatformAdmin(
      req.params.id,
      req.platformAdmin!.id,
      req.platformAdmin!.email
    );
    res.json(result);
  } catch (e: any) {
    // 409 Conflict for guard violations (last admin, self-removal)
    const status = e.message.includes('GUARD') ? 409 : 500;
    res.status(status).json({ error: e.message });
  }
});
