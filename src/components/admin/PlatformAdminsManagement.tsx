import React, { useEffect, useState } from 'react';
import { adminApiService } from '../../services/adminApiService';
import { Shield, Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface PlatformAdmin {
  id: string;
  email: string;
  created_at: string;
}

export const PlatformAdminsManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [admins, setAdmins] = useState<PlatformAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add admin form state
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminApiService.getAllPlatformAdmins();
      setAdmins(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load platform admins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;
    setAddLoading(true);
    setAddError(null);
    try {
      await adminApiService.addPlatformAdmin(newAdminEmail.trim());
      setNewAdminEmail('');
      await fetchAdmins();
      showSuccess(`${newAdminEmail.trim()} has been granted platform admin privileges.`);
    } catch (e: any) {
      setAddError(e.message || 'Failed to add admin');
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveAdmin = async (admin: PlatformAdmin) => {
    if (admin.id === currentUser?.id) {
      alert('You cannot remove yourself as a platform admin.');
      return;
    }
    if (admins.length <= 1) {
      alert('Cannot remove the last platform admin. Add another admin first.');
      return;
    }
    if (!window.confirm(`Remove platform admin privileges from ${admin.email}?\n\nThis will permanently revoke their access to the platform admin panel.`)) {
      return;
    }
    try {
      await adminApiService.removePlatformAdmin(admin.id);
      await fetchAdmins();
      showSuccess(`${admin.email} has been removed from platform admins.`);
    } catch (e: any) {
      // Surface guard errors clearly
      alert(e.message || 'Failed to remove admin');
    }
  };

  if (loading && admins.length === 0) {
    return <div className="p-8 text-slate-400">Loading platform admins...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Platform Administrators</h1>
        <p className="text-slate-400 mt-1">
          Manage who has access to this platform admin panel. These users bypass tenant isolation and have full
          read/write access to all platform data. Add with extreme care.
        </p>
      </div>

      {/* Security notice */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start">
        <AlertTriangle className="w-5 h-5 text-amber-400 mr-3 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-300">
          <p className="font-semibold">Security Reminder</p>
          <p className="mt-1 opacity-90">
            Platform admins have unrestricted access to all tenant data. Changes here are logged in the audit log.
            The last active platform admin cannot be removed.
          </p>
        </div>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 flex items-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 mr-3 shrink-0" />
          <p className="text-sm text-emerald-300">{successMessage}</p>
        </div>
      )}

      {/* Global error */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-lg flex items-start">
          <AlertTriangle className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold">Error Loading Admins</h3>
            <p className="mt-1 text-sm opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* Add Admin Form */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Add Platform Admin</h2>
        <p className="text-sm text-slate-400 mb-4">
          The user must already have a registered account (via the standard signup flow). You cannot create
          new accounts from this panel.
        </p>
        <form onSubmit={handleAddAdmin} className="flex gap-3">
          <input
            id="new-platform-admin-email"
            type="email"
            required
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            placeholder="user@example.com"
            className="flex-1 bg-slate-900 border border-slate-600 text-slate-200 rounded-lg px-4 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={addLoading || !newAdminEmail.trim()}
            id="add-platform-admin-btn"
            className="flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            {addLoading ? 'Adding...' : 'Grant Access'}
          </button>
        </form>
        {addError && (
          <p className="mt-3 text-sm text-rose-400 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-1.5 shrink-0" />
            {addError}
          </p>
        )}
      </div>

      {/* Admins List */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-700">
          <thead className="bg-slate-900/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Administrator
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Added
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {admins.map((admin) => {
              const isCurrentUser = admin.id === currentUser?.id;
              const isLastAdmin = admins.length === 1;

              return (
                <tr key={admin.id} className="hover:bg-slate-750 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center justify-center">
                        <Shield className="h-5 w-5 text-indigo-400" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-200">{admin.email}</div>
                        <div className="text-xs text-slate-500 font-mono">{admin.id.split('-')[0]}…</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                    {new Date(admin.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isCurrentUser ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        You
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Active
                      </span>
                    )}
                    {isLastAdmin && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Last Admin
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleRemoveAdmin(admin)}
                      disabled={isCurrentUser || isLastAdmin}
                      title={
                        isLastAdmin
                          ? 'Cannot remove the last platform admin'
                          : isCurrentUser
                          ? 'You cannot remove yourself'
                          : `Remove ${admin.email} from platform admins`
                      }
                      className="inline-flex items-center text-rose-400 hover:text-rose-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
            {admins.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No platform admins found. This should not happen.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
