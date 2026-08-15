import React, { useEffect, useState } from 'react';
import { adminApiService } from '../../services/adminApiService';
import { Building, MoreVertical, Plus, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export const TenantManagement: React.FC = () => {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    let isMounted = true;
    const fetchTenants = async () => {
      try {
        setLoading(true);
        const res = await adminApiService.getAllTenants(page, limit);
        if (isMounted) {
          setTenants(res.data || []);
          setTotal(res.total || 0);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load tenants');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchTenants();
    return () => { isMounted = false; };
  }, [page]);

  const handleSuspend = async (id: string) => {
    if (!window.confirm('Are you sure you want to suspend this tenant?')) return;
    try {
      await adminApiService.suspendTenant(id);
      // Reload
      const res = await adminApiService.getAllTenants(page, limit);
      setTenants(res.data || []);
    } catch (e: any) {
      alert(e.message || 'Suspension failed');
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await adminApiService.reactivateTenant(id);
      // Reload
      const res = await adminApiService.getAllTenants(page, limit);
      setTenants(res.data || []);
    } catch (e: any) {
      alert(e.message || 'Reactivation failed');
    }
  };

  if (loading && tenants.length === 0) {
    return <div className="p-8 text-slate-400">Loading tenants...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-lg flex items-start">
          <AlertTriangle className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold">Error Loading Tenants</h3>
            <p className="mt-1 text-sm opacity-90">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Tenant Workspaces</h1>
          <p className="text-slate-400 mt-1">Manage individual SaaS customer environments and subscriptions.</p>
        </div>
        <button
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors opacity-50 cursor-not-allowed"
          title="Creation via Platform Admin is temporarily disabled. Use public signup flow."
        >
          <Plus className="w-4 h-4 mr-2" />
          Provision New Tenant
        </button>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-700">
          <thead className="bg-slate-900/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Tenant Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Company</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Plan</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {tenants.map((tenant) => {
              const sub = tenant.subscription;
              const isSuspended = sub?.status === 'cancelled';

              return (
                <tr key={tenant.id} className="hover:bg-slate-750 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center justify-center">
                        <Building className="h-5 w-5 text-indigo-400" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-200">{tenant.name}</div>
                        <div className="text-xs text-slate-500">Created: {new Date(tenant.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-300">{tenant.companies?.name || 'N/A'}</span>
                    <div className="text-xs text-slate-500">{tenant.companies?.billing_email || ''}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-300">{sub?.plan || 'No Subscription'}</span>
                    {sub?.current_period_end && (
                      <div className="text-xs text-slate-500">Exp: {new Date(sub.current_period_end).toLocaleDateString()}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isSuspended ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <XCircle className="w-3 h-3 mr-1" />
                        Suspended
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {sub?.status || 'Active'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {isSuspended ? (
                      <button 
                        onClick={() => handleReactivate(tenant.id)}
                        className="text-emerald-400 hover:text-emerald-300 mr-3"
                      >
                        Reactivate
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleSuspend(tenant.id)}
                        className="text-rose-400 hover:text-rose-300 mr-3"
                      >
                        Suspend
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {total > limit && (
          <div className="px-6 py-4 border-t border-slate-700 flex justify-between items-center bg-slate-900/50">
            <span className="text-sm text-slate-400">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} tenants
            </span>
            <div className="flex space-x-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded border border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
              >
                Previous
              </button>
              <button 
                disabled={page * limit >= total}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded border border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
