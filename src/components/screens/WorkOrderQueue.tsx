import React, { useState } from 'react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useLocalization } from '../../context/LocalizationContext';
import { KPIBadge } from '../common/KPIBadge';
import {
  Wrench,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  UserCheck,
  DollarSign,
  PackageCheck,
  X,
  ChevronRight,
} from 'lucide-react';

export const WorkOrderQueue: React.FC = () => {
  const { workOrders, vehicles, inventory, createWorkOrder, closeWorkOrder, setSelectedVehicleId } = useFleet();
  const { currentRole } = useAuth();
  const { t } = useLocalization();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [closingOrderId, setClosingOrderId] = useState<string | null>(null);
  const [afterNotesInput, setAfterNotesInput] = useState<string>('');

  // Form state for creating work order
  const [newVehicleId, setNewVehicleId] = useState<string>(vehicles[0]?.id || '');
  const [newType, setNewType] = useState<'Corrective' | 'Preventive' | 'Inspection' | 'Investigation'>('Corrective');
  const [newLaborHours, setNewLaborHours] = useState<number>(4);
  const [newHourlyRate, setNewHourlyRate] = useState<number>(140);
  const [newBeforeNotes, setNewBeforeNotes] = useState<string>('');
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [selectedPartQty, setSelectedPartQty] = useState<number>(1);
  const [selectedPartsList, setSelectedPartsList] = useState<{ part_id: string; name: string; quantity: number; unit_cost: number }[]>([]);

  const handleAddPartToForm = () => {
    if (!selectedPartId) return;
    const part = inventory.find((p) => p.id === selectedPartId);
    if (!part) return;

    setSelectedPartsList((prev) => [
      ...prev.filter((p) => p.part_id !== selectedPartId),
      {
        part_id: part.id,
        name: part.name,
        quantity: selectedPartQty,
        unit_cost: part.unit_cost,
      },
    ]);
    setSelectedPartId('');
    setSelectedPartQty(1);
  };

  const handleRemovePartFromForm = (partId: string) => {
    setSelectedPartsList((prev) => prev.filter((p) => p.part_id !== partId));
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const vehicle = vehicles.find((v) => v.id === newVehicleId);
    if (!vehicle) return;

    const activeFault = vehicle.active_fault_codes[0]?.code;

    createWorkOrder({
      vehicle_id: newVehicleId,
      type: newType,
      parts_used: selectedPartsList,
      labor_hours: newLaborHours,
      hourly_rate: newHourlyRate,
      before_notes: newBeforeNotes || `Initiated ${newType} intervention on ${vehicle.plate}.`,
      assigned_mechanic_id: 'M-01',
      assigned_mechanic_name: 'David Thorne (Workshop Technician)',
      related_fault_code: activeFault,
    });

    setIsCreateModalOpen(false);
    setSelectedPartsList([]);
    setNewBeforeNotes('');
  };

  const handleCloseOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingOrderId) return;
    closeWorkOrder(closingOrderId, afterNotesInput);
    setClosingOrderId(null);
    setAfterNotesInput('');
  };

  const filteredOrders = workOrders.filter((wo) => {
    if (statusFilter !== 'ALL' && wo.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Wrench className="h-4 w-4" /> {t('wo.header_tag', {}, 'Technical Controller & Workshop Queue')}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t('wo.header_title', {}, 'Maintenance Work Order Interventions')}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {t('wo.header_desc', {}, 'Rule R1 & R3 synchronized repairs: closing work orders automatically deducts inventory and restores vehicle health.')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <KPIBadge type="Calculated" formula="Labor Cost + Parts Cost = Total Repair Cost" />
          {(currentRole === 'MAINTENANCE_MANAGER' ||
            currentRole === 'FLEET_MANAGER' ||
            currentRole === 'MECHANIC' ||
            currentRole === 'SUPER_ADMIN' ||
            currentRole === 'DIRECTOR') && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl shadow-xs hover:bg-indigo-700 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{t('wo.new_wo', {}, 'Create Work Order')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex items-center gap-2">
        {['ALL', 'Open', 'In Progress', 'Pending Parts', 'Closed'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === st
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {st === 'ALL' ? `All Orders (${workOrders.length})` : st}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredOrders.map((order) => {
          const partsCost = order.parts_used.reduce((sum, p) => sum + p.quantity * p.unit_cost, 0);
          const totalCost = order.labor_cost + partsCost;

          return (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 hover:border-indigo-300 transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-slate-900">{order.id}</span>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {order.vehicle_plate}
                    </span>
                    {order.warranty_risk && (
                      <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded inline-flex items-center gap-1" title={t('warranty.risk_tooltip', {}, 'Proposed action risks voiding manufacturer warranty')}>
                        <AlertTriangle className="h-3 w-3" />
                        {t('warranty.risk_badge', {}, 'Warranty Risk')}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-500 mt-0.5 block">
                    Type: {order.type} Intervention
                  </span>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    order.status === 'Closed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : order.status === 'In Progress'
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {order.status}
                </span>
              </div>

              {/* Labor & Parts Cost Grid */}
              <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Labor</span>
                  <span className="font-bold text-slate-800">
                    {order.labor_hours} hrs @ ${order.hourly_rate}/hr (${order.labor_cost})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Parts</span>
                  <span className="font-bold text-slate-800">${partsCost}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Cost</span>
                  <span className="font-black text-indigo-600">${totalCost}</span>
                </div>
              </div>

              {/* Parts Used List */}
              {order.parts_used.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Linked Parts Consumed
                  </span>
                  <div className="space-y-1">
                    {order.parts_used.map((p, idx) => (
                      <div
                        key={idx}
                        className="text-xs bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 flex items-center justify-between font-medium text-slate-800"
                      >
                        <span>
                          {p.name} (x{p.quantity})
                        </span>
                        <span className="font-mono text-indigo-700 font-bold">
                          ${p.quantity * p.unit_cost}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 text-slate-700">
                  <span className="font-bold text-slate-900 block mb-0.5">Before Notes:</span>
                  {order.before_after_notes?.before || ''}
                </div>
                {order.status === 'Closed' && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-100">
                    <span className="font-bold text-emerald-950 block mb-0.5">After Notes (Completion):</span>
                    {order.before_after_notes?.after || ''}
                  </div>
                )}
              </div>

              {/* Footer / Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
                  <span>{order.assigned_mechanic_name}</span>
                </div>

                {order.status !== 'Closed' && (
                  <button
                    onClick={() => {
                      setClosingOrderId(order.id);
                      setAfterNotesInput('Work order verified and completed successfully.');
                    }}
                    className="px-3 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition cursor-pointer flex items-center gap-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Close Work Order
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Work Order Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-indigo-600" />
                Initiate New Work Order
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Vehicle</label>
                <select
                  value={newVehicleId}
                  onChange={(e) => setNewVehicleId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.plate}) — Status: {v.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Intervention Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800"
                >
                  <option value="Corrective">Corrective Repair</option>
                  <option value="Preventive">Preventive Maintenance</option>
                  <option value="Inspection">Safety Inspection</option>
                  <option value="Investigation">Incident Investigation</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Labor Hours</label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={newLaborHours}
                    onChange={(e) => setNewLaborHours(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hourly Rate ($)</label>
                  <input
                    type="number"
                    value={newHourlyRate}
                    onChange={(e) => setNewHourlyRate(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Add Parts Section */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-700 block">Link Inventory Parts</label>
                <div className="flex gap-2">
                  <select
                    value={selectedPartId}
                    onChange={(e) => setSelectedPartId(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl p-2 font-medium text-slate-800"
                  >
                    <option value="">-- Select Warehouse Part --</option>
                    {inventory.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stock: {p.quantity} - ${p.unit_cost})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={selectedPartQty}
                    onChange={(e) => setSelectedPartQty(Number(e.target.value))}
                    className="w-16 bg-white border border-slate-200 rounded-xl p-2 font-bold text-center"
                  />
                  <button
                    type="button"
                    onClick={handleAddPartToForm}
                    className="px-3 py-2 bg-indigo-600 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                {selectedPartsList.length > 0 && (
                  <div className="space-y-1 pt-2">
                    {selectedPartsList.map((p) => (
                      <div
                        key={p.part_id}
                        className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 text-xs font-medium"
                      >
                        <span>
                          {p.name} x{p.quantity} (${p.quantity * p.unit_cost})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemovePartFromForm(p.part_id)}
                          className="text-rose-500 font-bold hover:text-rose-700 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Before Notes</label>
                <textarea
                  rows={3}
                  value={newBeforeNotes}
                  onChange={(e) => setNewBeforeNotes(e.target.value)}
                  placeholder="Describe reported symptoms and required repair steps..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition cursor-pointer"
                >
                  Create Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Work Order Modal */}
      {closingOrderId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Complete Work Order #{closingOrderId}
            </h3>
            <p className="text-xs text-slate-500">
              Submitting completion will automatically deduct linked parts from warehouse inventory, update vehicle status to Healthy, and log the final variance cost record.
            </p>

            <form onSubmit={handleCloseOrderSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">After / Completion Notes</label>
                <textarea
                  rows={3}
                  value={afterNotesInput}
                  onChange={(e) => setAfterNotesInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setClosingOrderId(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition cursor-pointer"
                >
                  Confirm Completion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
