import React from 'react';
import { TaxProfile } from '../../../types';
import { Calculator } from 'lucide-react';

interface Props {
  data?: TaxProfile;
  onUpdate: (data: Partial<TaxProfile>) => void;
  isReadOnly?: boolean;
}

export const TaxProfileTab: React.FC<Props> = ({ data, onUpdate, isReadOnly }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center mb-6">
          <Calculator className="w-5 h-5 mr-2 text-indigo-500" />
          Profil Fiscal
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Numéro d'Identification Fiscale (NIF)
            </label>
            <input
              type="text"
              disabled={isReadOnly}
              value={data?.nif || ''}
              onChange={(e) => onUpdate({ nif: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              placeholder="15 chiffres..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Article d'Imposition
            </label>
            <input
              type="text"
              disabled={isReadOnly}
              value={data?.tax_article_number || ''}
              onChange={(e) => onUpdate({ tax_article_number: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Régime Fiscal
            </label>
            <select
              disabled={isReadOnly}
              value={data?.tax_regime || 'REAL'}
              onChange={(e) => onUpdate({ tax_regime: e.target.value as any })}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <option value="REAL">Régime du Réel</option>
              <option value="REAL_SIMPLIFIED">Régime du Réel Simplifié</option>
              <option value="IFU">Impôt Forfaitaire Unique (IFU)</option>
              <option value="SPECIAL">Régime Spécial</option>
              <option value="OTHER">Autre</option>
            </select>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6">
          <h4 className="text-md font-medium text-slate-900 dark:text-white mb-4">Assujettissement</h4>
          <div className="flex flex-col space-y-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                disabled={isReadOnly}
                checked={data?.vat_subject ?? true}
                onChange={(e) => onUpdate({ vat_subject: e.target.checked })}
                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-slate-700 dark:text-slate-300">Assujetti à la TVA</span>
            </label>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                disabled={isReadOnly}
                checked={data?.ibs_subject ?? true}
                onChange={(e) => onUpdate({ ibs_subject: e.target.checked })}
                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-slate-700 dark:text-slate-300">Assujetti à l'IBS</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
