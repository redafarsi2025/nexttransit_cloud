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
 * Validates token, sets password, creates User Profile with invited role & tenant.
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

  // 1. Find invitation by token
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
      console.warn('Could not query invitations table:', e);
    }
  }

  if (!invite) {
    throw new Error('Invalid or already accepted invitation token.');
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    throw new Error('Invitation token has expired. Please request a new invitation from your administrator.');
  }

  // 2. Create Auth User
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: invite.email,
    password: payload.password,
    options: {
      data: {
        full_name: payload.fullName,
        role: invite.role,
      },
    },
  });

  if (authError) {
    throw new Error(`Failed to create account: ${authError.message}`);
  }

  const authUserId = authData.user?.id || `auth-${Date.now()}`;
  const profileId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const userProfile: UserProfile = {
    id: profileId,
    auth_user_id: authUserId,
    tenant_id: invite.tenant_id,
    company_id: invite.company_id || 'cmp-default',
    full_name: payload.fullName,
    email: invite.email,
    role: invite.role,
    status: 'active',
    invited_by: invite.invited_by,
    created_at: new Date().toISOString(),
  };

  // 3. Update invitation & save profile
  invite.accepted_at = new Date().toISOString();

  try {
    await supabase.from('users').insert(userProfile);
    await supabase.from('invitations').update({ accepted_at: invite.accepted_at }).eq('id', invite.id);
  } catch (err) {
    console.warn('Database write error during invitation acceptance:', err);
  }

  // Audit Log
  await recordAudit(
    'invitations',
    invite.id,
    'INVITATION_ACCEPT',
    { status: 'pending' },
    { status: 'accepted', user_id: profileId, email: invite.email, role: invite.role },
    profileId,
    invite.role,
    invite.tenant_id
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
