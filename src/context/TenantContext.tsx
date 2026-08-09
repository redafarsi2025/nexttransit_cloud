import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect, useCallback } from 'react';
import { TenantConfig } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

const DEMO_TENANT_ID = 'c0a80101-0000-0000-0000-000000000001';

const EMPTY_TENANT_CONFIG = (id: string): TenantConfig => ({
  id,
  societyName: 'Mon Espace de Travail',
  currency: 'DZD (DA)',
  currencySymbol: 'DA',
  allocatedBudget: 0,
  moneyUsed: 0,
  operatingRegion: 'North Africa',
  defaultLanguage: 'fr',
  defaultLaborRate: 2500,
  primaryColor: '#4f46e5',
  accentColor: '#059669',
  lastUpdated: new Date().toISOString(),
});

interface TenantContextType {
  tenantConfigs: TenantConfig[];
  activeTenantId: string;
  activeTenant: TenantConfig;
  isTenantResolved: boolean; // true once userProfile has been loaded (or no auth)
  updateTenantConfig: (id: string, updated: Partial<TenantConfig>) => void;
  setActiveTenantId: (id: string) => void;
  addTenantConfig: (newTenant: Omit<TenantConfig, 'id' | 'lastUpdated'>) => string;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userProfile, currentUser } = useAuth();

  const [tenantConfigs, setTenantConfigs] = useState<TenantConfig[]>([]);
  const [activeTenantId, setActiveTenantIdState] = useState<string>(DEMO_TENANT_ID);
  // isTenantResolved: becomes true once we know the real tenant (user logged in) or that no user is logged in
  const [isTenantResolved, setIsTenantResolved] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load tenant config from Supabase when user profile is available
  useEffect(() => {
    // currentUser===null AND userProfile===null means AuthContext has checked and there is no session
    // We can resolve to demo mode only when we are sure no auth session exists.
    // When currentUser is null but session check hasn't finished yet, both will be null initially —
    // but AuthContext calls refreshUserSession on mount which sets currentUser. So we gate on currentUser.
    if (currentUser === null && userProfile === null) {
      // Not logged in — resolve as demo tenant immediately
      setIsTenantResolved(true);
      return;
    }

    const tenantId = userProfile?.tenant_id;
    // userProfile not yet loaded (currentUser set but profile still fetching)
    if (!tenantId) return;

    setActiveTenantIdState(tenantId);

    const loadTenantFromDb = async () => {
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', tenantId)
          .single();

        if (!error && data) {
          const config: TenantConfig = {
            id: data.id,
            societyName: data.society_name || data.name || userProfile.company_id || 'Mon Espace de Travail',
            currency: data.currency || 'DZD (DA)',
            currencySymbol: data.currency_symbol || 'DA',
            allocatedBudget: data.allocated_budget || 0,
            moneyUsed: data.money_used || 0,
            operatingRegion: data.operating_region || 'North Africa',
            defaultLanguage: (data.default_language as TenantConfig['defaultLanguage']) || 'fr',
            defaultLaborRate: data.default_labor_rate || 2500,
            primaryColor: data.primary_color || '#4f46e5',
            accentColor: data.accent_color || '#059669',
            lastUpdated: data.updated_at || new Date().toISOString(),
            timezone: data.timezone,
            contactEmail: data.contact_email,
            contactPhone: data.contact_phone,
            taxRegistrationId: data.tax_registration_id,
            fiscalYear: data.fiscal_year,
            emergencyApprovalThreshold: data.emergency_approval_threshold,
          };
          setTenantConfigs([config]);
        } else {
          // Supabase table doesn't have this tenant yet — use in-memory blank
          setTenantConfigs([EMPTY_TENANT_CONFIG(tenantId)]);
        }
      } catch {
        setTenantConfigs([EMPTY_TENANT_CONFIG(tenantId)]);
      } finally {
        setIsLoaded(true);
        setIsTenantResolved(true);
      }
    };

    loadTenantFromDb();
  }, [userProfile, currentUser]);

  const activeTenant: TenantConfig = useMemo(
    (): TenantConfig =>
      tenantConfigs.find((t) => t.id === activeTenantId) || EMPTY_TENANT_CONFIG(activeTenantId),
    [tenantConfigs, activeTenantId]
  );

  const updateTenantConfig = useCallback((id: string, updated: Partial<TenantConfig>) => {
    const updatedAt = new Date().toISOString();
    // 1. Immediately update local React state so UI reflects changes
    setTenantConfigs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updated, lastUpdated: updatedAt } : t))
    );

    // 2. Persist to Supabase tenants table
    supabase
      .from('tenants')
      .upsert({
        id,
        society_name: updated.societyName,
        currency: updated.currency,
        currency_symbol: updated.currencySymbol,
        allocated_budget: updated.allocatedBudget,
        money_used: updated.moneyUsed,
        operating_region: updated.operatingRegion,
        default_language: updated.defaultLanguage,
        default_labor_rate: updated.defaultLaborRate,
        primary_color: updated.primaryColor,
        accent_color: updated.accentColor,
        timezone: updated.timezone,
        contact_email: updated.contactEmail,
        contact_phone: updated.contactPhone,
        tax_registration_id: updated.taxRegistrationId,
        fiscal_year: updated.fiscalYear,
        emergency_approval_threshold: updated.emergencyApprovalThreshold,
        updated_at: updatedAt,
      }, { onConflict: 'id' })
      .then(({ error }) => {
        if (error) {
          console.warn('[TenantContext] Failed to persist tenant config to Supabase:', error.message);
        }
      });
  }, []);

  const setActiveTenantId = (id: string) => {
    setActiveTenantIdState(id);
  };

  const addTenantConfig = (newTenant: Omit<TenantConfig, 'id' | 'lastUpdated'>) => {
    const id = crypto.randomUUID();
    const newConfig: TenantConfig = {
      ...newTenant,
      id,
      lastUpdated: new Date().toISOString(),
    };
    setTenantConfigs((prev) => [...prev, newConfig]);
    return id;
  };

  const visibleTenantConfigs = useMemo(() => {
    if (!userProfile || userProfile.role === 'SUPER_ADMIN') {
      return tenantConfigs;
    }
    return tenantConfigs.filter((t) => t.id === activeTenantId);
  }, [tenantConfigs, userProfile, activeTenantId]);

  return (
    <TenantContext.Provider
      value={{
        tenantConfigs: visibleTenantConfigs,
        activeTenantId,
        activeTenant,
        isTenantResolved,
        updateTenantConfig,
        setActiveTenantId,
        addTenantConfig,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) throw new Error('useTenant must be used within a TenantProvider');
  return context;
};
