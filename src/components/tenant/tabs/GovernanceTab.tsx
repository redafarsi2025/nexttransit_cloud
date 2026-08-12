import React, { useState } from 'react';
import { LegalRepresentative } from '../../../types';
import { Users, Plus, Trash2 } from 'lucide-react';
import { TenantLegalIdentityService } from '../../../services/tenantLegalIdentityService';

interface Props {
  representatives: LegalRepresentative[];
  tenantId?: string;
  onRefresh?: () => void;
  isReadOnly?: boolean;
}

export const GovernanceTab: React.FC<Props> = ({ representatives, tenantId, onRefresh, isReadOnly }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<LegalRepresentative>>({
    role: 'GERANT',
    is_current: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setIsSubmitting(true);
    try {
      await TenantLegalIdentityService.addLegalRepresentative({
        tenant_id: tenantId,
        full_name: formData.full_name!,
        role: formData.role as any,
        start_date: formData.start_date,
        is_current: formData.is_current || true
      });
      setIsAdding(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error(error);
      alert('Erreur lors de l\'ajout du représentant');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce représentant ?')) return;
    try {
      await TenantLegalIdentityService.deleteLegalRepresentative(id);
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
            <Users className="w-5 h-5 mr-2 text-indigo-500" />
            Représentants Légaux
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nom Complet *</label>
                <input required type="text" value={formData.full_name || ''} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fonction *</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                  <option value="GERANT">Gérant</option>
                  <option value="DIRECTOR_GENERAL">Directeur Général (DG)</option>
                  <option value="PRESIDENT">Président (PDG)</option>
                  <option value="ADMINISTRATOR">Administrateur</option>
                  <option value="LEGAL_REPRESENTATIVE">Représentant Légal</option>
                  <option value="OTHER">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Date de début</label>
                <input type="date" value={formData.start_date || ''} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div className="flex items-center mt-6">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={formData.is_current} onChange={e => setFormData({...formData, is_current: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500" />
                  Mandat en cours
                </label>
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

        {representatives.length === 0 ? (
          <p className="text-slate-500 text-sm py-4 text-center">Aucun représentant légal enregistré.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {representatives.map(r => (
              <div key={r.id} className={`p-4 border rounded-xl flex justify-between items-start group transition-colors ${r.is_current ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-75'}`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-900 dark:text-white">{r.full_name}</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {r.role}
                    </span>
                    {!r.is_current && (
                      <span className="text-[10px] uppercase font-bold tracking-wider bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-200">
                        Ancien
                      </span>
                    )}
                  </div>
                  {r.start_date && (
                    <p className="text-sm text-slate-500 mt-2">
                      <span className="font-medium">Depuis :</span> {new Date(r.start_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {!isReadOnly && (
                  <button 
                    onClick={() => handleDelete(r.id)} 
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
