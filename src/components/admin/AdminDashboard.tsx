import React from 'react';
import { useTenant } from '../../context/TenantContext';
import { Users, Building, Activity, DollarSign } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { tenantConfigs } = useTenant();
  
  const stats = [
    { label: 'Active Tenants', value: tenantConfigs.length, icon: Building, color: 'text-indigo-400' },
    { label: 'Total Users', value: '1,248', icon: Users, color: 'text-emerald-400' },
    { label: 'Monthly MRR', value: '$45,200', icon: DollarSign, color: 'text-emerald-400' },
    { label: 'System Uptime', value: '99.98%', icon: Activity, color: 'text-indigo-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Platform Overview</h1>
          <p className="text-slate-400 mt-1">Global metrics across all SaaS tenants.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-100">{stat.value}</p>
              </div>
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Recent Tenant Signups</h3>
          <div className="space-y-4">
            {tenantConfigs.slice(0, 5).map(tenant => (
              <div key={tenant.id} className="flex justify-between items-center p-4 bg-slate-900 rounded-lg border border-slate-700">
                <div>
                  <p className="font-medium text-slate-200">{tenant.societyName}</p>
                  <p className="text-sm text-slate-400">Plan: Enterprise</p>
                </div>
                <div className="text-sm px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Active
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">System Alerts</h3>
          <div className="space-y-4">
            <div className="flex items-start p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <Activity className="w-5 h-5 text-amber-400 mt-0.5 mr-3 shrink-0" />
              <div>
                <p className="font-medium text-amber-300">High API Latency Detected</p>
                <p className="text-sm text-amber-400/80 mt-1">EMEA region showing elevated telemetry ingestion times.</p>
              </div>
            </div>
            <div className="flex items-start p-4 bg-slate-900 rounded-lg border border-slate-700">
              <Building className="w-5 h-5 text-slate-400 mt-0.5 mr-3 shrink-0" />
              <div>
                <p className="font-medium text-slate-300">Scheduled Maintenance</p>
                <p className="text-sm text-slate-500 mt-1">Database failover test scheduled for 02:00 UTC.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
