import React from 'react';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { Role } from '../../types';

import { getRoleDefaultRoute } from '../../routes/routeMap';

export const ForbiddenScreen: React.FC = () => {
  const { currentRole, userProfile } = useAuth();
  const { activeTenant } = useTenant();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as { from?: string; screenId?: string; reason?: 'role' | 'module' } | null;
  const isModuleRestriction = state?.reason === 'module';

  const handleReturnHome = () => {
    const defaultRoute = getRoleDefaultRoute(currentRole);
    navigate(defaultRoute);
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-12">
      <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 mb-6 shadow-sm">
        {isModuleRestriction ? <Lock className="w-10 h-10" /> : <ShieldAlert className="w-10 h-10" />}
      </div>

      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
        403 — {isModuleRestriction ? 'Module non souscrit' : 'Accès Refusé (RBAC)'}
      </h1>
      <p className="text-base text-slate-600 max-w-md mb-6">
        {isModuleRestriction
          ? `Le module "${state?.screenId}" n'est pas activé dans le plan de votre tenant workspace (${activeTenant?.societyName}).`
          : `Votre rôle actuel (${currentRole}) ne dispose pas des permissions nécessaires pour accéder à cet écran ou module opérationnel.`}
      </p>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-8 text-left text-xs space-y-2 text-slate-600 w-full max-w-md">
        <div className="flex justify-between">
          <span className="font-medium text-slate-700">Utilisateur:</span>
          <span>{userProfile?.full_name || 'Utilisateur Authentifié'}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium text-slate-700">Rôle Actif:</span>
          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold">{currentRole}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium text-slate-700">Tenant Workspace:</span>
          <span className="font-bold text-slate-800">{activeTenant?.societyName || 'NextTransit Tenant'}</span>
        </div>
        {state?.from && (
          <div className="flex justify-between border-t border-slate-200 pt-2">
            <span className="font-medium text-slate-700">URL Demandée:</span>
            <span className="font-mono text-amber-700">{state.from}</span>
          </div>
        )}
      </div>

      <button
        onClick={handleReturnHome}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour à mon Tableau de Bord
      </button>
    </div>
  );
};
