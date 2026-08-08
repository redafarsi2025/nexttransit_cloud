import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopBar } from './AdminTopBar';
import { SuperAdminGuard } from './SuperAdminGuard';
import { AdminDashboard } from './AdminDashboard';
import { TenantManagement } from './TenantManagement';
import { SubscriptionPlans } from './SubscriptionPlans';
import { SystemHealth } from './SystemHealth';
import { GlobalSettings } from './GlobalSettings';

export const AdminLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 overflow-hidden font-sans">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminTopBar />
        <main className="flex-1 overflow-auto bg-slate-900 p-8">
          <Suspense fallback={<div className="flex h-full items-center justify-center text-slate-400">Loading Admin Module...</div>}>
            <Routes>
              <Route element={<SuperAdminGuard />}>
                <Route index element={<AdminDashboard />} />
                <Route path="tenants" element={<TenantManagement />} />
                <Route path="billing" element={<SubscriptionPlans />} />
                <Route path="system" element={<SystemHealth />} />
                <Route path="settings" element={<GlobalSettings />} />
                <Route path="*" element={<div className="text-slate-400">Under Construction</div>} />
              </Route>
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
};
