import { supabase } from '../lib/supabase';
import { UserProfile, Company, Subscription, Role } from '../types';
import { recordAudit } from './auditService';

// Common weak passwords to reject
const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  '1234567890',
  '12345678',
  '123456789',
  'qwerty1234',
  'letmein123',
  'welcome123',
  'admin12345',
  'administrator',
  'nexttransit1',
]);

export interface RateLimitStatus {
  attempts: number;
  lockedUntil?: number;
}

const loginAttemptsMap = new Map<string, RateLimitStatus>();
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;

/**
 * Validates password policy:
 * - Minimum 10 characters
 * - At least one number
 * - At least one non-alphanumeric character
 * - Rejects top common passwords
 */
export function validatePasswordPolicy(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 10) {
    return { valid: false, error: 'Password must be at least 10 characters long.' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, error: 'Password must contain at least one numeric digit.' };
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one non-alphanumeric character (e.g. !@#$).' };
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase().trim())) {
    return { valid: false, error: 'Password is too common and weak. Please choose a stronger password.' };
  }
  return { valid: true };
}

/**
 * Check rate limit for an email before attempting login (Async DB check with memory fallback).
 */
export async function checkRateLimitAsync(email: string): Promise<{ locked: boolean; remainingMinutes?: number }> {
  const normEmail = email.toLowerCase().trim();
  try {
    const { data, error } = await supabase
      .from('login_attempts')
      .select('email, attempts, locked_until')
      .eq('email', normEmail)
      .single();

    if (!error && data) {
      if (data.locked_until) {
        const lockedUntilTime = new Date(data.locked_until).getTime();
        const now = Date.now();
        if (now < lockedUntilTime) {
          const remainingMinutes = Math.ceil((lockedUntilTime - now) / 60000);
          return { locked: true, remainingMinutes };
        } else {
          await clearRateLimitAsync(normEmail);
          return { locked: false };
        }
      }
    }
  } catch (err) {
    // Fallback to in-memory check
  }
  return checkRateLimit(email);
}

/**
 * Synchronous check for rate limit from local memory cache.
 */
export function checkRateLimit(email: string): { locked: boolean; remainingMinutes?: number } {
  const normEmail = email.toLowerCase().trim();
  const status = loginAttemptsMap.get(normEmail);
  if (!status) return { locked: false };

  if (status.lockedUntil) {
    const now = Date.now();
    if (now < status.lockedUntil) {
      const remainingMinutes = Math.ceil((status.lockedUntil - now) / 60000);
      return { locked: true, remainingMinutes };
    } else {
      // Lockout expired, reset
      loginAttemptsMap.delete(normEmail);
      return { locked: false };
    }
  }
  return { locked: false };
}

/**
 * Record a failed login attempt for rate limiting, persisting to Supabase login_attempts table.
 */
