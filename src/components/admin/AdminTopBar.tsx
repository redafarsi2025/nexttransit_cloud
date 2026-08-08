import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, ShieldAlert, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export const AdminTopBar: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 z-10 shrink-0 text-slate-100">
      <div className="flex items-center space-x-3 rtl:space-x-reverse">
        <div className="bg-red-500/20 p-2 rounded-lg border border-red-500/30">
          <ShieldAlert className="w-5 h-5 text-red-400" />
        </div>
        <h2 className="text-lg font-semibold tracking-wide">NextTransit SaaS Admin Control</h2>
      </div>

      <div className="flex items-center space-x-4 rtl:space-x-reverse">
        <div className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-1.5 bg-slate-800 rounded-full border border-slate-700">
          <User className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-300">
            {currentUser?.email || 'Super Admin'}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center group"
          title="Logout"
        >
          <LogOut className="w-5 h-5 group-hover:text-red-400 transition-colors" />
        </button>
      </div>
    </header>
  );
};
