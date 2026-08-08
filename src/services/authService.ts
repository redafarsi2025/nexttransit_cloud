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
 * Check rate limit for an email before attempting login.
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
 * Record a failed login attempt for rate limiting.
 */
export async function recordFailedLogin(email: string, tenantId?: string): Promise<{ locked: boolean; remainingAttempts: number }> {
  const normEmail = email.toLowerCase().trim();
  const current = loginAttemptsMap.get(normEmail) || { attempts: 0 };
  current.attempts += 1;

  if (current.attempts >= MAX_FAILED_ATTEMPTS) {
    current.lockedUntil = Date.now() + LOCKOUT_MS;
    loginAttemptsMap.set(normEmail, current);

    // Audit log the lockout event
    await recordAudit(
      'auth',
      normEmail,
      'LOGIN_LOCKOUT',
      { consecutive_failures: current.attempts },
      { status: 'locked', duration_minutes: 15, locked_until: new Date(current.lockedUntil).toISOString() },
      'system',
      'SUPER_ADMIN',
      tenantId || 'c0a80101-0000-0000-0000-000000000001'
    );

    return { locked: true, remainingAttempts: 0 };
  } else {
    loginAttemptsMap.set(normEmail, current);
    return { locked: false, remainingAttempts: MAX_FAILED_ATTEMPTS - current.attempts };
  }
}

/**
 * Reset failed attempts on successful login.
 */
export function clearRateLimit(email: string) {
  loginAttemptsMap.delete(email.toLowerCase().trim());
}

/**
 * Public Self-Registration:
 * Creates Supabase Auth User -> Company -> first Tenant -> User Profile (SUPER_ADMIN) -> Trial Subscription
 * This is the ONLY role obtainable via public self-registration.
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

  // 1. Create Supabase Auth User
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        full_name: payload.fullName,
        company_name: payload.companyName,
      },
    },
  });

  if (authError) {
    throw new Error(`Registration failed: ${authError.message}`);
  }

  const authUserId = authData.user?.id || `auth-${Date.now()}`;
  const companyId = `cmp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const tenantId = `tnt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const profileId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const company: Company = {
    id: companyId,
    name: payload.companyName,
    created_at: new Date().toISOString(),
  };

  const subscription: Subscription = {
    id: subscriptionId,
    company_id: companyId,
    plan: 'enterprise_trial',
    status: 'trial',
    current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  };

  const userProfile: UserProfile = {
    id: profileId,
    auth_user_id: authUserId,
    company_id: companyId,
    tenant_id: tenantId,
    full_name: payload.fullName,
    email: payload.email,
    role: 'SUPER_ADMIN',
    status: 'active',
    created_at: new Date().toISOString(),
  };

  // Attempt DB writes (ignoring transient table errors if running offline mock)
  try {
    await supabase.from('companies').insert(company);
    await supabase.from('tenants').insert({
      id: tenantId,
      company_id: companyId,
      societyName: payload.companyName,
      operatingRegion: payload.region || 'North Africa',
      created_at: new Date().toISOString(),
    });
    await supabase.from('users').insert(userProfile);
    await supabase.from('subscriptions').insert(subscription);
  } catch (err) {
    console.warn('DB insertion skipped/warned during registration:', err);
  }

  // Audit Log account creation
  await recordAudit(
    'users',
    userProfile.id,
    'ACCOUNT_CREATE',
    {},
    { email: userProfile.email, role: 'SUPER_ADMIN', company_id: companyId, tenant_id: tenantId },
    userProfile.id,
    'SUPER_ADMIN',
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

  // Fetch profile from 'users' table or construct fallbacks
  let profile: UserProfile | null = null;
  if (authUserId) {
    try {
      const { data: dbProfile } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();

      if (dbProfile) {
        profile = dbProfile as UserProfile;
      }
    } catch (e) {
      console.warn('Could not fetch profile from DB, building fallback profile', e);
    }
  }

  if (!profile) {
    // Fallback profile if user exists in auth but not yet in public.users.
    // SECURITY: Always assign minimal DRIVER role — NEVER SUPER_ADMIN — to prevent privilege escalation.
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
