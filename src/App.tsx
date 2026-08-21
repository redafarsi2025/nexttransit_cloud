import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useFleet } from './context/FleetContext';
import { AppProviders } from './context/AppProviders';
import { useAuth } from './context/AuthContext';
import { useLocalization } from './context/LocalizationContext';
import { TopBar } from './components/common/TopBar';
import { Sidebar } from './components/common/Sidebar';
import { VehicleDetailModal } from './components/vehicle/VehicleDetailModal';
import { ProtectedRoute } from './components/guards/ProtectedRoute';
// Removed from ForbiddenScreen to avoid circular dependencies
import { routeToScreenMap, getRoleDefaultRoute } from './routes/routeMap';

// LandingPage loaded statically as default public route
import { LandingPage } from './components/screens/LandingPage';

// Lazy loaded screen components for route-based bundle splitting
const StrategicDashboard = lazy(() => import('./components/screens/StrategicDashboard').then(m => ({ default: m.StrategicDashboard })));
const VarianceDashboard = lazy(() => import('./components/screens/VarianceDashboard').then(m => ({ default: m.VarianceDashboard })));
const FleetHealthGrid = lazy(() => import('./components/screens/FleetHealthGrid').then(m => ({ default: m.FleetHealthGrid })));
const FleetMapScreen = lazy(() => import('./components/screens/FleetMapScreen').then(m => ({ default: m.FleetMapScreen })));
const InventoryDashboard = lazy(() => import('./components/screens/InventoryDashboard').then(m => ({ default: m.InventoryDashboard })));
const WorkOrderQueue = lazy(() => import('./components/screens/WorkOrderQueue').then(m => ({ default: m.WorkOrderQueue })));
// PMSchedulesView lazy import removed: route redirected below, out of pilot scope (see comment there).
const EdiSuppliersView = lazy(() => import('./components/screens/EdiSuppliersView').then(m => ({ default: m.EdiSuppliersView })));
const ConflictAlerts = lazy(() => import('./components/screens/ConflictAlerts').then(m => ({ default: m.ConflictAlerts })));
const CaeBudgetPrioritization = lazy(() => import('./components/screens/CaeBudgetPrioritization').then(m => ({ default: m.CaeBudgetPrioritization })));
const IncidentReports = lazy(() => import('./components/screens/IncidentReports').then(m => ({ default: m.IncidentReports })));
const MechanicMobileQueue = lazy(() => import('./components/screens/MechanicMobileQueue').then(m => ({ default: m.MechanicMobileQueue })));
const DriverMobileView = lazy(() => import('./components/screens/DriverMobileView').then(m => ({ default: m.DriverMobileView })));
const TenantConfig = lazy(() => import('./components/screens/TenantConfig').then(m => ({ default: m.TenantConfig })));
const TranslationCenter = lazy(() => import('./components/screens/TranslationCenter').then(m => ({ default: m.TranslationCenter })));
const SafetyPerformance = lazy(() => import('./components/screens/SafetyPerformance').then(m => ({ default: m.SafetyPerformance })));
const FuelModule = lazy(() => import('./components/screens/FuelModule').then(m => ({ default: m.FuelModule })));
const TireModule = lazy(() => import('./components/screens/TireModule').then(m => ({ default: m.TireModule })));
const TelemetryStream = lazy(() => import('./components/screens/TelemetryStream').then(m => ({ default: m.TelemetryStream })));
const AuditLog = lazy(() => import('./components/screens/AuditLog').then(m => ({ default: m.AuditLog })));
const InvitationsScreen = lazy(() => import('./components/screens/InvitationsScreen').then(m => ({ default: m.InvitationsScreen })));
const BillingScreen = lazy(() => import('./components/screens/BillingScreen').then(m => ({ default: m.BillingScreen })));
const ApiDocsScreen = lazy(() => import('./components/screens/ApiDocsScreen').then(m => ({ default: m.ApiDocsScreen })));
const OnboardingWizard = lazy(() => import('./components/screens/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })));
import { DemoBanner } from './components/common/DemoBanner';
import { ForbiddenScreen } from './components/screens/ForbiddenScreen';
import { AdminLayout } from './components/admin/AdminLayout';
import { WallboardLayout } from './components/control-room/WallboardLayout';

const LiveMapBoard = lazy(() => import('./components/screens/control-room/LiveMapBoard').then(m => ({ default: m.LiveMapBoard })));
const AlertBoard = lazy(() => import('./components/screens/control-room/AlertBoard').then(m => ({ default: m.AlertBoard })));
const KpiBoard = lazy(() => import('./components/screens/control-room/KpiBoard').then(m => ({ default: m.KpiBoard })));
const MaintenanceBoard = lazy(() => import('./components/screens/control-room/MaintenanceBoard').then(m => ({ default: m.MaintenanceBoard })));

const RouteFallback: React.FC = () => (
  <div className="flex items-center justify-center h-full w-full py-24">
    <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
  </div>
);

// Separate modal container component so AppLayout does not re-render on fleet context updates
const VehicleDetailModalContainer: React.FC = () => {
  const { selectedVehicleId, setSelectedVehicleId } = useFleet();
  if (!selectedVehicleId) return null;
  return (
    <VehicleDetailModal
      vehicleId={selectedVehicleId}
      onClose={() => setSelectedVehicleId(null)}
    />
  );
};

// Smart fallback component for wildcards (*) in authenticated vs unauthenticated context
const SmartRouteFallback: React.FC = () => {
  const { currentRole, currentUser } = useAuth();
  if (currentUser || currentRole) {
    const defaultRoute = getRoleDefaultRoute(currentRole);
    return <Navigate to={defaultRoute} replace />;
  }
  return <Navigate to="/" replace />;
};

const AppLayout: React.FC = () => {
  const { currentScreen, changeScreen, setNavigate } = useAuth();
  const { dir } = useLocalization();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Inject the router navigate function into AuthContext so changeScreen can drive URL navigation
  useEffect(() => {
    setNavigate(navigate);
  }, [navigate, setNavigate]);

  // Synchronize location path with context screen state ONCE when location changes
  useEffect(() => {
    const matchedScreen = routeToScreenMap[location.pathname];
    if (matchedScreen && matchedScreen !== currentScreen) {
      changeScreen(matchedScreen, false);
    }
  }, [location.pathname, currentScreen, changeScreen]);

  // Belt-and-suspenders: close the mobile drawer on any route change, not just nav-item clicks
  // inside Sidebar (e.g. browser back/forward, or a link elsewhere in the page).
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  const isPublicRoute = location.pathname === '/';
  const isControlRoom = location.pathname.startsWith('/control-room');
  const showNavigation = !isPublicRoute && !isControlRoom;

  return (
    <div
      dir={dir}
      className={`min-h-screen flex flex-col font-sans antialiased transition-all duration-200 ${
        isControlRoom ? 'bg-slate-950 text-slate-200' : 'bg-slate-100 text-slate-900'
      }`}
    >
      <DemoBanner />
      {showNavigation && <TopBar onMenuClick={() => setIsMobileSidebarOpen((v) => !v)} />}

      <div className="flex flex-1 overflow-hidden">
        {showNavigation && (
          <Sidebar
            isMobileOpen={isMobileSidebarOpen}
            onMobileClose={() => setIsMobileSidebarOpen(false)}
          />
        )}

        <main className={`flex-1 overflow-y-auto min-w-0 ${isControlRoom ? '' : 'p-4 lg:p-6 pb-12'}`}>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Public Route */}
              <Route path="/" element={<LandingPage />} />

              {/* Protected Operational & Financial Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute screenId="STRATEGIC_DASHBOARD">
                    <StrategicDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/variance"
                element={
                  <ProtectedRoute screenId="VARIANCE_DASHBOARD">
                    <VarianceDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vehicles"
                element={
                  <ProtectedRoute screenId="FLEET_HEALTH_GRID">
                    <FleetHealthGrid />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/map"
                element={
                  <ProtectedRoute screenId="FLEET_MAP">
                    <FleetMapScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute screenId="INVENTORY_DASHBOARD">
                    <InventoryDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/work-orders"
                element={
                  <ProtectedRoute screenId="WORK_ORDER_QUEUE">
                    <WorkOrderQueue />
                  </ProtectedRoute>
                }
              />
              {/* PM_SCHEDULES: out of pilot scope per audit/07_ROADMAP_MVP.md Phase 0
                  décision 6 — module non typé (13 erreurs tsc dans src/services/maintenance/),
                  jamais déployé de façon confirmée (voir audit/08_RECONCILIATION.md), rien dans
                  le parcours pilote n'en dépend. Redirected rather than left reachable-but-broken. */}
              <Route path="/pm-schedules" element={<Navigate to="/forbidden" replace />} />
              <Route
                path="/edi-suppliers"
                element={
                  <ProtectedRoute screenId="EDI_SUPPLIERS">
                    <EdiSuppliersView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/conflicts"
                element={
                  <ProtectedRoute screenId="CONFLICT_ALERTS">
                    <ConflictAlerts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cae"
                element={
                  <ProtectedRoute screenId="CAE_BUDGET_PRIORITIZATION">
                    <CaeBudgetPrioritization />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/incidents"
                element={
                  <ProtectedRoute screenId="INCIDENT_REPORTS">
                    <IncidentReports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mechanic"
                element={
                  <ProtectedRoute screenId="MECHANIC_MOBILE_QUEUE">
                    <MechanicMobileQueue />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/driver"
                element={
                  <ProtectedRoute screenId="DRIVER_MOBILE_VIEW">
                    <DriverMobileView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tenant-config"
                element={
                  <ProtectedRoute screenId="TENANT_CONFIG">
                    <TenantConfig />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/translation"
                element={
                  <ProtectedRoute screenId="TRANSLATION_CENTER">
                    <TranslationCenter />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/safety"
                element={
                  <ProtectedRoute screenId="SAFETY_PERFORMANCE">
                    <SafetyPerformance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/fuel"
                element={
                  <ProtectedRoute screenId="FUEL_LOGS">
                    <FuelModule />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tires"
                element={
                  <ProtectedRoute screenId="TIRE_MANAGEMENT">
                    <TireModule />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/telemetry"
                element={
                  <ProtectedRoute screenId="TELEMETRY_STREAM">
                    <TelemetryStream />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audit"
                element={
                  <ProtectedRoute screenId="AUDIT_LOG">
                    <AuditLog />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invitations"
                element={
                  <ProtectedRoute screenId="INVITATIONS">
                    <InvitationsScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/billing"
                element={
                  <ProtectedRoute screenId="BILLING">
                    <BillingScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/api-docs"
                element={
                  <ProtectedRoute screenId="API_DOCS">
                    <ApiDocsScreen />
                  </ProtectedRoute>
                }
              />

              {/* Forbidden 403 Route */}
              <Route path="/forbidden" element={<ForbiddenScreen />} />

              {/* Post-registration onboarding wizard — public, no auth guard */}
              <Route path="/onboarding" element={<OnboardingWizard />} />

              {/* Control Room Routes */}
              <Route element={<WallboardLayout />}>
                <Route
                  path="/control-room/map"
                  element={
                    <ProtectedRoute screenId="CONTROL_ROOM_MAP">
                      <LiveMapBoard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/control-room/alerts"
                  element={
                    <ProtectedRoute screenId="CONTROL_ROOM_ALERTS">
                      <AlertBoard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/control-room/kpi"
                  element={
                    <ProtectedRoute screenId="CONTROL_ROOM_KPI">
                      <KpiBoard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/control-room/maintenance"
                  element={
                    <ProtectedRoute screenId="CONTROL_ROOM_MAINTENANCE">
                      <MaintenanceBoard />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Smart Fallback Wildcard Route */}
              <Route path="*" element={<SmartRouteFallback />} />
            </Routes>
          </Suspense>
        </main>
      </div>

      <VehicleDetailModalContainer />
    </div>
  );
};



export default function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <Routes>
          <Route path="/admin/*" element={<AdminLayout />} />
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </AppProviders>
    </BrowserRouter>
  );
}
