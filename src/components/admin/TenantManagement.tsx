import React, { useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { Building, MoreVertical, Plus, CheckCircle2, XCircle } from 'lucide-react';

export const TenantManagement: React.FC = () => {
  const { tenantConfigs, addTenantConfig } = useTenant();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');

  const handleAddTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTenantName.trim()) {
      addTenantConfig({
        societyName: newTenantName.trim(),
        currency: 'USD ($)',
        currencySymbol: '$',
        allocatedBudget: 500000,
        moneyUsed: 0,
        enabled_modules: []
      });
      setNewTenantName('');
      setShowAddForm(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Tenant Workspaces</h1>
          <p className="text-slate-400 mt-1">Manage individual SaaS customer environments and modules.</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Provision New Tenant
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddTenant} className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm max-w-lg">
          <h3 className="text-lg font-medium text-slate-100 mb-4">Provision New Tenant Environment</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Company / Tenant Name</label>
              <input
                type="text"
                value={newTenantName}
                onChange={(e) => setNewTenantName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                placeholder="e.g. Acme Logistics"
                autoFocus
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                disabled={!newTenantName.trim()}
              >
                Provision Workspace
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-700">
          <thead className="bg-slate-900/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Tenant Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Plan</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Modules Enabled</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {tenantConfigs.map((tenant) => {
              const activeModulesCount = tenant.enabled_modules ? tenant.enabled_modules.length : 0;
              return (
                <tr key={tenant.id} className="hover:bg-slate-750 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center justify-center">
                        <Building className="h-5 w-5 text-indigo-400" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-200">{tenant.societyName}</div>
                        <div className="text-xs text-slate-500">ID: {tenant.id.split('-')[0]}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-300">Enterprise</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                    {activeModulesCount} Modules Active
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-slate-400 hover:text-indigo-400 p-2 rounded-lg hover:bg-slate-700 transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
