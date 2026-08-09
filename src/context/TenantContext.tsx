import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { TenantConfig } from '../types';
import { INITIAL_TENANT_CONFIGS } from '../data/seedData';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface TenantContextType {
  tenantConfigs: TenantConfig[];
  activeTenantId: string;
  activeTenant: TenantConfig;
  updateTenantConfig: (id: string, updated: Partial<TenantConfig>) => void;
  setActiveTenantId: (id: string) => void;
  addTenantConfig: (newTenant: Omit<TenantConfig, 'id' | 'lastUpdated'>) => string;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userProfile } = useAuth();
  
  // Local state for demo purposes. In production, this would sync with public.tenants
  const [tenantConfigs, setTenantConfigs] = useState<TenantConfig[]>(INITIAL_TENANT_CONFIGS);
  
  // Initialize with seed or from authenticated profile
  const [activeTenantId, setActiveTenantIdState] = useState<string>(
    INITIAL_TENANT_CONFIGS[0].id
  );

  useEffect(() => {
    if (userProfile?.tenant_id) {
      setActiveTenantIdState(userProfile.tenant_id);

      setTenantConfigs((prev) => {
        const exists = prev.some((t) => t.id === userProfile.tenant_id);
        if (exists) return prev;

        const newConfig: TenantConfig = {
          id: userProfile.tenant_id,
          societyName: userProfile.company_id || 'Mon Espace de Travail',
          operatingRegion: 'North Africa',
          currency: 'DZD',
          laborRatePerHour: 2500,
          scfTaxRate: 19,
          language: 'fr',
          lastUpdated: new Date().toISOString(),
          brandColorHex: '#4f46e5',
          accentColorHex: '#059669',
          onboardingCompleted: false,
        };
        return [...prev, newConfig];
      });
    }
  }, [userProfile]);

  const activeTenant = useMemo(
    () => tenantConfigs.find((t) => t.id === activeTenantId) || {
      id: activeTenantId,
      societyName: 'Mon Espace de Travail',
      operatingRegion: 'North Africa',
      currency: 'DZD',
      laborRatePerHour: 2500,
      scfTaxRate: 19,
      language: 'fr',
      lastUpdated: new Date().toISOString(),
      brandColorHex: '#4f46e5',
      accentColorHex: '#059669',
      onboardingCompleted: false,
    },
    [tenantConfigs, activeTenantId]
  );

  const updateTenantConfig = (id: string, updated: Partial<TenantConfig>) => {
    setTenantConfigs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updated, lastUpdated: new Date().toISOString() } : t))
    );
  };

  const setActiveTenantId = (id: string) => {
    setActiveTenantIdState(id);
  };

  const addTenantConfig = (newTenant: Omit<TenantConfig, 'id' | 'lastUpdated'>) => {
    const id = `TNT-${Date.now()}`;
    const newConfig: TenantConfig = {
      ...newTenant,
      id,
      lastUpdated: new Date().toISOString(),
    };
    setTenantConfigs((prev) => [...prev, newConfig]);
    return id;
  };

  return (
    <TenantContext.Provider
      value={{
        tenantConfigs,
        activeTenantId,
        activeTenant,
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
