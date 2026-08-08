import React, { useState } from 'react';
import { useFleet } from '../../context/FleetContext';
import { useLocalization } from '../../context/LocalizationContext';
import { PMSchedule, VehiclePMStatus } from '../../types';
import {
  Calendar,
  Clock,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Wrench,
  Sparkles,
  Search,
  Truck,
  Filter,
} from 'lucide-react';

export const PMSchedulesView: React.FC = () => {
  const { vehicles, pmSchedules, createWorkOrder, addPMSchedule } = useFleet();
  const { t } = useLocalization();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [dispatchedMessage, setDispatchedMessage] = useState<string | null>(null);

  // New PM Schedule Form State
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<PMSchedule['system_category']>('Engine');
  const [newTriggerType, setNewTriggerType] = useState<PMSchedule['trigger_type']>('km');
  const [newInterval, setNewInterval] = useState<number>(15000);
  const [newLaborHours, setNewLaborHours] = useState<number>(2.5);

  // Calculate PM Statuses for all vehicles across all schedules
  const vehiclePMStatuses: VehiclePMStatus[] = [];

  vehicles.forEach((v) => {
    pmSchedules.forEach((sch) => {
      if (
        sch.applicable_classifications.includes(v.classification) ||
        sch.applicable_classifications.length === 0
      ) {
        let lastKm = v.mileage - Math.floor(v.mileage % sch.interval_value) - 2000;
        if (lastKm < 0) lastKm = 0;

        let kmRemaining = sch.interval_value - (v.mileage - lastKm);
        let status: 'Overdue' | 'Due Soon' | 'Ok' = 'Ok';

        if (kmRemaining <= 0) {
          status = 'Overdue';
        } else if (kmRemaining <= 2000) {
          status = 'Due Soon';
        }

        vehiclePMStatuses.push({
          vehicle_id: v.id,
          vehicle_plate: v.plate,
          pm_schedule_id: sch.id,
          pm_title: sch.title,
          last_performed_mileage: lastKm,
          last_performed_date: '2026-04-12',
          next_due_mileage: lastKm + sch.interval_value,
          next_due_date: '2026-08-20',
          km_remaining: kmRemaining,
          days_remaining: Math.max(1, Math.floor(kmRemaining / 150)),
          status,
        });
      }
    });
  });

  const filteredStatuses = vehiclePMStatuses.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.status === selectedCategory;
    const matchesSearch =
      item.vehicle_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.pm_title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const overdueCount = vehiclePMStatuses.filter((s) => s.status === 'Overdue').length;
  const dueSoonCount = vehiclePMStatuses.filter((s) => s.status === 'Due Soon').length;
  const okCount = vehiclePMStatuses.filter((s) => s.status === 'Ok').length;

  const handleDispatchAllOverdue = async () => {
    const targetStatuses = vehiclePMStatuses.filter(
      (s) => s.status === 'Overdue' || s.status === 'Due Soon'
    );
    if (targetStatuses.length === 0) return;

    let count = 0;
    for (const item of targetStatuses) {
      const sch = pmSchedules.find((p) => p.id === item.pm_schedule_id);
      const partsToUse = sch
        ? sch.required_parts.map((p) => ({
            part_id: p.part_id,
            name: p.part_name,
            quantity: p.quantity,
            unit_cost: 95,
          }))
        : [];

      if (createWorkOrder) {
        await createWorkOrder({
          vehicle_id: item.vehicle_id,
          type: 'Preventive',
          assigned_mechanic_id: 'MEC-AUTO',
          assigned_mechanic_name: 'Chef d\'Atelier (PM Schedules Auto-Dispatch)',
          labor_hours: sch ? sch.estimated_labor_hours : 3,
          hourly_rate: 85,
          parts_used: partsToUse,
          before_notes: `DÉCLENCHEMENT PRÉVENTIF PROGRAMMÉ (Phase 3 PM Schedule) : ${item.pm_title}. Kilométrage restant: ${item.km_remaining} km. Réservation pièces R3 activée.`,
        });
        count++;
      }
    }

    setDispatchedMessage(
      `✅ ${count} Ordres de Travail Préventifs générés avec succès et pièces réservées en magasin (R3)!`
    );
    setTimeout(() => setDispatchedMessage(null), 6000);
  };

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    addPMSchedule({
      title: newTitle,
      system_category: newCategory,
      trigger_type: newTriggerType,
      interval_value: Number(newInterval),
      applicable_classifications: ['Keystone', 'Standard'],
      required_parts: [],
      estimated_labor_hours: Number(newLaborHours),
      active: true,
    });

    setNewTitle('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-900/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                Phase 3 • PM Schedules Engine
              </span>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Auto-Reservation R3 Active
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Calendrier & Intervalles de Maintenance Préventive
            </h1>
            <p className="text-xs text-indigo-200/80 mt-1 max-w-2xl">
              Génération automatique des ordres de travaux selon les seuils kilométriques, heures moteur et intervalles calendaires avant apparition de pannes OBD.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4 text-indigo-400" />
              Nouveau Programme PM
            </button>

            <button
              onClick={handleDispatchAllOverdue}
              disabled={overdueCount + dueSoonCount === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <Wrench className="w-4 h-4 text-white" />
              Générer WOs Préventifs ({overdueCount + dueSoonCount})
            </button>
          </div>
        </div>
      </div>

      {dispatchedMessage && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-emerald-200 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{dispatchedMessage}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Programmes PM Actifs</span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{pmSchedules.length}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Règles de révision configurées</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Échéance Dépassée (Overdue)</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-black text-red-600 mt-1">{overdueCount}</div>
          <p className="text-[11px] text-red-600 font-semibold mt-0.5">Intervention immédiate requise</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Échéance Imminente (&lt; 2,000 km)</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">{dueSoonCount}</div>
          <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Planifier en atelier cette semaine</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Conforme (Ok)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{okCount}</div>
          <p className="text-[11px] text-emerald-600 mt-0.5">Flotte sous tolérance nominale</p>
        </div>
      </div>

      {/* PM Schedule Rules Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600" /> Règles de Maintenance Préventive Configurées
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pmSchedules.map((sch) => (
            <div
              key={sch.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-indigo-50/30 hover:border-indigo-200 transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-mono text-[10px] font-bold uppercase">
                  {sch.system_category}
                </span>
                <span className="text-[11px] font-mono text-slate-500 font-bold">
                  {sch.trigger_type === 'km' ? `${sch.interval_value.toLocaleString()} km` : `${sch.interval_value} ${sch.trigger_type}`}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 leading-tight">{sch.title}</h4>
              <div className="text-[11px] text-slate-500 space-y-1">
                <div>Pièces requises : {sch.required_parts.length > 0 ? sch.required_parts.map((p) => p.part_name).join(', ') : 'Aucune (Inspection seule)'}</div>
                <div>Durée estimée : {sch.estimated_labor_hours} h</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vehicles PM Compliance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Truck className="w-4 h-4 text-indigo-600" /> Suivi de Conformité PM par Véhicule
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher immatriculation ou programme..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded-lg cursor-pointer ${selectedCategory === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'}`}
              >
                Tous ({vehiclePMStatuses.length})
              </button>
              <button
                onClick={() => setSelectedCategory('Overdue')}
                className={`px-3 py-1 rounded-lg cursor-pointer ${selectedCategory === 'Overdue' ? 'bg-red-500 text-white shadow-2xs' : 'hover:text-slate-900'}`}
              >
                Retard ({overdueCount})
              </button>
              <button
                onClick={() => setSelectedCategory('Due Soon')}
                className={`px-3 py-1 rounded-lg cursor-pointer ${selectedCategory === 'Due Soon' ? 'bg-amber-500 text-white shadow-2xs' : 'hover:text-slate-900'}`}
              >
                Imminent ({dueSoonCount})
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase font-black tracking-wider text-[10px]">
                <th className="py-3 px-4">Véhicule</th>
                <th className="py-3 px-4">Programme PM</th>
                <th className="py-3 px-4">Dernière Révision</th>
                <th className="py-3 px-4">Prochaine Échéance</th>
                <th className="py-3 px-4">Reste Avant Révision</th>
                <th className="py-3 px-4">Statut PM</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredStatuses.map((item, idx) => (
                <tr key={idx} className="hover:bg-indigo-50/20 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    {item.vehicle_plate}
                  </td>
                  <td className="py-3.5 px-4 text-slate-800 font-semibold">
                    {item.pm_title}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono">
                    {item.last_performed_mileage.toLocaleString()} km ({item.last_performed_date})
                  </td>
                  <td className="py-3.5 px-4 text-slate-900 font-mono font-bold">
                    {item.next_due_mileage.toLocaleString()} km ({item.next_due_date})
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold">
                    <span
                      className={
                        item.km_remaining <= 0
                          ? 'text-red-600'
                          : item.km_remaining <= 2000
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }
                    >
                      {item.km_remaining <= 0 ? `DÉPASSÉ de ${Math.abs(item.km_remaining).toLocaleString()} km` : `${item.km_remaining.toLocaleString()} km (${item.days_remaining}j)`}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {item.status === 'Overdue' && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-800 border border-red-200">
                        Overdue (Urgent)
                      </span>
                    )}
                    {item.status === 'Due Soon' && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
                        Due Soon
                      </span>
                    )}
                    {item.status === 'Ok' && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Conforme
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {(item.status === 'Overdue' || item.status === 'Due Soon') && (
                      <button
                        onClick={handleDispatchAllOverdue}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer shadow-2xs"
                      >
                        Générer WO
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create New PM Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" /> Nouveau Programme de Maintenance
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-4 text-xs font-medium text-slate-700">
              <div>
                <label className="block text-slate-800 font-bold mb-1">Titre de la révision préventive</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Vidange Pont Arrière & Pneumatiques (40,000 km)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-bold mb-1">Catégorie Système</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="Engine">Engine (Moteur)</option>
                    <option value="Brakes">Brakes (Freinage)</option>
                    <option value="Transmission">Transmission</option>
                    <option value="Electrical">Electrical (Électrique)</option>
                    <option value="Chassis & Tires">Chassis & Pneumatiques</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-1">Déclencheur</label>
                  <select
                    value={newTriggerType}
                    onChange={(e) => setNewTriggerType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="km">Kilométrage (km)</option>
                    <option value="hours">Heures Moteur (h)</option>
                    <option value="days">Jours Calendaires (j)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-bold mb-1">Intervalle de Récurrence</label>
                  <input
                    type="number"
                    required
                    value={newInterval}
                    onChange={(e) => setNewInterval(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-1">Durée Main d'Œuvre (h)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={newLaborHours}
                    onChange={(e) => setNewLaborHours(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer shadow-sm"
                >
                  Enregistrer le Programme
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