export async function recordFailedLogin(
  email: string,
  tenantId?: string
): Promise<{ locked: boolean; remainingAttempts: number }> {
  const normEmail = email.toLowerCase().trim();
  const current = loginAttemptsMap.get(normEmail) || { attempts: 0 };
  current.attempts += 1;

  let lockedUntilIso: string | null = null;
  if (current.attempts >= MAX_FAILED_ATTEMPTS) {
    current.lockedUntil = Date.now() + LOCKOUT_MS;
    lockedUntilIso = new Date(current.lockedUntil).toISOString();
  }
  loginAttemptsMap.set(normEmail, current);

  // Persist to Supabase login_attempts table
  try {
    await supabase.from('login_attempts').upsert({
      email: normEmail,
      attempts: current.attempts,
      locked_until: lockedUntilIso,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    // Gracefully handle persistence fallback
  }

  if (current.attempts >= MAX_FAILED_ATTEMPTS) {
    // Audit log the lockout event
    await recordAudit(
      'auth',
      normEmail,
      'LOGIN_LOCKOUT',
      { consecutive_failures: current.attempts },
      { status: 'locked', duration_minutes: 15, locked_until: lockedUntilIso },
      'system',
      'SUPER_ADMIN',
      tenantId || 'c0a80101-0000-0000-0000-000000000001'
    );

    return { locked: true, remainingAttempts: 0 };
  } else {
    return { locked: false, remainingAttempts: MAX_FAILED_ATTEMPTS - current.attempts };
  }
}

/**
 * Reset failed attempts on successful login asynchronously.
 */
export async function clearRateLimitAsync(email: string): Promise<void> {
  const normEmail = email.toLowerCase().trim();
  loginAttemptsMap.delete(normEmail);
  try {
    await supabase.from('login_attempts').delete().eq('email', normEmail);
  } catch (err) {
    // Ignore clear DB error
  }
}

/**
 * Reset failed attempts on successful login.
 */
export function clearRateLimit(email: string) {
  const normEmail = email.toLowerCase().trim();
  loginAttemptsMap.delete(normEmail);
  clearRateLimitAsync(normEmail).catch(() => {});
}

/**
 * Public Self-Registration:
 * 1. Creates Supabase Auth User (trigger sets profile to DRIVER + NULL tenant)
 * 2. Calls register_new_tenant() SECURITY DEFINER to:
 *    - Create company, tenant (fresh server-side UUID), subscription
 *    - Promote profile to TENANT_ADMIN for the new tenant
 * The client CANNOT influence tenant_id or role — those are set server-side.
 */
export async function registerPublicCompany(payload: {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
  region?: string;
}): Promise<{ user: UserProfile; company: Company; subscription: Subscription }> {
  const passCheck = validatePasswordPolicy(payload.password);
  if (!passCheck.valid) {
    throw new Error(passCheck.error);
  }

  // Step 1: Create the Supabase Auth user.
  // The trigger handle_new_user() creates profiles(role='DRIVER', tenant_id=NULL).
  // We pass ONLY display metadata (full_name, company_name) — NEVER role or tenant_id.
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        full_name:    payload.fullName,
        company_name: payload.companyName,
        // SECURITY: Do NOT pass role or tenant_id here.
        // The SECURITY DEFINER function sets them server-side.
      },
    },
  });

  if (authError) {
    throw new Error(`Registration failed: ${authError.message}`);
  }

  const authUserId = authData.user?.id;
  if (!authUserId) {
    throw new Error('Registration failed: no auth user ID returned.');
  }

  // Step 2: Call the SECURITY DEFINER function to provision company, tenant, subscription.
  // All UUIDs are generated server-side. Client cannot supply or influence them.
  const { data: rpcData, error: rpcError } = await supabase.rpc('register_new_tenant', {
    p_company_name: payload.companyName,
    p_full_name:    payload.fullName,
    p_email:        payload.email,
    p_region:       payload.region || 'North Africa',
  });

  if (rpcError) {
    throw new Error(`Workspace provisioning failed: ${rpcError.message}`);
  }

  const tenantId  = (rpcData as any)?.tenant_id  || '';
  const companyId = (rpcData as any)?.company_id || '';

  try {
    localStorage.setItem('nexttransit_active_tenant_id', tenantId);
  } catch (e) {}

  // Build return objects from server-confirmed values
  const company: Company = {
    id:         companyId,
    name:       payload.companyName,
    created_at: new Date().toISOString(),
  };

  const subscription: Subscription = {
    id:                  (rpcData as any)?.subscription_id || '',
    company_id:          companyId,
    plan:                'enterprise_trial',
    status:              'trial',
    current_period_end:  new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    created_at:          new Date().toISOString(),
  };

  const userProfile: UserProfile = {
    id:          authUserId,
    auth_user_id: authUserId,
    company_id:  companyId,
    tenant_id:   tenantId,
    full_name:   payload.fullName,
    email:       payload.email,
    role:        'TENANT_ADMIN',
    status:      'active',
    created_at:  new Date().toISOString(),
  };

  await recordAudit(
    'users',
    userProfile.id,
    'ACCOUNT_CREATE',
    {},
    { email: userProfile.email, role: 'TENANT_ADMIN', company_id: companyId, tenant_id: tenantId },
    userProfile.id,
    'TENANT_ADMIN',
    tenantId
  );

  return { user: userProfile, company, subscription };
}

/**
 * Login with rate limit check & Supabase Auth.
 */
