import React, { useState } from 'react';
import { SocialSecurityProfile } from '../../../types';
import { ShieldCheck, Plus, Trash2 } from 'lucide-react';
import { TenantLegalIdentityService } from '../../../services/tenantLegalIdentityService';

interface Props {
  profiles: SocialSecurityProfile[];
  tenantId?: string;
  onRefresh?: () => void;
  isReadOnly?: boolean;
}

export const SocialSecurityTab: React.FC<Props> = ({ profiles, tenantId, onRefresh, isReadOnly }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<SocialSecurityProfile>>({
    institution: 'CNAS',
    status: 'ACTIVE'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setIsSubmitting(true);
    try {
      await TenantLegalIdentityService.addSocialSecurityProfile({
        tenant_id: tenantId,
        institution: formData.institution as 'CNAS' | 'CASNOS',
        employer_number: formData.employer_number,
        registration_number: formData.registration_number,
        affiliation_center: formData.affiliation_center,
        affiliation_date: formData.affiliation_date,
        status: formData.status
      });
      setIsAdding(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error(error);
      alert('Erreur lors de l\'ajout du profil de sécurité sociale');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette affiliation ?')) return;
    try {
      await TenantLegalIdentityService.deleteSocialSecurityProfile(id);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
            <ShieldCheck className="w-5 h-5 mr-2 text-indigo-500" />
            Sécurité Sociale (CNAS / CASNOS)
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Institution *</label>
                <select value={formData.institution} onChange={e => setFormData({...formData, institution: e.target.value as any})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                  <option value="CNAS">CNAS (Salariés)</option>
                  <option value="CASNOS">CASNOS (Non-Salariés)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">N° Employeur *</label>
                <input required type="text" placeholder="Ex: 16123456" value={formData.employer_number || ''} onChange={e => setFormData({...formData, employer_number: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Centre d'Affiliation</label>
                <input type="text" placeholder="Ex: Agence Alger Centre" value={formData.affiliation_center || ''} onChange={e => setFormData({...formData, affiliation_center: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Date d'affiliation</label>
                <input type="date" value={formData.affiliation_date || ''} onChange={e => setFormData({...formData, affiliation_date: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
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

        {profiles.length === 0 ? (
          <p className="text-slate-500 text-sm py-4 text-center">Aucun profil de sécurité sociale enregistré.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profiles.map(p => (
              <div key={p.id} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex justify-between items-start group">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-slate-900 dark:text-white">{p.institution}</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-200">
                      Affilié
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      <span className="font-medium">N° Employeur :</span> {p.employer_number}
                    </p>
                    {p.affiliation_center && (
                      <p className="text-sm text-slate-500">
                        <span className="font-medium">Centre :</span> {p.affiliation_center}
                      </p>
                    )}
                  </div>
                </div>
                {!isReadOnly && (
                  <button 
                    onClick={() => handleDelete(p.id)} 
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
