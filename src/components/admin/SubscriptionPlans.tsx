import React from 'react';
import { Check, Shield } from 'lucide-react';

export const SubscriptionPlans: React.FC = () => {
  const plans = [
    {
      name: 'Starter',
      price: '$299',
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
      name: 'Professional',
      price: '$899',
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
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      interval: '',
      description: 'Dedicated infrastructure for large-scale operations.',
      features: [
        'Custom Protocol Parsers',
        'Dedicated Instance & Database',
        'ERP/SAP Integrations',
        'SLA 99.99%',
        'Unlimited Data Retention',
      ],
      recommended: false,
    }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-slate-100">SaaS Subscription Plans</h1>
        <p className="text-slate-400 mt-2">Manage pricing tiers and module access limits.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
      
      <div className="mt-12 bg-slate-900 border border-slate-700 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between">
        <div className="flex items-center mb-4 sm:mb-0">
          <Shield className="w-8 h-8 text-indigo-400 mr-4" />
          <div>
            <h4 className="text-lg font-medium text-slate-100">Global Billing Settings</h4>
            <p className="text-sm text-slate-400">Configure tax rates, invoice templates, and payment gateways.</p>
          </div>
        </div>
        <button className="px-6 py-2 bg-slate-800 border border-slate-600 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors">
          Configure
        </button>
      </div>
    </div>
  );
};
