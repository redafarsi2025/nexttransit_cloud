import { Router, Request, Response } from 'express';
import { requireAuth } from './middleware';
import { supabaseAdmin } from '../lib/supabaseAdmin';

export const tenantUsersRouter = Router();

tenantUsersRouter.use(requireAuth);

/**
 * POST /api/tenant-users
 * Allows a TENANT_ADMIN, DIRECTOR, or FLEET_MANAGER to directly create a user for their tenant.
 */
tenantUsersRouter.post('/', async (req: Request, res: Response) => {
  const { email, password, full_name, role, phone } = req.body;
  const user = (req as any).user;

  try {
    // 1. Verify the requester's role and get their tenant_id
    const { data: requesterProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id, company_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !requesterProfile) {
      console.error('Cannot verify requester profile. user.id:', user?.id, 'Error:', profileError);
      return res.status(403).json({ error: 'Forbidden: Cannot verify requester profile. ' + (profileError?.message || 'Profile not found') });
    }

    const allowedRoles = ['SUPER_ADMIN', 'TENANT_ADMIN', 'DIRECTOR', 'FLEET_MANAGER'];
    if (!allowedRoles.includes(requesterProfile.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges to create users directly.' });
    }

    const tenantId = requesterProfile.tenant_id;
    const companyId = requesterProfile.company_id;

    if (!tenantId) {
      return res.status(403).json({ error: 'Forbidden: No tenant associated with the requester.' });
    }

    // Validate input
    if (!email || !password || !full_name || !role) {
      return res.status(400).json({ error: 'Missing required fields (email, password, full_name, role)' });
    }

    // Validate role against allowed roles
    const validRoles = [
      'SUPER_ADMIN', 'TENANT_ADMIN', 'DIRECTOR', 'FLEET_MANAGER', 
      'MAINTENANCE_MANAGER', 'FINANCE', 'OPERATIONS', 'MECHANIC', 'DRIVER'
    ];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role provided' });
    }

    // Prevent non-super-admins from creating super-admins or tenant-admins
    if (requesterProfile.role !== 'SUPER_ADMIN' && ['SUPER_ADMIN', 'TENANT_ADMIN'].includes(role)) {
      return res.status(403).json({ error: 'Forbidden: Cannot create an admin with equal or higher privileges.' });
    }

    // 2. Create the user in auth.users using supabaseAdmin
    // The database trigger 'handle_new_user' will automatically insert into public.profiles
    const { data: newAuthUser, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        tenant_id: tenantId,
        role: role,
        full_name: full_name,
        phone: phone,
      }
    });

    if (authCreateError || !newAuthUser.user) {
      console.error('Error creating user in auth:', authCreateError);
      return res.status(400).json({ error: authCreateError?.message || 'Failed to create authentication identity' });
    }

    // 3. Update the newly created public.profiles record
    // The handle_new_user trigger inserts a row with role=DRIVER and tenant_id=NULL.
    // We must update it with the requested values.
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        tenant_id: tenantId,
        company_id: companyId,
        role: role,
        full_name: full_name,
      })
      .eq('id', newAuthUser.user.id);

    if (profileUpdateError) {
      console.error('Error updating user profile:', profileUpdateError);
      // Rollback auth user creation if profile update fails
      await supabaseAdmin.auth.admin.deleteUser(newAuthUser.user.id);
      return res.status(500).json({ error: 'Failed to update user profile. Identity creation rolled back.' });
    }

    return res.status(201).json({ message: 'User created successfully', user: { id: newAuthUser.user.id, email, full_name, role, tenant_id: tenantId } });
  } catch (error) {
    console.error('Direct user creation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
