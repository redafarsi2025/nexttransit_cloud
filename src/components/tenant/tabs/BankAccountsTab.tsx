import React, { useState } from 'react';
import { BankAccount } from '../../../types';
import { CreditCard, Plus, Trash2, CheckCircle, Star } from 'lucide-react';
import { TenantLegalIdentityService } from '../../../services/tenantLegalIdentityService';

interface Props {
  accounts: BankAccount[];
  tenantId?: string;
  onRefresh?: () => void;
  isReadOnly?: boolean;
}

export const BankAccountsTab: React.FC<Props> = ({ accounts, tenantId, onRefresh, isReadOnly }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<BankAccount>>({
    currency: 'DZD',
    is_primary: accounts.length === 0, // First account is primary by default
    status: 'ACTIVE'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setIsSubmitting(true);
    try {
      await TenantLegalIdentityService.addBankAccount({
        tenant_id: tenantId,
        bank_name: formData.bank_name!,
        account_number: formData.account_number,
        currency: formData.currency || 'DZD',
        is_primary: formData.is_primary || false,
        status: formData.status || 'ACTIVE'
      });
      setIsAdding(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error(error);
      alert('Erreur lors de l\'ajout du compte bancaire');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce compte bancaire ?')) return;
    try {
      await TenantLegalIdentityService.deleteBankAccount(id);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleSetPrimary = async (accountId: string) => {
    if (!tenantId) return;
    try {
      await TenantLegalIdentityService.setPrimaryBankAccount(tenantId, accountId);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la définition du compte principal');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
            <CreditCard className="w-5 h-5 mr-2 text-indigo-500" />
            Comptes Bancaires
          </h3>
          {!isReadOnly && !isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          )}
        </div>

        {isAdding && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nom de la Banque *</label>
                <input required type="text" placeholder="Ex: BEA, BNA, CPA..." value={formData.bank_name || ''} onChange={e => setFormData({...formData, bank_name: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Devise *</label>
                <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                  <option value="DZD">DZD (Dinar Algérien)</option>
                  <option value="EUR">EUR (Euro)</option>
                  <option value="USD">USD (Dollar US)</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Numéro de Compte (RIB/IBAN)</label>
                <input type="text" placeholder="RIB ou IBAN complet" value={formData.account_number || ''} onChange={e => setFormData({...formData, account_number: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 font-mono" />
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 font-medium cursor-pointer">Annuler</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 cursor-pointer">
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        )}

        {accounts.length === 0 ? (
          <p className="text-slate-500 text-sm py-4 text-center">Aucun compte bancaire enregistré.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map(a => (
              <div key={a.id} className={`p-4 border rounded-xl flex justify-between items-start group transition-colors ${a.is_primary ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-slate-900 dark:text-white">{a.bank_name}</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {a.currency}
                    </span>
                    {a.is_primary && (
                      <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                        <Star className="w-3 h-3 fill-indigo-700" /> Principal
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 mt-3">
                    {a.account_number && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 font-mono flex items-center gap-2">
                        <span className="text-xs text-slate-400">RIB/IBAN</span> {a.account_number}
                      </p>
                    )}
                  </div>
                </div>
                {!isReadOnly && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    {!a.is_primary && (
                      <button 
                        onClick={() => handleSetPrimary(a.id)} 
                        title="Définir comme principal"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(a.id)} 
                      title="Supprimer"
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
