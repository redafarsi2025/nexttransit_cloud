import React, { useState } from 'react';
import { Establishment } from '../../../types';
import { Building, Plus, Trash2, MapPin } from 'lucide-react';
import { TenantLegalIdentityService } from '../../../services/tenantLegalIdentityService';

interface Props {
  establishments: Establishment[];
  tenantId?: string;
  onRefresh?: () => void;
  isReadOnly?: boolean;
}

export const EstablishmentsTab: React.FC<Props> = ({ establishments, tenantId, onRefresh, isReadOnly }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<Establishment>>({
    type: 'AGENCY',
    is_head_office: false,
    is_operational: true,
  });

  const resetForm = () => {
    setFormData({ type: 'AGENCY', is_head_office: false, is_operational: true });
    setIsAdding(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setIsSubmitting(true);
    try {
      await TenantLegalIdentityService.addEstablishment({
        tenant_id: tenantId,
        name: formData.name!,
        type: formData.type as Establishment['type'],
        is_head_office: formData.is_head_office ?? false,
        is_operational: formData.is_operational ?? true,
        address_line_1: formData.address_line_1 || undefined,
        // Saisie texte libre — ne pas passer wilaya_id/commune_id (UUID FK)
        wilaya_name: formData.wilaya_name || undefined,
        commune_name: formData.commune_name || undefined,
      });
      resetForm();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error(error);
      alert('Erreur lors de l\'ajout de l\'établissement. Vérifiez la console pour les détails.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cet établissement ?')) return;
    try {
      await TenantLegalIdentityService.deleteEstablishment(id);
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
            <Building className="w-5 h-5 mr-2 text-indigo-500" />
            Établissements (Siège &amp; Antennes)
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nom de l'établissement *</label>
                <input
                  required
                  type="text"
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Type *</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as Establishment['type'] })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="HEAD_OFFICE">Siège Social</option>
                  <option value="AGENCY">Agence</option>
                  <option value="DEPOT">Dépôt</option>
                  <option value="WORKSHOP">Atelier de Maintenance</option>
                  <option value="LOGISTICS_BASE">Base Logistique</option>
                  <option value="OTHER">Autre</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Adresse</label>
                <input
                  type="text"
                  placeholder="N° et rue..."
                  value={formData.address_line_1 || ''}
                  onChange={e => setFormData({ ...formData, address_line_1: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Wilaya</label>
                <input
                  type="text"
                  placeholder="Ex: 16 - Alger"
                  value={formData.wilaya_name || ''}
                  onChange={e => setFormData({ ...formData, wilaya_name: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Commune</label>
                <input
                  type="text"
                  placeholder="Ex: Rouiba"
                  value={formData.commune_name || ''}
                  onChange={e => setFormData({ ...formData, commune_name: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_head_office ?? false}
                    onChange={e => setFormData({ ...formData, is_head_office: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Siège Social
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_operational ?? true}
                    onChange={e => setFormData({ ...formData, is_operational: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Opérationnel
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={resetForm} className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 font-medium cursor-pointer">Annuler</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 cursor-pointer">
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        )}

        {establishments.length === 0 ? (
          <p className="text-slate-500 text-sm py-4 text-center">Aucun établissement enregistré.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {establishments.map(e => (
              <div key={e.id} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex justify-between items-start group">
                <div>
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <span className="font-bold text-slate-900 dark:text-white">{e.name}</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {e.type}
                    </span>
                    {e.is_head_office && (
                      <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-200">
                        Siège
                      </span>
                    )}
                    {!e.is_operational && (
                      <span className="text-[10px] uppercase font-bold tracking-wider bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-200">
                        Inactif
                      </span>
                    )}
                  </div>
                  {(e.address_line_1 || e.wilaya_name || e.commune_name || e.wilaya_id || e.commune_id) && (
                    <div className="flex items-center text-xs text-slate-500 mt-2">
                      <MapPin className="w-3 h-3 mr-1 shrink-0" />
                      {[e.address_line_1, e.commune_name || e.commune_id, e.wilaya_name || e.wilaya_id].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
                {!isReadOnly && (
                  <button
                    onClick={() => handleDelete(e.id)}
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

