import React, { useEffect, useState } from 'react';
import { adminApiService } from '../../services/adminApiService';
import { Check, Shield, AlertTriangle, RefreshCw, Edit2 } from 'lucide-react';

export const SubscriptionPlans: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    let isMounted = true;
    const fetchSubscriptions = async () => {
      try {
        setLoading(true);
        const res = await adminApiService.getAllSubscriptions(page, limit);
        if (isMounted) {
          setSubscriptions(res.data || []);
          setTotal(res.total || 0);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load subscriptions');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchSubscriptions();
    return () => { isMounted = false; };
  }, [page]);

  const handleExtendTrial = async (id: string) => {
    const daysStr = window.prompt('How many days to extend the trial?', '30');
    const days = parseInt(daysStr || '', 10);
    if (!days || isNaN(days)) return;

    try {
      await adminApiService.extendTrial(id, days);
      const res = await adminApiService.getAllSubscriptions(page, limit);
      setSubscriptions(res.data || []);
    } catch (e: any) {
      alert(e.message || 'Failed to extend trial');
    }
  };

  const handleChangePlan = async (id: string, currentPlan: string) => {
    const plan = window.prompt('Enter new plan (enterprise_trial, professional, enterprise):', currentPlan);
    if (!plan || plan === currentPlan) return;

    try {
      await adminApiService.changeSubscriptionPlan(id, plan);
      const res = await adminApiService.getAllSubscriptions(page, limit);
      setSubscriptions(res.data || []);
    } catch (e: any) {
      alert(e.message || 'Failed to change plan');
    }
  };

  const plans = [
    {
      name: 'Starter / Pro',
      price: '15,000 DZD',
      interval: '/month',
      description: 'For small fleets up to 50 vehicles.',
      features: [
        'Basic Telemetry (OBD-II)',
        'Standard Maintenance Queue',
        'Email Support',
        '30-day Data Retention',
      ],
      recommended: false,
    },
    {
      name: 'Enterprise',
      price: '50,000 DZD',
      interval: '/month',
      description: 'Advanced features for growing enterprise fleets.',
      features: [
        'Advanced Telemetry (J1939 CAN)',
        'Predictive Maintenance AI',
        'Inventory & Parts Management',
        '24/7 Priority Support',
        '1-year Data Retention',
      ],
      recommended: true,
    }
  ];

  return (
    <div className="space-y-12 max-w-7xl mx-auto">
      
      {/* SECTION 1: Subscription Plans */}
      <div>
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-100">SaaS Subscription Plans</h1>
          <p className="text-slate-400 mt-2">Manage pricing tiers and module access limits.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div 
              key={plan.name} 
              className={`relative bg-slate-800 rounded-2xl border p-8 flex flex-col ${
                plan.recommended 
                  ? 'border-indigo-500 shadow-lg shadow-indigo-500/10' 
                  : 'border-slate-700 shadow-sm'
              }`}
            >
              {plan.recommended && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 bg-indigo-500 text-white text-xs font-bold rounded-full uppercase tracking-wide">
                  Most Popular
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-slate-100">{plan.name}</h3>
                <div className="mt-4 flex items-baseline text-slate-100">
                  <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                  <span className="ml-1 text-xl font-semibold text-slate-400">{plan.interval}</span>
                </div>
                <p className="mt-4 text-sm text-slate-400">{plan.description}</p>
              </div>
              
              <ul className="flex-1 space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <div className="shrink-0 mt-1">
                      <Check className="h-5 w-5 text-emerald-400" />
                    </div>
                    <p className="ml-3 text-sm text-slate-300">{feature}</p>
                  </li>
                ))}
              </ul>
              
              <button className={`w-full py-3 px-4 rounded-xl font-medium transition-colors ${
                plan.recommended
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
              }`}>
                Edit Tier Limits
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: Tenant Subscriptions */}
      <div className="pt-8 border-t border-slate-700">
        <h2 className="text-2xl font-bold text-slate-100 mb-6">Tenant Subscriptions</h2>
        
        {error && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-lg flex items-start">
            <AlertTriangle className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold">Error Loading Subscriptions</h3>
              <p className="mt-1 text-sm opacity-90">{error}</p>
            </div>
          </div>
        )}

        {loading && subscriptions.length === 0 ? (
          <div className="text-slate-400">Loading subscriptions...</div>
        ) : (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Tenant</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Period End</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {subscriptions.map((sub) => {
                  const endDate = new Date(sub.current_period_end);
                  const isExpiringSoon = sub.status === 'trial' && (endDate.getTime() - Date.now() < 7 * 24 * 3600 * 1000);
                  const isPastDue = sub.status === 'past_due' || endDate.getTime() < Date.now();

                  return (
                    <tr key={sub.id} className="hover:bg-slate-750 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-200">{sub.tenants?.name || 'Unknown'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-300 uppercase">{sub.plan}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          isPastDue ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm ${isPastDue ? 'text-rose-400' : isExpiringSoon ? 'text-amber-400' : 'text-slate-300'}`}>
                            {endDate.toLocaleDateString()}
                          </span>
                          {isExpiringSoon && (
                            <span title="Expiring within 7 days">
                              <AlertTriangle className="w-4 h-4 text-amber-400" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                        <button 
                          onClick={() => handleChangePlan(sub.id, sub.plan)}
                          className="text-indigo-400 hover:text-indigo-300"
                          title="Change Plan"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {sub.status === 'trial' && (
                          <button 
                            onClick={() => handleExtendTrial(sub.id)}
                            className="text-emerald-400 hover:text-emerald-300"
                            title="Extend Trial"
                          >
                            <RefreshCw className="w-4 h-4" />
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
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} subscriptions
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
        )}
      </div>

    </div>
  );
};
