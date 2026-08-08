import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { RBAC_MATRIX } from '../../data/seedData';
import { ScreenId } from '../../types';

interface ProtectedRouteProps {
  screenId: ScreenId;
  children: React.ReactElement;
  requiredModule?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  screenId,
  children,
  requiredModule,
}) => {
  const { currentRole } = useAuth();
  const { activeTenant } = useTenant();
  const location = useLocation();

  // 1. Role Guard (RBAC Check)
  const rolePermissions = RBAC_MATRIX[screenId];
  const userPermission = rolePermissions ? rolePermissions[currentRole] : 'none';

  if (userPermission === 'none') {
    return (
      <Navigate
        to="/forbidden"
        state={{ from: location.pathname, screenId, reason: 'role', currentRole }}
        replace
      />
    );
  }

  // 2. Module / Subscription Guard Check
  if (activeTenant?.enabled_modules && activeTenant.enabled_modules.length > 0) {
    const targetModule = requiredModule || screenId;
    if (!activeTenant.enabled_modules.includes(targetModule)) {
      return (
        <Navigate
          to="/forbidden"
          state={{ from: location.pathname, screenId, reason: 'module', currentRole }}
          replace
        />
      );
    }
  }

  return children;
};
