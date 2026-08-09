import { supabase } from '../lib/supabase';
import { Invitation, UserProfile, Role } from '../types';
import { validatePasswordPolicy } from './authService';
import { recordAudit } from './auditService';

// In-memory fallback invitations store
const inMemoryInvitations: Invitation[] = [];

/**
 * Send / Create an Invitation to a new user.
 * Roles: DIRECTOR, FLEET_MANAGER, MAINTENANCE_MANAGER, FINANCE, OPERATIONS, MECHANIC, DRIVER
 * (Only SUPER_ADMIN and DIRECTOR can invite new users).
 */
export async function createInvitation(payload: {
  tenantId: string;
  companyId: string;
  email: string;
  role: Role;
  invitedBy: string;
  invitedByRole: Role;
}): Promise<Invitation> {
  if (payload.role === 'SUPER_ADMIN' && payload.invitedByRole !== 'SUPER_ADMIN') {
    throw new Error('Only a SUPER_ADMIN can invite another SUPER_ADMIN.');
  }

  const token = `inv_tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(); // 7 days

  const invitation: Invitation = {
    id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    tenant_id: payload.tenantId,
    company_id: payload.companyId,
    email: payload.email.toLowerCase().trim(),
    role: payload.role,
    invited_by: payload.invitedBy,
    token: token,
    expires_at: expiresAt,
    accepted_at: null,
    created_at: new Date().toISOString(),
  };

  inMemoryInvitations.unshift(invitation);

  try {
    await supabase.from('invitations').insert(invitation);
  } catch (err) {
    console.warn('Database write skipped for invitation, stored in memory:', err);
  }

  // Record Audit Log
  await recordAudit(
    'invitations',
    invitation.id,
    'INVITATION_CREATE',
    {},
    { email: invitation.email, role: invitation.role, token: invitation.token },
    payload.invitedBy,
    payload.invitedByRole,
    payload.tenantId
  );

  return invitation;
}

/**
 * Accept an invitation via invitation token.
 * Security model:
 *   1. Validate token client-side for fast UX feedback (expiry, existence)
 *   2. Create Auth user via signUp() with NO role/tenant_id in metadata
 *   3. Call accept_tenant_invitation() SECURITY DEFINER which:
 *      - Atomically claims the token (prevents concurrent double-accept)
 *      - Reads role and tenant_id from the invitations table (NOT from client)
 *      - Updates profiles with the server-sourced values
 */
export async function acceptInvitation(payload: {
  token: string;
  password: string;
  fullName: string;
}): Promise<UserProfile> {
  const passCheck = validatePasswordPolicy(payload.password);
  if (!passCheck.valid) {
    throw new Error(passCheck.error);
  }

  // 1. Client-side pre-validation for fast feedback (token existence, expiry)
  //    The real atomic validation happens server-side in the RPC function.
  let invite: Invitation | null = inMemoryInvitations.find((i) => i.token === payload.token && !i.accepted_at) || null;

  if (!invite) {
    try {
      const { data } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', payload.token)
        .is('accepted_at', null)
        .single();
      if (data) invite = data as Invitation;
    } catch (e) {
      console.warn('Could not pre-validate invitation token:', e);
    }
  }

  if (!invite) {
    throw new Error('Invalid or already accepted invitation token.');
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    throw new Error('Invitation token has expired. Please request a new invitation from your administrator.');
  }

  // 2. Create Auth user.
  // SECURITY: Do NOT pass role or tenant_id in metadata.
  // The trigger sets DRIVER + NULL tenant; the RPC function provisions the real values.
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: invite.email,
    password: payload.password,
    options: {
      data: {
        full_name: payload.fullName,
        // SECURITY: role and tenant_id intentionally omitted — set by server RPC below
      },
    },
  });

  if (authError) {
    throw new Error(`Failed to create account: ${authError.message}`);
  }

  const authUserId = authData.user?.id;
  if (!authUserId) {
    throw new Error('Account creation failed: no user ID returned.');
  }

  // 3. Call the SECURITY DEFINER function which:
  //    - Atomically marks token as accepted (preventing concurrent reuse)
  //    - Reads role + tenant_id from invitations table (never from client)
  //    - Updates profiles with server-sourced values
  const { data: rpcData, error: rpcError } = await supabase.rpc('accept_tenant_invitation', {
    p_token:     payload.token,
    p_full_name: payload.fullName,
    p_email:     invite.email,
  });

  if (rpcError) {
    throw new Error(`Invitation acceptance failed: ${rpcError.message}`);
  }

  const assignedTenantId = (rpcData as any)?.tenant_id || invite.tenant_id;
  const assignedRole     = (rpcData as any)?.role      || invite.role;

  // Update in-memory cache
  const memIdx = inMemoryInvitations.findIndex((i) => i.token === payload.token);
  if (memIdx >= 0) {
    inMemoryInvitations[memIdx].accepted_at = new Date().toISOString();
  }

  const userProfile: UserProfile = {
    id:          authUserId,
    auth_user_id: authUserId,
    tenant_id:   assignedTenantId,
    company_id:  invite.company_id || '',
    full_name:   payload.fullName,
    email:       invite.email,
    role:        assignedRole as Role,
    status:      'active',
    invited_by:  invite.invited_by,
    created_at:  new Date().toISOString(),
  };

  // Audit Log
  await recordAudit(
    'invitations',
    invite.id,
    'INVITATION_ACCEPT',
    { status: 'pending' },
    { status: 'accepted', user_id: authUserId, email: invite.email, role: assignedRole },
    authUserId,
    assignedRole as Role,
    assignedTenantId
  );

  return userProfile;
}

/**
 * Revoke an active invitation.
 */
export async function revokeInvitation(invitationId: string, actorId: string, actorRole: Role, tenantId: string): Promise<void> {
  const index = inMemoryInvitations.findIndex((i) => i.id === invitationId);
  let email = '';
  if (index >= 0) {
    email = inMemoryInvitations[index].email;
    inMemoryInvitations.splice(index, 1);
  }

  try {
    await supabase.from('invitations').delete().eq('id', invitationId);
  } catch (e) {
    console.warn('Error deleting invitation from DB:', e);
  }

  await recordAudit(
    'invitations',
    invitationId,
    'INVITATION_REVOKE',
    { invitation_id: invitationId },
    { revoked: true, email },
    actorId,
    actorRole,
    tenantId
  );
}

/**
 * List pending invitations for tenant.
 */
export async function listPendingInvitations(tenantId: string): Promise<Invitation[]> {
  try {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('accepted_at', null);

    if (!error && data && data.length > 0) {
      return data as Invitation[];
    }
  } catch (e) {
    console.warn('Using in-memory invitations list fallback:', e);
  }

  return inMemoryInvitations.filter((i) => i.tenant_id === tenantId && !i.accepted_at);
}
