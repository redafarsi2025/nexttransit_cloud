import React, { useState, useEffect } from 'react';
import { Mail, Send, Trash2, CheckCircle, Clock, Shield, AlertCircle, RefreshCw, Copy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { useLocalization } from '../../context/LocalizationContext';
import { Invitation, Role } from '../../types';
import { createInvitation, listPendingInvitations, revokeInvitation } from '../../services/invitationService';

const INVITAIBLE_ROLES: { role: Role; label: string; desc: string }[] = [
  { role: 'DIRECTOR', label: 'Director', desc: 'Executive KPIs, budget approvals, strategic decisions' },
  { role: 'FLEET_MANAGER', label: 'Fleet Manager', desc: 'Vehicle assignment, dispatch, conflict alerts' },
  { role: 'MAINTENANCE_MANAGER', label: 'Maintenance Manager', desc: 'Atelier planning, work order queue & diagnostics' },
  { role: 'FINANCE', label: 'Finance Controller', desc: 'Budget vs Actual variance, labor costs, audit' },
  { role: 'OPERATIONS', label: 'Operations Controller', desc: 'Inventory, stock buffers, supplier requisitions' },
  { role: 'MECHANIC', label: 'Mechanic', desc: 'Mobile task queue, OBD scans, repair execution' },
  { role: 'DRIVER', label: 'Driver', desc: 'Pre-trip inspections, incident reporting' },
];

export const InvitationsScreen: React.FC = () => {
  const { currentRole, userProfile } = useAuth();
  const { activeTenantId } = useTenant();
  const { t } = useLocalization();

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<Role>('FLEET_MANAGER');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; token?: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadInvitations = async () => {
    setLoading(true);
    try {
      const list = await listPendingInvitations(activeTenantId);
      setInvitations(list);
    } catch (err) {
      console.error('Error fetching invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvitations();
  }, [activeTenantId]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setFeedback({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const newInv = await createInvitation({
        tenantId: activeTenantId,
        companyId: userProfile?.company_id || 'cmp-default',
        email,
        role: selectedRole,
        invitedBy: userProfile?.id || 'usr-admin',
        invitedByRole: currentRole,
      });

      setFeedback({
        type: 'success',
        message: `Invitation successfully issued to ${email} as ${selectedRole}.`,
        token: newInv.token,
      });
      setEmail('');
      await loadInvitations();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to send invitation.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Are you sure you want to revoke this invitation?')) return;
    try {
      await revokeInvitation(id, userProfile?.id || 'usr-admin', currentRole, activeTenantId);
      await loadInvitations();
      setFeedback({ type: 'success', message: 'Invitation revoked successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to revoke invitation.' });
    }
  };

  const copyToClipboard = (token: string) => {
    const inviteLink = `${window.location.origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4 px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Mail className="w-6 h-6 text-indigo-600" />
            User Invitations & RBAC Provisioning
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Invite users to your tenant workspace with strict role-based access control.
          </p>
        </div>
        <button
          onClick={loadInvitations}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-sm font-medium transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh List
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
            feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
          <div className="flex-1">
            <p className="font-semibold">{feedback.message}</p>
            {feedback.token && (
              <div className="mt-2 text-xs flex items-center gap-2 bg-white/80 p-2 rounded border border-green-300">
                <span className="font-mono text-slate-700 select-all">Token: {feedback.token}</span>
                <button
                  onClick={() => copyToClipboard(feedback.token!)}
                  className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedToken === feedback.token ? 'Copied Link!' : 'Copy Invite Link'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grid: Send Invitation Form + Pending Invitations List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Send className="w-5 h-5 text-indigo-600" />
            Send New Invitation
          </h2>

          <form onSubmit={handleSendInvite} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Invitee Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Operational Role *</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as Role)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {INVITAIBLE_ROLES.map((r) => (
                  <option key={r.role} value={r.role}>
                    {r.label} ({r.role})
                  </option>
                ))}
                {currentRole === 'SUPER_ADMIN' && (
                  <option value="SUPER_ADMIN">Super Admin (SUPER_ADMIN)</option>
                )}
              </select>
              <p className="text-xs text-slate-500 mt-1.5">
                {INVITAIBLE_ROLES.find((r) => r.role === selectedRole)?.desc || 'Full platform administration'}
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Issuing Token...' : 'Send Invitation'}
            </button>
          </form>
        </div>

        {/* Pending List Column */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            Pending Invitations ({invitations.length})
          </h2>

          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm">Loading invitations...</div>
          ) : invitations.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">No pending invitations</p>
              <p className="text-xs text-slate-500">Invitations sent to colleagues will appear here until accepted.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {invitations.map((inv) => (
                <div key={inv.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">{inv.email}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700">
                        {inv.role}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3">
                      <span>Token: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700">{inv.token}</code></span>
                      <span>Expires: {new Date(inv.expires_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(inv.token)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedToken === inv.token ? 'Copied Link' : 'Copy Link'}
                    </button>
                    <button
                      onClick={() => handleRevoke(inv.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
