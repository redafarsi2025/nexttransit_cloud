import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Role, ScreenId, UserProfile, Subscription } from '../types';
import { screenToRouteMap, getRoleDefaultRoute } from '../routes/routeMap';
import { ensureTenantProvisioned } from '../services/authService';
import { DEMO_TENANT_ID } from '../config/demoAccount';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  subscription: Subscription | null;
  currentRole: Role;
  currentScreen: ScreenId;
  isRoleSelectorOpen: boolean;
  isPlatformAdmin: boolean;
  syncStatus: 'online' | 'offline' | 'syncing' | 'error';
  isDemoMode: boolean;
  exitDemoMode: () => Promise<void>;
  navigate: ((path: string) => void) | null;
  setNavigate: (fn: (path: string) => void) => void;
  refreshUserSession: () => Promise<void>;
  changeRole: (role: Role, preferredScreen?: ScreenId) => void;
  changeScreen: (screen: ScreenId, shouldNavigate?: boolean) => void;
  setIsRoleSelectorOpen: (open: boolean) => void;
  setSyncStatus: (status: 'online' | 'offline' | 'syncing' | 'error') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [currentRole, setCurrentRole] = useState<Role>('DIRECTOR');
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('LANDING_PAGE');
  const [isRoleSelectorOpen, setIsRoleSelectorOpen] = useState<boolean>(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'syncing' | 'error'>('online');
  // Demo mode is derived from the authenticated user's tenant, not a separate flag — the demo
  // "account" is a real Supabase Auth login (see src/config/demoAccount.ts), not a client-only
  // simulation, so there is nothing to toggle independently of who is actually logged in.
  const isDemoMode = userProfile?.tenant_id === DEMO_TENANT_ID;
  // navigateRef holds the react-router navigate function injected by AppLayout
  const navigateRef = useRef<((path: string) => void) | null>(null);

  const setNavigate = useCallback((fn: (path: string) => void) => {
    navigateRef.current = fn;
  }, []);

  const refreshUserSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
        
        // Fetch User Profile from public.profiles (single source of truth)
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          // Enrich with fields now on profiles table (full_name, email added in security migration)
          // Fall back to auth user metadata if profiles columns not yet populated
          const enrichedProfile: UserProfile = {
            ...profile,
            full_name: profile.full_name || session.user.user_metadata?.full_name || '',
            email:     profile.email     || session.user.email || '',
          } as UserProfile;

          setUserProfile(enrichedProfile);
          const role = (profile.role as Role) || 'DRIVER';
          setCurrentRole(role);
          
          // SECURITY GUARD: Do not navigate to dashboard when provisioning is incomplete.
          // We call ensureTenantProvisioned to assert state. If it returns anything
          // other than READY, the workspace is INCONSISTENT or NEEDS_PROVISIONING.
          const provStatus = await ensureTenantProvisioned(
            session.user.id,
            session.user.email,
            session.user.user_metadata
          );

          if (provStatus !== 'READY') {
            console.warn(`[AuthContext] Provisioning state is ${provStatus} — navigation blocked.`);
            return;
          }
          // ── STEP 1: Detect platform admin status BEFORE any navigation ──
          // NOTE (AGENTS.md §4/SuperAdminGuard): This client-side check is for UX only
          // (redirect + nav visibility). The real authorization barrier is requirePlatformAdmin
          // on the Express API. A bypass here will still yield 403 from the API.
          let isAdmin = false;
          try {
            const { data: pAdmin } = await supabase
              .from('platform_admins')
              .select('id')
              .eq('id', profile.id)
              .single();
            isAdmin = !!pAdmin;
            setIsPlatformAdmin(isAdmin);
          } catch (e) {
            setIsPlatformAdmin(false);
          }

          // ── STEP 2: Navigate based on platform admin status or role ──
          if (navigateRef.current && (window.location.pathname === '/' || window.location.pathname === '/dashboard')) {
            if (isAdmin) {
              // Platform admins always land on the platform admin panel
              navigateRef.current('/admin');
            } else if (profile.tenant_id && profile.tenant_id !== DEMO_TENANT_ID) {
              // Query tenant to check onboarding / workspace configuration status
              const { data: tenant } = await supabase
                .from('tenants')
                .select('onboarding_completed_at, is_configured')
                .eq('id', profile.tenant_id)
                .single();
              
              if (!tenant || (!tenant.onboarding_completed_at && !tenant.is_configured)) {
                // New production tenant — orient directly to workspace configuration screen
                navigateRef.current('/tenant-config');
                setCurrentScreen('TENANT_CONFIG');
              } else {
                const defaultRoute = getRoleDefaultRoute(role);
                navigateRef.current(defaultRoute);
              }
            } else {
              const defaultRoute = getRoleDefaultRoute(role);
              navigateRef.current(defaultRoute);
            }
          }
          
          // Fetch Company Subscription if available
          if (profile.tenant_id) {
            const { data: sub } = await supabase
              .from('subscriptions')
              .select('*')
              .eq('tenant_id', profile.tenant_id)
              .single();
            if (sub) {
              setSubscription(sub as Subscription);
            }
          }
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setSubscription(null);
        setIsPlatformAdmin(false);
      }
    } catch (e) {
      console.warn('Error refreshing user session:', e);
      setSyncStatus('error');
    }
  }, []);

  const changeRole = useCallback((role: Role, preferredScreen?: ScreenId) => {
    // SECURITY: Free role switching is only permitted in demo mode (unauthenticated presentation)
    // or when the current authenticated user is a platform admin.
    // Regular users may NOT escalate their role client-side.
    const canSwitch =
      isDemoMode ||
      !currentUser || // not authenticated yet
      isPlatformAdmin ||
      userProfile?.role === 'SUPER_ADMIN' ||
      userProfile?.role === 'TENANT_ADMIN' ||
      userProfile?.role === role; // switching to own role is always fine

    if (!canSwitch) {
      console.warn(`[AuthContext] Role switch from ${userProfile?.role} to ${role} blocked — unauthorized escalation attempt.`);
      return;
    }
    setCurrentRole(role);
    if (preferredScreen) {
      setCurrentScreen(preferredScreen);
    }
  }, [isDemoMode, currentUser, userProfile]);

  const changeScreen = useCallback((screen: ScreenId, shouldNavigate: boolean = true) => {
    setCurrentScreen(screen);
    if (shouldNavigate && navigateRef.current) {
      const route = screenToRouteMap[screen];
      if (route) {
        navigateRef.current(route);
      }
    }
  }, []);

  useEffect(() => {
    refreshUserSession();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      refreshUserSession();
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [refreshUserSession]);


  const exitDemoMode = useCallback(async () => {
    await supabase.auth.signOut();
    if (navigateRef.current) {
      navigateRef.current('/');
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        subscription,
        currentRole,
        currentScreen,
        isRoleSelectorOpen,
        isPlatformAdmin,
        syncStatus,
        isDemoMode,
        exitDemoMode,
        navigate: navigateRef.current,
        setNavigate,
        refreshUserSession,
        changeRole,
        changeScreen,
        setIsRoleSelectorOpen,
        setSyncStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
