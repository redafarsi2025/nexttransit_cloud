import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const SuperAdminGuard: React.FC = () => {
  const { isPlatformAdmin, currentUser } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }
  
  if (!isPlatformAdmin) {
    // Redirect non-platform-admins to their default role dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
