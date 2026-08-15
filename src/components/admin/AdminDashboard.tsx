import React, { useEffect, useState } from 'react';
import { adminApiService } from '../../services/adminApiService';
import { Users, Building, Activity, DollarSign, AlertTriangle } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentTenants, setRecentTenants] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsData, tenantsData] = await Promise.all([
          adminApiService.getPlatformStats(),
          adminApiService.getAllTenants(1, 5)
        ]);
        if (isMounted) {
          setStats(statsData);
          setRecentTenants(tenantsData.data || []);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load dashboard data');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchDashboardData();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return <div className="p-8 text-slate-400">Loading platform statistics...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-lg flex items-start">
          <AlertTriangle className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold">Error Loading Dashboard</h3>
            <p className="mt-1 text-sm opacity-90">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Tenants', value: stats?.tenantsTotal || 0, icon: Building, color: 'text-indigo-400' },
    { label: 'Total Users', value: stats?.usersTotal || 0, icon: Users, color: 'text-emerald-400' },
    { label: 'Monthly MRR', value: `${(stats?.estimatedMrr || 0).toLocaleString()} DZD`, icon: DollarSign, color: 'text-emerald-400' },
    { label: 'Active Subscriptions', value: stats?.activeSubscriptions || 0, icon: Activity, color: 'text-indigo-400' },
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
        {statCards.map((stat, index) => (
          <div key={index} className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-sm transition hover:border-slate-600">
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
          {recentTenants.length === 0 ? (
            <p className="text-slate-400 text-sm">No tenants found.</p>
          ) : (
            <div className="space-y-4">
              {recentTenants.map((tenant: any) => (
                <div key={tenant.id} className="flex justify-between items-center p-4 bg-slate-900 rounded-lg border border-slate-700">
                  <div>
                    <p className="font-medium text-slate-200">{tenant.name}</p>
                    <p className="text-sm text-slate-400">Plan: {tenant.subscription?.plan || 'N/A'}</p>
                  </div>
                  <div className={`text-sm px-2 py-1 rounded border ${
                    tenant.subscription?.status === 'active' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : tenant.subscription?.status === 'trial'
                      ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {tenant.subscription?.status || 'Unknown'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">System Alerts</h3>
          <div className="space-y-4">
            <div className="flex items-start p-4 bg-slate-900 rounded-lg border border-slate-700">
              <Activity className="w-5 h-5 text-emerald-400 mt-0.5 mr-3 shrink-0" />
              <div>
                <p className="font-medium text-emerald-300">System Healthy</p>
                <p className="text-sm text-slate-400 mt-1">All platform services are operating normally.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