export async function loginUser(email: string, password: string): Promise<{ profile: UserProfile; session: any }> {
  // Check rate limit lockout first
  const limit = checkRateLimit(email);
  if (limit.locked) {
    throw new Error(`Account temporarily locked due to 5 consecutive failed login attempts. Please try again in ${limit.remainingMinutes} minutes.`);
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    const rateCheck = await recordFailedLogin(email);
    if (rateCheck.locked) {
      throw new Error('5 consecutive failed login attempts. Account locked for 15 minutes.');
    }
    throw new Error(`Invalid credentials. ${rateCheck.remainingAttempts} attempts remaining before 15-minute lockout.`);
  }

  clearRateLimit(email);
  const authUserId = authData.user?.id;

  // Fetch profile from 'profiles' table or construct fallbacks
  let profile: UserProfile | null = null;
  if (authUserId) {
    try {
      const { data: dbProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUserId)
        .single();

      if (dbProfile) {
        profile = dbProfile as UserProfile;
      }
    } catch (e) {
      console.warn('Could not fetch profile from DB, building fallback profile', e);
    }
  }

  if (!profile) {
    // Fallback profile if user exists in auth but not yet in public.profiles.
    // SECURITY: Always assign minimal DRIVER role — NEVER TENANT_ADMIN — to prevent privilege escalation.
    // The user will need to complete onboarding to get their proper role from the DB.
    profile = {
      id: `usr-${authUserId || 'default'}`,
      auth_user_id: authUserId || 'auth-001',
      tenant_id: (authData.user?.user_metadata?.tenant_id as string) || '',
      company_id: (authData.user?.user_metadata?.company_id as string) || 'cmp-pending',
      full_name: (authData.user?.user_metadata?.full_name as string) || email.split('@')[0],
      email: email,
      role: 'DRIVER' as Role, // Minimal safe default — never SUPER_ADMIN
      status: 'pending' as const, // Closest valid status; onboarding redirect handles the rest
      created_at: new Date().toISOString(),
    };
  }

  // Non-null assertion: profile is guaranteed to be set at this point
  const resolvedProfile: UserProfile = profile!;

  if (resolvedProfile.status === 'disabled') {
    throw new Error('Your account has been disabled. Please contact your organization administrator.');
  }

  // SECURITY GUARD: Block dashboard access when tenant is not provisioned.
  // This happens if register_new_tenant() failed after signUp(), or for a fresh
  // account that hasn't completed provisioning.
  if (!resolvedProfile.tenant_id) {
    throw new Error('PROVISIONING_PENDING');
  }

  if (resolvedProfile.tenant_id) {
    try {
      localStorage.setItem('nexttransit_active_tenant_id', resolvedProfile.tenant_id);
    } catch (e) {}
  }

  // Log successful login
  await recordAudit(
    'users',
    resolvedProfile.id,
    'LOGIN_SUCCESS',
    {},
    { email: resolvedProfile.email, role: resolvedProfile.role },
    resolvedProfile.id,
    resolvedProfile.role,
    resolvedProfile.tenant_id
  );

  return { profile: resolvedProfile, session: authData.session };
}

/**
 * Logout user.
 */
export async function logoutUser(userProfile?: UserProfile | null) {
  try {
    localStorage.removeItem('nexttransit_active_tenant_id');
  } catch (e) {}
  if (userProfile) {
    await recordAudit(
      'users',
      userProfile.id,
      'LOGOUT',
      {},
      { email: userProfile.email },
      userProfile.id,
      userProfile.role,
      userProfile.tenant_id
    );
  }
  await supabase.auth.signOut();
}

/**
 * Send password reset request email.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    throw new Error(`Password reset failed: ${error.message}`);
  }

  await recordAudit(
    'auth',
    email,
    'PASSWORD_RESET_REQUEST',
    {},
    { email },
    'system',
    'SUPER_ADMIN',
    'c0a80101-0000-0000-0000-000000000001'
  );
}

/**
 * Update password after reset token validation.
 */
export async function updatePasswordWithToken(newPassword: string, userProfile?: UserProfile | null): Promise<void> {
  const passCheck = validatePasswordPolicy(newPassword);
  if (!passCheck.valid) {
    throw new Error(passCheck.error);
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    throw new Error(`Failed to update password: ${error.message}`);
  }

  if (userProfile) {
    await recordAudit(
      'users',
      userProfile.id,
      'PASSWORD_RESET',
      {},
      { email: userProfile.email },
      userProfile.id,
      userProfile.role,
      userProfile.tenant_id
    );
  }
}
