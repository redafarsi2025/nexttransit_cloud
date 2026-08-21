import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { AuthModal } from './AuthModal';

export const DemoBanner: React.FC = () => {
  const { isDemoMode, exitDemoMode } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (!isDemoMode) return null;

  return (
    <>
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-3 text-xs border-b border-indigo-700/50 relative z-40">
        <div className="flex items-center gap-2 font-medium">
          <span className="flex h-6 px-2 items-center justify-center rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 text-[11px] font-bold tracking-wide uppercase">
            <Sparkles className="w-3 h-3 mr-1 text-amber-300 animate-pulse" />
            Mode Démo Numilog
          </span>
          <span className="text-slate-200">
            Vous explorez le SaaS avec un compte de démonstration partagé. Les actions sont simulées localement (rien n’est enregistré) et les données affichées sont réinitialisées toutes les 45 minutes.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAuthModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 transition-colors shadow-xs cursor-pointer"
          >
            <span>Créer un compte Enterprise</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={exitDemoMode}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
          >
            Quitter
          </button>
        </div>
      </div>

      {showAuthModal && (
        <AuthModal
          initialTab="register"
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </>
  );
};
