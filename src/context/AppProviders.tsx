import React, { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { TenantProvider } from './TenantContext';
import { FleetProvider } from './FleetContext';
import { LocalizationProvider } from './LocalizationContext';

export const AppProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <LocalizationProvider>
      <AuthProvider>
        <TenantProvider>
          <FleetProvider>
            {children}
          </FleetProvider>
        </TenantProvider>
      </AuthProvider>
    </LocalizationProvider>
  );
};
