import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, Settings, Terminal, Activity, ArrowLeft, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminSidebar: React.FC = () => {
  const { currentRole } = useAuth();
  
  const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Overview', exact: true },
    { to: '/admin/tenants', icon: Users, label: 'Tenants & Workspaces' },
    { to: '/admin/users', icon: Users, label: 'Global Users' },
    { to: '/admin/billing', icon: CreditCard, label: 'Subscription Plans' },
    { to: '/admin/admins', icon: Shield, label: 'Platform Admins' },
    { to: '/admin/system', icon: Activity, label: 'System Health' },
    { to: '/admin/audit', icon: Activity, label: 'Audit Logs' },
    { to: '/admin/settings', icon: Settings, label: 'Global Config' },
  ];

  return (
    <aside className="w-64 h-screen bg-slate-950 border-r border-slate-800 flex flex-col shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-slate-800 shrink-0">
        <Terminal className="w-6 h-6 text-indigo-500 mr-3" />
        <span className="text-xl font-bold tracking-wider text-slate-100">PLATFORM</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-500/10 text-indigo-400'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`
            }
          >
            <item.icon className="w-5 h-5 mr-3 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <NavLink
          to="/dashboard"
          className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-3 shrink-0" />
          Exit to Main App
        </NavLink>
      </div>
    </aside>
  );
};
