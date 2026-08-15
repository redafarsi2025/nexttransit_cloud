import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * SuperAdminGuard — UI-ONLY routing guard.
 *
 * PURPOSE (UX): Prevents non-platform-admins from navigating to the /admin routes
 * in the browser, providing a clean redirect to /dashboard.
 *
 * SECURITY NOTE (CRITICAL — AGENTS.md Section 6):
 * This guard is NOT a security boundary. It relies on `isPlatformAdmin`, which is
 * a client-side flag derived from a Supabase RLS-protected query in AuthContext.
 * Real authorization for all privileged operations is enforced server-side by the
 * `requirePlatformAdmin` middleware in `src/api/platformAdmin.ts`.
 *
 * Any component inside this guard MUST use `adminApiService` (which calls the Express API)
 * and MUST NOT perform privileged Supabase queries directly from React.
 *
 * A malicious user bypassing this guard will receive 401/403 from the API.
 * The guard does NOT need to be the last line of defense.
 */
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
