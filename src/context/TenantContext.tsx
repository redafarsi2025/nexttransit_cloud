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
        };
        return [...prev, newConfig];
      });
    }
  }, [userProfile]);

  const activeTenant: TenantConfig = useMemo(
    (): TenantConfig =>
      tenantConfigs.find((t) => t.id === activeTenantId) || {
        id: activeTenantId,
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
