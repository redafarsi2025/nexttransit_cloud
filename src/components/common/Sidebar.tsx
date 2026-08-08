import React from 'react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useLocalization } from '../../context/LocalizationContext';
import { RBAC_MATRIX, ROLES_CONFIG } from '../../data/seedData';
import { ScreenId, PermissionLevel } from '../../types';
import {
  TrendingUp,
  BarChart3,
  Activity,
  Package,
  Wrench,
  AlertTriangle,
  Calculator,
  FileText,
  Truck,
  Smartphone,
  ShieldAlert,
  ShieldCheck,
  Building2,
  Globe,
  Fuel,
  Sparkles,
  Radio,
  Mail,
  CreditCard,
  Calendar,
  ShoppingCart,
  Code2,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { alerts } = useFleet();
  const { currentRole, currentScreen, changeScreen } = useAuth();
  const { t } = useLocalization();

  const activeRoleInfo = ROLES_CONFIG.find((r) => r.id === currentRole);

  const screenConfigs: {
    id: ScreenId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    badgeCount?: number;
  }[] = [
    {
      id: 'STRATEGIC_DASHBOARD',
      label: t('nav.strategic_dashboard', {}, 'Strategic Dashboard'),
      icon: TrendingUp,
      description: t('nav.strategic_desc', {}, 'Director KPI cards & fleet availability'),
    },
    {
      id: 'VARIANCE_DASHBOARD',
      label: t('nav.variance_dashboard', {}, 'Variance & Budget'),
      icon: BarChart3,
      description: t('nav.variance_desc', {}, 'Drill-down: fleet → category → vehicle → WO'),
    },
    {
      id: 'FLEET_HEALTH_GRID',
      label: t('nav.fleet_health_grid', {}, 'Fleet Health Grid'),
      icon: Activity,
      description: t('nav.fleet_health_desc', {}, 'Status filter counts & diagnostic snapshots'),
    },
    {
      id: 'INVENTORY_DASHBOARD',
      label: t('nav.inventory_dashboard', {}, 'Inventory Dashboard'),
      icon: Package,
      description: t('nav.inventory_desc', {}, 'Stock values & R3 projected shortfalls'),
    },
    {
      id: 'WORK_ORDER_QUEUE',
      label: t('nav.work_order_queue', {}, 'Work Order Queue'),
      icon: Wrench,
      description: t('nav.work_order_desc', {}, 'Create & approve maintenance interventions'),
    },
    {
      id: 'PM_SCHEDULES',
      label: 'PM Schedules (Phase 3)',
      icon: Calendar,
      description: 'Maintenance préventive par km, heures & jours',
    },
    {
      id: 'EDI_SUPPLIERS',
      label: 'EDI & Grossistes (Phase 3)',
      icon: ShoppingCart,
      description: 'Approvisionnement auto EDI & catalogues Bosch/Valeo',
    },
    {
      id: 'CONFLICT_ALERTS',
      label: t('nav.conflict_alerts', {}, 'Conflict Alerts (R2/R4)'),
      icon: AlertTriangle,
      description: t('nav.conflict_desc', {}, 'Critical vehicles scheduled for use'),
      badgeCount: alerts.filter((a) => a.rule_id === 'R4' && !a.read).length,
    },
    {
      id: 'CAE_BUDGET_PRIORITIZATION',
      label: t('nav.cae_prioritization', {}, 'CAE Prioritization'),
      icon: Calculator,
      description: t('nav.cae_desc', {}, 'Ranked repair vs. statistical deferral cost'),
    },
    {
      id: 'INCIDENT_REPORTS',
      label: t('nav.incident_reports', {}, 'Incident Investigation (R6)'),
      icon: FileText,
      description: t('nav.incident_desc', {}, 'R6 driver reports & OBD fault linkage'),
    },
    {
      id: 'SAFETY_PERFORMANCE',
      label: t('nav.safety_performance', {}, 'Safety Performance'),
      icon: ShieldAlert,
      description: t('nav.safety_desc', {}, 'Harsh braking, acceleration & driver safety scores'),
    },
    {
      id: 'FUEL_LOGS',
      label: t('nav.fuel_logs', {}, 'Fuel & Consumption'),
      icon: Fuel,
      description: t('nav.fuel_desc', {}, 'Log fuel, consumption L/100km & R7 anomaly detection'),
      badgeCount: alerts.filter((a) => a.rule_id === 'R7' && !a.read).length,
    },
    {
      id: 'TELEMETRY_STREAM',
      label: t('nav.telemetry_stream', {}, 'Live Telemetry Stream'),
      icon: Radio,
      description: t('nav.telemetry_desc', {}, 'Real-time GPS coords, OBD faults & adapter statuses'),
    },
    {
      id: 'AUDIT_LOG',
      label: t('nav.audit_log', {}, 'Immutable Audit Trail'),
      icon: ShieldCheck,
      description: t('nav.audit_desc', {}, 'Append-only audit ledger for mutations, work orders, rule overrides & CAE decisions'),
    },
    {
      id: 'MECHANIC_MOBILE_QUEUE',
      label: t('nav.mechanic_mobile_queue', {}, 'Mechanic Task Queue'),
      icon: Smartphone,
      description: t('nav.mechanic_desc', {}, 'Mobile task execution & OBD fault scan'),
    },
    {
      id: 'DRIVER_MOBILE_VIEW',
      label: t('nav.driver_mobile_view', {}, 'Driver Mobile View'),
      icon: Truck,
      description: t('nav.driver_desc', {}, 'Status indicator & instant issue report'),
    },
    {
      id: 'TENANT_CONFIG',
      label: t('nav.tenant_config', {}, 'Tenant & Society Config'),
      icon: Building2,
      description: t('nav.tenant_desc', {}, 'Society name, budget & money used settings'),
    },
    {
      id: 'TRANSLATION_CENTER',
      label: t('nav.translation_center', {}, 'Translation Center'),
      icon: Globe,
      description: t('nav.translation_desc', {}, 'Enterprise localization, Gemini AI & RTL'),
    },
    {
      id: 'INVITATIONS',
      label: 'User Invitations',
      icon: Mail,
      description: 'Invite users & assign RBAC roles',
    },
    {
      id: 'BILLING',
      label: 'Billing & SaaS Plan',
      icon: CreditCard,
      description: 'Subscription status & company billing',
    },
    {
      id: 'API_DOCS',
      label: 'Documentation OpenAPI',
      icon: Code2,
      description: 'Spécification Swagger REST & endpoints Supabase',
    },
  ];

  const renderPermissionBadge = (perm: PermissionLevel) => {
    switch (perm) {
      case 'full':
        return (
          <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-indigo-800">
            Full
          </span>
        );
      case 'view':
        return (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-600">
            View
          </span>
        );
      case 'resolve':
        return (
          <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-purple-800">
            Resolve
          </span>
        );
      case 'parts_status':
        return (
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
            Parts
          </span>
        );
      case 'assigned_only':
        return (
          <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-orange-800">
            Assigned
          </span>
        );
      case 'submit':
        return (
          <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-teal-800">
            Submit
          </span>
        );
      default:
        return null;
    }
  };

  // Filter screens based on RBAC matrix for currentRole
  const availableScreens = screenConfigs.filter((s) => {
    const perm = RBAC_MATRIX[s.id][currentRole];
    return perm !== 'none';
  });

  return (
    <aside className="w-64 border-r border-slate-200 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Role Profile Info */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg text-white font-bold text-sm shadow-sm ${
              activeRoleInfo?.badgeColor || 'bg-indigo-600'
            }`}
          >
            {activeRoleInfo?.avatar || 'NX'}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-bold text-white truncate">
              {activeRoleInfo?.name}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {activeRoleInfo?.title}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 bg-slate-900 px-2.5 py-1.5 rounded-md border border-slate-800">
          <span>RBAC Views Allowed:</span>
          <span className="font-bold text-indigo-400">{availableScreens.length}</span>
        </div>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Role-Authorized Views
        </div>
        {availableScreens.map((item) => {
          const perm = RBAC_MATRIX[item.id][currentRole];
          const isSelected = currentScreen === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => changeScreen(item.id)}
              className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left transition cursor-pointer group ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isSelected ? 'text-white' : 'text-slate-400 group-hover:text-white'
                  }`}
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{item.label}</div>
                  <div
                    className={`text-[10px] truncate ${
                      isSelected ? 'text-indigo-200' : 'text-slate-500'
                    }`}
                  >
                    {item.description}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {item.badgeCount ? (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {item.badgeCount}
                  </span>
                ) : null}
                {renderPermissionBadge(perm)}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5 text-slate-400 font-medium mb-1">
          <ShieldAlert className="h-3.5 w-3.5 text-indigo-400" />
          <span>RBAC Matrix Verified</span>
        </div>
        <p className="leading-tight text-[10px]">
          Left sidebar shows only screens authorized for {activeRoleInfo?.name}.
        </p>
      </div>
    </aside>
  );
};
