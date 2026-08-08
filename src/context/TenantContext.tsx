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
    }
  }, [userProfile]);

  const activeTenant = useMemo(
    () => tenantConfigs.find((t) => t.id === activeTenantId) || tenantConfigs[0],
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
