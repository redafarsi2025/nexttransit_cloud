import React, { useEffect, useState } from 'react';
import { adminApiService } from '../../services/adminApiService';
import { Users, CheckCircle2, XCircle, AlertTriangle, Key } from 'lucide-react';

export const UsersManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    let isMounted = true;
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await adminApiService.getAllUsers(page, limit);
        if (isMounted) {
          setUsers(res.data || []);
          setTotal(res.total || 0);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load users');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchUsers();
    return () => { isMounted = false; };
  }, [page]);

  const handleDisable = async (id: string) => {
    if (!window.confirm('Are you sure you want to disable this user? They will be banned from logging in.')) return;
    try {
      await adminApiService.disableUser(id);
      // Reload
      const res = await adminApiService.getAllUsers(page, limit);
      setUsers(res.data || []);
    } catch (e: any) {
      alert(e.message || 'Action failed');
    }
  };

  const handleEnable = async (id: string) => {
    try {
      await adminApiService.enableUser(id);
      // Reload
      const res = await adminApiService.getAllUsers(page, limit);
      setUsers(res.data || []);
    } catch (e: any) {
      alert(e.message || 'Action failed');
    }
  };

  const handleRoleChange = async (id: string, currentRole: string) => {
    const newRole = window.prompt('Enter new role (SUPER_ADMIN, TENANT_ADMIN, DIRECTOR, FLEET_MANAGER, MAINTENANCE_MANAGER, FINANCE, OPERATIONS, MECHANIC, DRIVER)', currentRole);
    if (!newRole || newRole === currentRole) return;
    
    try {
      await adminApiService.changeUserRole(id, newRole);
      const res = await adminApiService.getAllUsers(page, limit);
      setUsers(res.data || []);
    } catch (e: any) {
      alert(e.message || 'Failed to change role');
    }
  };

  if (loading && users.length === 0) {
    return <div className="p-8 text-slate-400">Loading cross-tenant users...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-lg flex items-start">
          <AlertTriangle className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold">Error Loading Users</h3>
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
          <h1 className="text-2xl font-bold text-slate-100">Global Users Management</h1>
          <p className="text-slate-400 mt-1">Cross-tenant view of all identities on the platform.</p>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-700">
          <thead className="bg-slate-900/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Tenant</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-750 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-slate-200">{user.full_name || 'No Name'}</div>
                      <div className="text-xs text-slate-500">{user.email || user.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-slate-300">{user.tenants?.name || 'Platform / Global'}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-slate-300">{user.role}</span>
                  <button 
                    onClick={() => handleRoleChange(user.id, user.role)}
                    className="ml-2 text-indigo-400 hover:text-indigo-300 text-xs"
                  >
                    Edit
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.is_active ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      <XCircle className="w-3 h-3 mr-1" />
                      Disabled
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {user.is_active ? (
                    <button 
                      onClick={() => handleDisable(user.id)}
                      className="text-rose-400 hover:text-rose-300 mr-3"
                    >
                      Disable
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleEnable(user.id)}
                      className="text-emerald-400 hover:text-emerald-300 mr-3"
                    >
                      Enable
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {total > limit && (
          <div className="px-6 py-4 border-t border-slate-700 flex justify-between items-center bg-slate-900/50">
            <span className="text-sm text-slate-400">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} users
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
