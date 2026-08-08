import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, ShieldCheck, AlertTriangle, RefreshCw, Zap, Building, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { useLocalization } from '../../context/LocalizationContext';
import { Subscription } from '../../types';
import { getSubscriptionStatus, updateSubscriptionStatus } from '../../services/subscriptionService';

export const BillingScreen: React.FC = () => {
  const { userProfile } = useAuth();
  const { activeTenant } = useTenant();
  const { t } = useLocalization();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadSubscription = async () => {
    setLoading(true);
    try {
      if (userProfile?.company_id) {
        const sub = await getSubscriptionStatus(userProfile.company_id);
        setSubscription(sub);
      }
    } catch (e) {
      console.error('Error loading subscription status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
  }, [userProfile?.company_id]);

  const handleSimulatePlanChange = async (status: 'trial' | 'active' | 'past_due' | 'cancelled', plan: 'enterprise_trial' | 'professional' | 'enterprise') => {
    if (!userProfile?.company_id) return;
    setUpdating(true);
    setFeedback(null);
    try {
      const updated = await updateSubscriptionStatus(userProfile.company_id, status, plan);
      setSubscription(updated);
      setFeedback(`Subscription plan updated to ${plan.toUpperCase()} (${status.toUpperCase()}).`);
    } catch (err: any) {
      setFeedback(`Failed to update subscription: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const statusColors = {
    trial: 'bg-blue-100 text-blue-800 border-blue-200',
    active: 'bg-green-100 text-green-800 border-green-200',
    past_due: 'bg-amber-100 text-amber-800 border-amber-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-4 px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-indigo-600" />
            Billing & Subscription Management
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Super Admin billing controls, subscription tier status, and multi-tenant plan management.
          </p>
        </div>
        <button
          onClick={loadSubscription}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-sm font-medium transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </div>

      {feedback && (
        <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-indigo-600" />
          {feedback}
        </div>
      )}

      {/* Subscription Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase text-indigo-600 tracking-wider">Current SaaS Plan</span>
            <h2 className="text-2xl font-bold text-slate-900 capitalize">
              {subscription?.plan.replace('_', ' ') || 'Enterprise Trial'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Building className="w-3.5 h-3.5" />
              <span>Company ID: {userProfile?.company_id || 'cmp-default'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase border ${
                statusColors[subscription?.status || 'trial']
              }`}
            >
              Status: {subscription?.status || 'trial'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-sm">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block">Renews / Expires On</span>
            <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-1">
              <Calendar className="w-4 h-4 text-indigo-600" />
              {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'N/A'}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block">Active Workspace</span>
            <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-1">
              <Building className="w-4 h-4 text-indigo-600" />
              {activeTenant.societyName || 'NextTransit Main'}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block">Billing Contact</span>
            <span className="font-semibold text-slate-800 truncate block mt-1">
              {userProfile?.email || 'admin@nexttransit.com'}
            </span>
          </div>
        </div>
      </div>

      {/* Plan Tiers & Management */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Manage Enterprise Subscription Tier</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Trial */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h4 className="font-bold text-slate-900 text-lg">Enterprise Trial</h4>
              <p className="text-xs text-slate-500 mt-1">30-day evaluation tier with full decision engine access.</p>
              <div className="mt-4 text-2xl font-bold text-slate-900">Free <span className="text-xs font-normal text-slate-500">/ 30 days</span></div>
            </div>
            <button
              onClick={() => handleSimulatePlanChange('trial', 'enterprise_trial')}
              disabled={updating || subscription?.plan === 'enterprise_trial'}
              className="w-full py-2 px-4 rounded-xl border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {subscription?.plan === 'enterprise_trial' ? 'Current Plan' : 'Switch to Trial'}
            </button>
          </div>

          {/* Professional */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h4 className="font-bold text-slate-900 text-lg">Professional Fleet</h4>
              <p className="text-xs text-slate-500 mt-1">Up to 50 vehicles, R1-R7 rules, warranty & fuel logs.</p>
              <div className="mt-4 text-2xl font-bold text-slate-900">$499 <span className="text-xs font-normal text-slate-500">/ month</span></div>
            </div>
            <button
              onClick={() => handleSimulatePlanChange('active', 'professional')}
              disabled={updating || subscription?.plan === 'professional'}
              className="w-full py-2 px-4 rounded-xl bg-indigo-600 text-white font-medium text-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {subscription?.plan === 'professional' ? 'Current Plan' : 'Upgrade to Professional'}
            </button>
          </div>

          {/* Enterprise */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white border border-indigo-900 rounded-2xl p-6 shadow-md flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-lg text-white">Sovereign Enterprise</h4>
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-xs text-indigo-200 mt-1">Unlimited heavy trucks, multi-tenant site isolation, VPS Algeria on-prem deployment.</p>
              <div className="mt-4 text-2xl font-bold text-white">Custom <span className="text-xs font-normal text-indigo-300">/ annual</span></div>
            </div>
            <button
              onClick={() => handleSimulatePlanChange('active', 'enterprise')}
              disabled={updating || subscription?.plan === 'enterprise'}
              className="w-full py-2 px-4 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {subscription?.plan === 'enterprise' ? 'Current Plan' : 'Activate Enterprise'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
