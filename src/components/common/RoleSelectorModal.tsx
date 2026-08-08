import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocalization } from '../../context/LocalizationContext';
import { ROLES_CONFIG } from '../../data/seedData';
import { Role } from '../../types';
import {
  ShieldCheck,
  TrendingUp,
  Wrench,
  Package,
  Activity,
  UserCheck,
  Truck,
  CheckCircle2,
  X,
} from 'lucide-react';

interface RoleSelectorModalProps {
  onClose?: () => void;
}

export const RoleSelectorModal: React.FC<RoleSelectorModalProps> = ({ onClose }) => {
  const { currentRole, changeRole, setIsRoleSelectorOpen } = useAuth();
  const { t } = useLocalization();

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
        return CheckCircle2;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-6 text-white flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-2 border border-indigo-400/30">
              NextTransit Fleet Decision Platform
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              {t('modal.role_selector', {}, 'Select Your Role & Access View')}
            </h2>
            <p className="mt-1 text-sm text-slate-300 max-w-2xl">
              NextTransit operates with 7 role-based views sharing one mathematically verified data model.
              Choose a role below to explore customized navigation and RBAC permissions.
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
              title="Close modal"
            >
              <X className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* 7 Clickable Cards Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {ROLES_CONFIG.map((roleInfo) => {
              const Icon = getRoleIcon(roleInfo.id);
              const isSelected = currentRole === roleInfo.id;

              return (
                <button
                  key={roleInfo.id}
                  onClick={() => {
                    changeRole(roleInfo.id);
                    if (onClose) onClose();
                  }}
                  className={`group relative flex flex-col justify-between rounded-xl border p-5 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:bg-slate-50/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`rounded-lg p-2.5 ${roleInfo.badgeColor} shadow-xs`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800 border border-indigo-200">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {t('modal.active_role', {}, 'Active')}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {roleInfo.name}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                      {roleInfo.title}
                    </p>
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {roleInfo.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-indigo-600">
                    <span>{t('modal.enter_as', {}, 'Enter as')} {roleInfo.name}</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* RBAC Overview Footer Notice */}
          <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-600">
              <strong className="text-slate-900">RBAC Verified Data Model:</strong> Every KPI and variance drill-down uses the same underlying records. The left sidebar adapts automatically to role permissions (e.g., Strategic Dashboard full for Director; Conflict Alerts resolve for Fleet Manager).
            </div>
            <button
              onClick={() => setIsRoleSelectorOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
            >
              {t('modal.continue_role', {}, 'Continue with Current Role')} ({ROLES_CONFIG.find((r) => r.id === currentRole)?.name})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

