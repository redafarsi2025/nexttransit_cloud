import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const SuperAdminGuard: React.FC = () => {
  const { currentRole, currentUser } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }
  
  if (currentRole !== 'SUPER_ADMIN') {
    // Redirect non-super-admins to their default role dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
