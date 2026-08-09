import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Role, ScreenId, UserProfile, Subscription } from '../types';
import { screenToRouteMap, getRoleDefaultRoute } from '../routes/routeMap';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  subscription: Subscription | null;
  currentRole: Role;
  currentScreen: ScreenId;
  isRoleSelectorOpen: boolean;
  syncStatus: 'online' | 'offline' | 'syncing' | 'error';
  isDemoMode: boolean;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
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
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'syncing' | 'error'>('online');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
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
        
        // Fetch User Profile from public.profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setUserProfile(profile as UserProfile);
          const role = (profile.role as Role) || 'DRIVER';
          setCurrentRole(role);
          
          // Check if onboarding is complete, redirect accordingly
          if (navigateRef.current && (window.location.pathname === '/' || window.location.pathname === '/dashboard')) {
            if (profile.tenant_id && profile.tenant_id !== 'c0a80101-0000-0000-0000-000000000001') {
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
      }
    } catch (e) {
      console.warn('Error refreshing user session:', e);
      setSyncStatus('error');
    }
  }, []);

  const changeRole = useCallback((role: Role, preferredScreen?: ScreenId) => {
    // SECURITY: Free role switching is only permitted in demo mode (unauthenticated presentation)
    // or when the current authenticated user is a SUPER_ADMIN (platform operator).
    // Regular users may NOT escalate their role client-side.
    const canSwitch =
      isDemoMode ||
      !currentUser || // not authenticated yet
      userProfile?.role === 'SUPER_ADMIN' ||
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


  const enterDemoMode = useCallback(() => {
    setIsDemoMode(true);
    setCurrentRole('DIRECTOR');
    if (navigateRef.current) {
      navigateRef.current('/dashboard');
    }
  }, []);

  const exitDemoMode = useCallback(() => {
    setIsDemoMode(false);
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
        syncStatus,
        isDemoMode,
        enterDemoMode,
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
