import React from 'react';
import { TenantCore } from '../../../types';
import { Building2, Globe, Mail, Phone, MapPin } from 'lucide-react';

interface Props {
  data: TenantCore;
  onUpdate: (data: Partial<TenantCore>) => void;
  isReadOnly?: boolean;
}

export const CompanyIdentityTab: React.FC<Props> = ({ data, onUpdate, isReadOnly }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center mb-6">
          <Building2 className="w-5 h-5 mr-2 text-indigo-500" />
          Identité Légale & Commerciale
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Dénomination Sociale (Raison Sociale)
            </label>
            <input
              type="text"
              disabled={isReadOnly}
              value={data.legal_name || ''}
              onChange={(e) => onUpdate({ legal_name: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              placeholder="Ex: EURL NEXT TRANSIT LOGISTICS"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nom Commercial
            </label>
            <input
              type="text"
              disabled={isReadOnly}
              value={data.trade_name || ''}
              onChange={(e) => onUpdate({ trade_name: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Forme Juridique
            </label>
            <select
              disabled={isReadOnly}
              value={data.legal_form || ''}
              onChange={(e) => onUpdate({ legal_form: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <option value="">Sélectionner...</option>
              <option value="EURL">EURL</option>
              <option value="SARL">SARL</option>
              <option value="SPA">SPA</option>
              <option value="SNC">SNC</option>
              <option value="SCS">SCS</option>
              <option value="PERSONNE_PHYSIQUE">Personne Physique</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Capital Social (DA)
            </label>
            <input
              type="number"
              disabled={isReadOnly}
              value={data.capital_social || ''}
              onChange={(e) => onUpdate({ capital_social: Number(e.target.value) })}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Date de Création
            </label>
            <input
              type="date"
              disabled={isReadOnly}
              value={data.date_creation || ''}
              onChange={(e) => onUpdate({ date_creation: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Date de Début d'Activité
            </label>
            <input
              type="date"
              disabled={isReadOnly}
              value={data.date_activity_start || ''}
              onChange={(e) => onUpdate({ date_activity_start: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
