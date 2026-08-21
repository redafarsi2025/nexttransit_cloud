import React, { useEffect, useMemo, useState } from 'react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useLocalization } from '../../context/LocalizationContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { RBAC_MATRIX, ROLES_CONFIG } from '../../data/seedData';
import { ScreenId, PermissionLevel } from '../../types';
import {
  TrendingUp,
  BarChart3,
  Package,
  Wrench,
  AlertTriangle,
  Calculator,
  FileText,
  Truck,
  Map as MapIcon,
  Smartphone,
  ShieldAlert,
  ShieldCheck,
  Building2,
  Globe,
  Fuel,
  CircleDot,
  Radio,
  Mail,
  CreditCard,
  ShoppingCart,
  Code2,
  LayoutDashboard,
  ChevronDown,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';

type GroupId =
  | 'overview'
  | 'fleet_ops'
  | 'maintenance_budget'
  | 'safety_compliance'
  | 'telemetry'
  | 'field_views'
  | 'administration';

interface ScreenConfig {
  id: ScreenId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  group: GroupId;
  badgeCount?: number;
}

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onMobileClose }) => {
  const { alerts } = useFleet();
  const { currentRole, currentScreen, changeScreen } = useAuth();
  const { t } = useLocalization();
  const isMobile = useIsMobile();
  const [query, setQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<Partial<Record<GroupId, boolean>>>({});
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('nexttransit_sidebar_collapsed') === 'true'
  );

  // On mobile the sidebar is an off-canvas drawer (see the shared wrapper classes below) — the
  // desktop icon-rail "collapse" preference doesn't save any space there and only shrinks the
  // drawer's usable content, so it never applies on mobile regardless of the stored preference.
  const showIconRail = collapsed && !isMobile;

  const handleNavigate = (screen: ScreenId) => {
    changeScreen(screen);
    onMobileClose();
  };

  const activeRoleInfo = ROLES_CONFIG.find((r) => r.id === currentRole);

  const groupConfigs: { id: GroupId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: t('nav.group_overview', {}, 'Tableaux de bord'), icon: LayoutDashboard },
    { id: 'fleet_ops', label: t('nav.group_fleet_ops', {}, 'Flotte & Opérations'), icon: Truck },
    { id: 'maintenance_budget', label: t('nav.group_maintenance_budget', {}, 'Maintenance & Budget'), icon: Wrench },
    { id: 'safety_compliance', label: t('nav.group_safety_compliance', {}, 'Sécurité & Conformité'), icon: ShieldAlert },
    { id: 'telemetry', label: t('nav.group_telemetry', {}, 'Télématique'), icon: Radio },
    { id: 'field_views', label: t('nav.group_field_views', {}, 'Vues Terrain'), icon: Smartphone },
    { id: 'administration', label: t('nav.group_administration', {}, 'Administration'), icon: Building2 },
  ];

  const screenConfigs: ScreenConfig[] = [
    {
      id: 'STRATEGIC_DASHBOARD',
      label: t('nav.strategic_dashboard', {}, 'Strategic Dashboard'),
      icon: TrendingUp,
      description: t('nav.strategic_desc', {}, 'Director KPI cards & fleet availability'),
      group: 'overview',
    },
    {
      id: 'VARIANCE_DASHBOARD',
      label: t('nav.variance_dashboard', {}, 'Variance & Budget'),
      icon: BarChart3,
      description: t('nav.variance_desc', {}, 'Drill-down: fleet → category → vehicle → WO'),
      group: 'overview',
    },
    {
      id: 'FLEET_HEALTH_GRID',
      label: t('nav.fleet_health_grid', {}, 'Gestion des véhicules (Flotte)'),
      icon: Truck,
      description: t('nav.fleet_health_desc', {}, 'Status filter counts & diagnostic snapshots'),
      group: 'fleet_ops',
    },
    {
      id: 'FLEET_MAP',
      label: 'Carte GPS Flotte',
      icon: MapIcon,
      description: 'Suivi géographique en temps réel',
      group: 'fleet_ops',
    },
    {
      id: 'WORK_ORDER_QUEUE',
      label: t('nav.work_order_queue', {}, 'Work Order Queue'),
      icon: Wrench,
      description: t('nav.work_order_desc', {}, 'Create & approve maintenance interventions'),
      group: 'fleet_ops',
    },
    {
      id: 'CONFLICT_ALERTS',
      label: t('nav.conflict_alerts', {}, 'Conflict Alerts (R2/R4)'),
      icon: AlertTriangle,
      description: t('nav.conflict_desc', {}, 'Critical vehicles scheduled for use'),
      group: 'fleet_ops',
      badgeCount: alerts.filter((a) => a.rule_id === 'R4' && !a.read).length,
    },
    {
      id: 'CAE_BUDGET_PRIORITIZATION',
      label: t('nav.cae_prioritization', {}, 'CAE Prioritization'),
      icon: Calculator,
      description: t('nav.cae_desc', {}, 'Ranked repair vs. statistical deferral cost'),
      group: 'maintenance_budget',
    },
    {
      id: 'INVENTORY_DASHBOARD',
      label: t('nav.inventory_dashboard', {}, 'Inventory Dashboard'),
      icon: Package,
      description: t('nav.inventory_desc', {}, 'Stock values & R3 projected shortfalls'),
      group: 'maintenance_budget',
    },
    // PM_SCHEDULES intentionally not listed here: out of pilot scope per
    // audit/07_ROADMAP_MVP.md Phase 0 décision 6 (non typé, ~15 erreurs tsc
    // dans src/services/maintenance/, rien dans le parcours pilote n'en dépend).
    // Route redirected in App.tsx — do not re-add this entry without also
    // removing that redirect and closing out the underlying type errors.
    {
      id: 'EDI_SUPPLIERS',
      label: 'EDI & Grossistes (Phase 3)',
      icon: ShoppingCart,
      description: 'Approvisionnement auto EDI & catalogues Bosch/Valeo',
      group: 'maintenance_budget',
    },
    {
      id: 'INCIDENT_REPORTS',
      label: t('nav.incident_reports', {}, 'Incident Investigation (R6)'),
      icon: FileText,
      description: t('nav.incident_desc', {}, 'R6 driver reports & OBD fault linkage'),
      group: 'safety_compliance',
    },
    {
      id: 'SAFETY_PERFORMANCE',
      label: t('nav.safety_performance', {}, 'Safety Performance'),
      icon: ShieldAlert,
      description: t('nav.safety_desc', {}, 'Harsh braking, acceleration & driver safety scores'),
      group: 'safety_compliance',
    },
    {
      id: 'AUDIT_LOG',
      label: t('nav.audit_log', {}, 'Immutable Audit Trail'),
      icon: ShieldCheck,
      description: t('nav.audit_desc', {}, 'Append-only audit ledger for mutations, work orders, rule overrides & CAE decisions'),
      group: 'safety_compliance',
    },
    {
      id: 'TELEMETRY_STREAM',
      label: t('nav.telemetry_stream', {}, 'Live Telemetry Stream'),
      icon: Radio,
      description: t('nav.telemetry_desc', {}, 'Real-time GPS coords, OBD faults & adapter statuses'),
      group: 'telemetry',
    },
    {
      id: 'FUEL_LOGS',
      label: t('nav.fuel_logs', {}, 'Fuel & Consumption'),
      icon: Fuel,
      description: t('nav.fuel_desc', {}, 'Log fuel, consumption L/100km & R7 anomaly detection'),
      group: 'telemetry',
      badgeCount: alerts.filter((a) => a.rule_id === 'R7' && !a.read).length,
    },
    {
      id: 'TIRE_MANAGEMENT',
      label: t('nav.tire_management', {}, 'Tire Management'),
      icon: CircleDot,
      description: t('nav.tire_desc', {}, 'Track tire position, tread depth & rotation schedule'),
      group: 'telemetry',
    },
    {
      id: 'MECHANIC_MOBILE_QUEUE',
      label: t('nav.mechanic_mobile_queue', {}, 'Mechanic Task Queue'),
      icon: Smartphone,
      description: t('nav.mechanic_desc', {}, 'Mobile task execution & OBD fault scan'),
      group: 'field_views',
    },
    {
      id: 'DRIVER_MOBILE_VIEW',
      label: t('nav.driver_mobile_view', {}, 'Driver Mobile View'),
      icon: Truck,
      description: t('nav.driver_desc', {}, 'Status indicator & instant issue report'),
      group: 'field_views',
    },
    {
      id: 'TENANT_CONFIG',
      label: t('nav.tenant_config', {}, 'Configuration Espace Entreprise'),
      icon: Building2,
      description: t('nav.tenant_desc', {}, 'Society name, budget & money used settings'),
      group: 'administration',
    },
    {
      id: 'TRANSLATION_CENTER',
      label: t('nav.translation_center', {}, 'Translation Center'),
      icon: Globe,
      description: t('nav.translation_desc', {}, 'Enterprise localization, Gemini AI & RTL'),
      group: 'administration',
    },
    {
      id: 'INVITATIONS',
      label: 'User Invitations',
      icon: Mail,
      description: 'Invite users & assign RBAC roles',
      group: 'administration',
    },
    {
      id: 'BILLING',
      label: 'Billing & SaaS Plan',
      icon: CreditCard,
      description: 'Subscription status & company billing',
      group: 'administration',
    },
    {
      id: 'API_DOCS',
      label: 'Documentation OpenAPI',
      icon: Code2,
      description: 'Spécification Swagger REST & endpoints Supabase',
      group: 'administration',
    },
  ];

  // Filter screens based on RBAC matrix for currentRole
  const availableScreens = useMemo(
    () =>
      screenConfigs.filter((s) => {
        const perm = RBAC_MATRIX[s.id][currentRole];
        return perm !== 'none';
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentRole, alerts]
  );

  const groupOf = (screenId: ScreenId) => availableScreens.find((s) => s.id === screenId)?.group;

  // Keep the group containing the active screen expanded whenever it changes.
  useEffect(() => {
    const g = groupOf(currentScreen);
    if (g) {
      setOpenGroups((prev) => (prev[g] ? prev : { ...prev, [g]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen]);

  useEffect(() => {
    localStorage.setItem('nexttransit_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  const trimmedQuery = query.trim().toLowerCase();
  const isSearching = trimmedQuery.length > 0;

  const groupedScreens = groupConfigs
    .map((group) => ({
      ...group,
      items: availableScreens.filter(
        (s) => s.group === group.id && (!isSearching || s.label.toLowerCase().includes(trimmedQuery))
      ),
    }))
    .filter((group) => group.items.length > 0);

  const toggleGroup = (id: GroupId) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderPermissionDot = (perm: PermissionLevel) => {
    if (perm === 'full') return null;
    const colors: Partial<Record<PermissionLevel, string>> = {
      view: 'bg-slate-400',
      resolve: 'bg-purple-400',
      parts_status: 'bg-emerald-400',
      assigned_only: 'bg-orange-400',
      submit: 'bg-teal-400',
      own_only: 'bg-orange-400',
    };
    return (
      <span
        title={`Permission: ${perm.replace('_', ' ')}`}
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${colors[perm] || 'bg-slate-400'}`}
      />
    );
  };

  // Shared off-canvas drawer behavior for phones/tablets: fixed + slide-in-from-left +
  // backdrop, below the `md` breakpoint. At `md` and up this resolves to a normal in-flow flex
  // sibling (as before) — `md:translate-x-0 md:static` overrides the mobile transform/position.
  const drawerClasses = `fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-out md:static md:translate-x-0 md:transition-none ${
    isMobileOpen ? 'translate-x-0' : '-translate-x-full'
  }`;

  const backdrop = (
    <div
      className={`fixed inset-0 z-40 bg-slate-950/60 transition-opacity md:hidden ${
        isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      onClick={onMobileClose}
      aria-hidden="true"
    />
  );

  if (showIconRail) {
    return (
      <>
        {backdrop}
        <aside className={`${drawerClasses} w-[68px] border-r border-slate-200 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]`}>
          <div className="p-2.5 border-b border-slate-800 bg-slate-950/60 flex flex-col items-center gap-2">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-white font-bold text-sm shadow-sm ${
                activeRoleInfo?.badgeColor || 'bg-indigo-600'
              }`}
              title={`${activeRoleInfo?.name} — ${activeRoleInfo?.title}`}
            >
              {activeRoleInfo?.avatar || 'NX'}
            </div>
            <button
              onClick={() => setCollapsed(false)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
              title={t('nav.expand_sidebar', {}, 'Étendre le menu')}
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
          <nav className="flex-1 py-2 space-y-3 overflow-y-auto">
            {groupedScreens.map((group) => (
              <div key={group.id} className="space-y-1">
                {group.items.map((item) => {
                  const isSelected = currentScreen === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      title={item.label}
                      className={`relative mx-2 flex h-10 w-[calc(100%-16px)] items-center justify-center rounded-xl transition cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.badgeCount ? (
                        <span className="absolute top-0.5 right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                          {item.badgeCount}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>
      </>
    );
  }

  return (
    <>
      {backdrop}
      <aside className={`${drawerClasses} w-64 border-r border-slate-200 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]`}>
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
          <div className="overflow-hidden flex-1">
            <div className="text-xs font-bold text-white truncate">
              {activeRoleInfo?.name}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {activeRoleInfo?.title}
            </div>
          </div>
          {/* Collapse-to-icon-rail only makes sense on desktop, where it's an in-flow width
              saving; on mobile the drawer already overlays the page, so this is hidden there
              in favor of the explicit close (X) button below. */}
          <button
            onClick={() => setCollapsed(true)}
            className="hidden md:flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            title={t('nav.collapse_sidebar', {}, 'Réduire le menu')}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
          <button
            onClick={onMobileClose}
            className="flex md:hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            title={t('nav.close_menu', {}, 'Fermer le menu')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick search */}
        <div className="mt-3 relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('nav.search_placeholder', {}, 'Rechercher un écran…')}
            className="w-full rounded-lg border border-slate-800 bg-slate-900 py-1.5 pl-8 pr-2.5 text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 p-2.5 space-y-1 overflow-y-auto">
        {groupedScreens.map((group) => {
          const GroupIcon = group.icon;
          const isOpen = isSearching || !!openGroups[group.id];
          const groupBadgeCount = group.items.reduce((sum, i) => sum + (i.badgeCount || 0), 0);

          return (
            <div key={group.id}>
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-slate-400 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
              >
                <GroupIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 text-[10px] font-bold uppercase tracking-wider truncate">
                  {group.label}
                </span>
                {groupBadgeCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {groupBadgeCount}
                  </span>
                )}
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`}
                />
              </button>

              {isOpen && (
                <div className="mt-0.5 space-y-0.5 pb-1.5">
                  {group.items.map((item) => {
                    const perm = RBAC_MATRIX[item.id][currentRole];
                    const isSelected = currentScreen === item.id;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(item.id)}
                        title={item.description}
                        className={`w-full flex items-center gap-2.5 rounded-lg py-2 pl-4 pr-2.5 text-left transition cursor-pointer group border-l-2 ${
                          isSelected
                            ? 'border-indigo-400 bg-indigo-600/90 text-white shadow-sm font-semibold'
                            : 'border-transparent text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            isSelected ? 'text-white' : 'text-slate-400 group-hover:text-white'
                          }`}
                        />
                        <span className="flex-1 text-xs truncate">{item.label}</span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          {item.badgeCount ? (
                            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                              {item.badgeCount}
                            </span>
                          ) : null}
                          {renderPermissionDot(perm)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {isSearching && groupedScreens.length === 0 && (
          <div className="px-3 py-6 text-center text-[11px] text-slate-500">
            {t('nav.search_empty', {}, 'Aucun écran ne correspond à votre recherche.')}
          </div>
        )}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5 text-slate-400 font-medium mb-1">
          <ShieldAlert className="h-3.5 w-3.5 text-indigo-400" />
          <span>RBAC Matrix Verified</span>
        </div>
        <p className="leading-tight text-[10px]">
          {availableScreens.length} écrans autorisés pour {activeRoleInfo?.name}.
        </p>
      </div>
      </aside>
    </>
  );
};
