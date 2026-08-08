import React, { Suspense, lazy, useEffect } from 'react';
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
const InventoryDashboard = lazy(() => import('./components/screens/InventoryDashboard').then(m => ({ default: m.InventoryDashboard })));
const WorkOrderQueue = lazy(() => import('./components/screens/WorkOrderQueue').then(m => ({ default: m.WorkOrderQueue })));
const PMSchedulesView = lazy(() => import('./components/screens/PMSchedulesView').then(m => ({ default: m.PMSchedulesView })));
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
const TelemetryStream = lazy(() => import('./components/screens/TelemetryStream').then(m => ({ default: m.TelemetryStream })));
const AuditLog = lazy(() => import('./components/screens/AuditLog').then(m => ({ default: m.AuditLog })));
const InvitationsScreen = lazy(() => import('./components/screens/InvitationsScreen').then(m => ({ default: m.InvitationsScreen })));
const BillingScreen = lazy(() => import('./components/screens/BillingScreen').then(m => ({ default: m.BillingScreen })));
const ApiDocsScreen = lazy(() => import('./components/screens/ApiDocsScreen').then(m => ({ default: m.ApiDocsScreen })));
const OnboardingWizard = lazy(() => import('./components/screens/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })));
import { DemoBanner } from './components/common/DemoBanner';
import { ForbiddenScreen } from './components/screens/ForbiddenScreen';
import { AdminLayout } from './components/admin/AdminLayout';

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

  const showNavigation = location.pathname !== '/';

  return (
    <div
      dir={dir}
      className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-900 transition-all duration-200"
    >
      <DemoBanner />
      {showNavigation && <TopBar />}

      <div className="flex flex-1 overflow-hidden">
        {showNavigation && <Sidebar />}

        <main className="flex-1 overflow-y-auto min-w-0 p-4 lg:p-6 pb-12">
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
              <Route
                path="/pm-schedules"
                element={
                  <ProtectedRoute screenId="PM_SCHEDULES">
                    <PMSchedulesView />
                  </ProtectedRoute>
                }
              />
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
