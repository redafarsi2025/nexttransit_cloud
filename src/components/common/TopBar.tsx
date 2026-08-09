import React, { useState } from 'react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useLocalization } from '../../context/LocalizationContext';
import { ROLES_CONFIG } from '../../data/seedData';
import { Role } from '../../types';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../context/TenantContext';
import {
  Bell,
  ChevronDown,
  Sparkles,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  Wrench,
  Package,
  Activity,
  UserCheck,
  Truck,
  Users,
  KeyRound,
  LogIn,
  LogOut,
  Wifi,
  WifiOff,
  AlertCircle,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { AlertFeedModal } from './AlertFeedModal';
import { GoldenPathModal } from './GoldenPathModal';
import { RoleSelectorModal } from './RoleSelectorModal';
import { AuthModal } from './AuthModal';
import { LanguageSelector } from '../localization/LanguageSelector';

export const TopBar: React.FC = () => {
  const { alerts, resetSeedData } = useFleet();
  const { activeTenant } = useTenant();
  const { currentRole, changeRole, isRoleSelectorOpen, setIsRoleSelectorOpen, currentUser, syncStatus } = useAuth();
  const { t } = useLocalization();
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showGoldenPathModal, setShowGoldenPathModal] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const activeRoleInfo = ROLES_CONFIG.find((r) => r.id === currentRole) || ROLES_CONFIG[0];
  const unreadAlertsCount = alerts.filter((a) => !a.read).length;

  const getRoleIcon = (roleId: Role) => {
    switch (roleId) {
      case 'SUPER_ADMIN':
        return ShieldCheck;
      case 'DIRECTOR':
        return TrendingUp;
      case 'FLEET_MANAGER':
        return UserCheck;
      case 'MAINTENANCE_MANAGER':
        return Activity;
      case 'FINANCE':
        return ShieldCheck;
      case 'OPERATIONS':
        return Package;
      case 'MECHANIC':
        return Wrench;
      case 'DRIVER':
        return Truck;
      default:
        return Users;
    }
  };

  const Icon = getRoleIcon(activeRoleInfo.id);

  const [impersonationActive, setImpersonationActive] = useState(() => localStorage.getItem('nexttransit_impersonation_active') === 'true');

  const handleEndImpersonation = () => {
    localStorage.removeItem('nexttransit_impersonation_active');
    localStorage.removeItem('nexttransit_impersonated_tenant_id');
    setImpersonationActive(false);
    window.location.reload();
  };

  return (
    <>
      {impersonationActive && (
        <div id="impersonation-banner" className="bg-amber-600 text-white text-center py-2 px-4 text-xs font-semibold flex items-center justify-center gap-2 z-50 relative animate-pulse">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-100" />
          <span>Support session — administrateur plateforme connecté (Mode Support SaaS)</span>
          <button onClick={handleEndImpersonation} className="underline ml-3 hover:text-amber-100 font-bold bg-amber-700/50 px-2 py-0.5 rounded transition">
            Quitter la session
          </button>
        </div>
      )}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 lg:px-6 backdrop-blur-md">
        {/* Left: Brand & Demo Scenarios */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white font-bold text-base shadow-sm">
              NX
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900">
                NextTransit
              </span>
              <span className="ml-2 hidden sm:inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
                {t('topbar.subtitle', {}, '7 Role-Based Views • 1 Shared Model')}
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowGoldenPathModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer"
            title="Open Interactive Demo Scenarios (Golden Path A & B)"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden md:inline">{t('topbar.demo_scenarios', {}, 'Demo Scenarios (Golden Path A/B)')}</span>
            <span className="md:hidden">Scenarios</span>
          </button>
        </div>

        {/* Right: User Status, Read-Only Role Badge, Language Selector, Alerts, Auth */}
        <div className="flex items-center gap-3">
          {/* Sync Status */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${
              syncStatus === 'online'
                ? 'bg-green-50 border-green-200 text-green-700'
                : syncStatus === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : syncStatus === 'syncing'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
            title={`Sync Status: ${syncStatus.toUpperCase()}`}
          >
            {syncStatus === 'online' && <Wifi className="w-3.5 h-3.5" />}
            {syncStatus === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
            {syncStatus === 'offline' && <WifiOff className="w-3.5 h-3.5" />}
            {syncStatus === 'syncing' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span className="capitalize">{syncStatus}</span>
          </div>

          {/* Language Selector */}
          <LanguageSelector />

          {/* Active Workspace / Company Badge */}
          <div className="hidden lg:flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 shadow-xs text-xs font-bold text-indigo-900">
            <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="truncate max-w-[160px]">{activeTenant.societyName}</span>
          </div>

          {/* Read-Only Role Badge */}
          <div
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 pr-3 shadow-xs select-none"
            title={`Active Role: ${activeRoleInfo.name} (${activeRoleInfo.id}) — Read Only`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-white font-bold text-xs ${activeRoleInfo.badgeColor}`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-bold text-slate-900 leading-none">
                {activeRoleInfo.name}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                Active Role
              </div>
            </div>
          </div>

          {/* Alert count button */}
          <button
            onClick={() => setShowAlertModal(true)}
            className="relative inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
            title="View Active Rule Alerts (R1-R7)"
          >
            <Bell className="h-5 w-5" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-xs">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          {/* Auth Button / User Session */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <span
                className="hidden lg:inline text-xs font-medium text-slate-700 font-mono bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 max-w-[150px] truncate"
                title={currentUser.email}
              >
                {currentUser.email}
              </span>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition cursor-pointer"
                title={t('topbar.logout', {}, 'Déconnexion de la session')}
              >
                <LogOut className="h-3.5 w-3.5 text-red-600" />
                <span>{t('topbar.logout_label', {}, 'Déconnexion')}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition cursor-pointer shadow-xs"
              title={t('topbar.login', {}, 'Connexion / Création de compte')}
            >
              <LogIn className="h-3.5 w-3.5 text-white" />
              <span>{t('topbar.login_label', {}, 'Sign In / Register')}</span>
            </button>
          )}
        </div>
      </header>

      {/* Modals */}
      {showAlertModal && <AlertFeedModal onClose={() => setShowAlertModal(false)} />}
      {showGoldenPathModal && (
        <GoldenPathModal onClose={() => setShowGoldenPathModal(false)} />
      )}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </>
  );
};
