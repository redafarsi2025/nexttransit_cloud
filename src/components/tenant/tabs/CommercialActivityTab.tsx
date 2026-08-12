import React from 'react';
import { CommercialRegistration, StatisticalProfile } from '../../../types';
import { Briefcase, BarChart } from 'lucide-react';

interface Props {
  rcData?: CommercialRegistration;
  nisData?: StatisticalProfile;
  onUpdateRC: (data: Partial<CommercialRegistration>) => void;
  onUpdateNIS: (data: Partial<StatisticalProfile>) => void;
  isReadOnly?: boolean;
}

export const CommercialActivityTab: React.FC<Props> = ({ rcData, nisData, onUpdateRC, onUpdateNIS, isReadOnly }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center mb-6">
          <Briefcase className="w-5 h-5 mr-2 text-indigo-500" />
          Registre de Commerce (RC)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Numéro de Registre de Commerce
            </label>
            <input
              type="text"
              disabled={isReadOnly}
              value={rcData?.rc_number || ''}
              onChange={(e) => onUpdateRC({ rc_number: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Date d'Immatriculation
            </label>
            <input
              type="date"
              disabled={isReadOnly}
              value={rcData?.rc_date || ''}
              onChange={(e) => onUpdateRC({ rc_date: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center mb-6">
          <BarChart className="w-5 h-5 mr-2 text-indigo-500" />
          Identification Statistique (NIS)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Numéro d'Identification Statistique (NIS)
            </label>
            <input
              type="text"
              disabled={isReadOnly}
              value={nisData?.nis || ''}
              onChange={(e) => onUpdateNIS({ nis: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
