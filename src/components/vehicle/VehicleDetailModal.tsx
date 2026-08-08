import React, { useState, useEffect } from 'react';
import { useFleet } from '../../context/FleetContext';
import { useAuth } from '../../context/AuthContext';
import { useLocalization } from '../../context/LocalizationContext';
import { VehicleStatus, WorkOrder, Warranty } from '../../types';
import { warrantyService } from '../../services/warrantyService';
import { KPIBadge } from '../common/KPIBadge';
import {
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Wrench,
  Package,
  DollarSign,
  FileText,
  Activity,
  PlusCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface VehicleDetailModalProps {
  vehicleId: string;
  onClose: () => void;
}

type TabType = 'summary' | 'diagnostics' | 'history' | 'cost' | 'parts' | 'work_orders' | 'warranty';

export const VehicleDetailModal: React.FC<VehicleDetailModalProps> = ({
  vehicleId,
  onClose,
}) => {
  const { vehicles, inventory, workOrders, costRecords, createWorkOrder, closeWorkOrder } = useFleet();
  const { currentRole, changeScreen } = useAuth();
  const { t } = useLocalization();


  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const [showSubscores, setShowSubscores] = useState(false);
  const [showCreateWOModal, setShowCreateWOModal] = useState(false);
  
  const [warranty, setWarranty] = useState<Warranty | null>(null);
  const [warrantyLoading, setWarrantyLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (vehicleId) {
      warrantyService.getWarrantyStatus(vehicleId).then(data => {
        if (isMounted) {
          setWarranty(data);
          setWarrantyLoading(false);
        }
      });
    }
    return () => { isMounted = false; };
  }, [vehicleId]);

  // Form state for Work Order creation
  const [woType, setWoType] = useState<WorkOrder['type']>('Corrective');
  const [woHours, setWoHours] = useState<number>(6);
  const [woNotes, setWoNotes] = useState<string>('');
  const [selectedPartId, setSelectedPartId] = useState<string>('');

  if (!vehicle) return null;

  // RBAC conditional tab list
  const getAllowedTabs = (): TabType[] => {
    switch (currentRole) {
      case 'SUPER_ADMIN':
        return ['summary', 'diagnostics', 'history', 'cost', 'parts', 'work_orders', 'warranty'];
      case 'DIRECTOR':
        return ['summary', 'cost'];
      case 'FINANCE':
        return ['cost'];
      case 'OPERATIONS':
        return ['parts'];
      case 'MAINTENANCE_MANAGER':
        return ['summary', 'diagnostics', 'history', 'cost', 'parts', 'work_orders', 'warranty'];
      case 'MECHANIC':
        return ['summary', 'diagnostics', 'history', 'parts', 'work_orders', 'warranty'];
      case 'DRIVER':
        return ['summary'];
      default:
        // FLEET_MANAGER -> full access
        return ['summary', 'diagnostics', 'history', 'cost', 'parts', 'work_orders', 'warranty'];
    }
  };

  const allowedTabs = getAllowedTabs();
  const [activeTab, setActiveTab] = useState<TabType>(allowedTabs[0]);

  // Ensure active tab is within allowed tabs
  const currentTab = allowedTabs.includes(activeTab)
    ? activeTab
    : allowedTabs[0];

  const getStatusBadge = (status: VehicleStatus) => {
    switch (status) {
      case 'Critical':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-xs">
            <AlertCircle className="h-4 w-4" />
            CRITICAL
          </span>
        );
      case 'Attention':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow-xs">
            <AlertTriangle className="h-4 w-4" />
            ATTENTION
          </span>
        );
      case 'Healthy':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-xs">
            <CheckCircle2 className="h-4 w-4" />
            HEALTHY
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-500 px-3 py-1 text-xs font-bold text-white shadow-xs">
            <HelpCircle className="h-4 w-4" />
            UNKNOWN
          </span>
        );
    }
  };

  const vehicleWorkOrders = workOrders.filter((w) => w.vehicle_id === vehicle.id);
  const vehicleCostRecords = costRecords.filter((c) => c.vehicle_id === vehicle.id);

  const totalActualCost = vehicleCostRecords.reduce((s, c) => s + c.amount, 0); // [Calculated]
  const totalBudgetCost = vehicleCostRecords.reduce(
    (s, c) => s + (c.budget_for_category || 15000),
    0
  );

  const handleCreateWO = (e: React.FormEvent) => {
    e.preventDefault();
    const chosenPart = inventory.find((p) => p.id === selectedPartId);
    const partsUsed = chosenPart
      ? [{ part_id: chosenPart.id, name: chosenPart.name, quantity: 1, unit_cost: chosenPart.unit_cost }]
      : [];

    createWorkOrder({
      vehicle_id: vehicle.id,
      type: woType,
      parts_used: partsUsed,
      labor_hours: woHours,
      hourly_rate: 140,
      before_notes: woNotes || `Scheduled ${woType} for ${vehicle.plate}.`,
      assigned_mechanic_id: 'M-01',
      assigned_mechanic_name: 'David Thorne (Workshop Technician)',
      related_fault_code: vehicle.active_fault_codes[0]?.code,
    });
    setShowCreateWOModal(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Leads with Status Badge + One-Line Plain-Language Reason */}
        <div className="bg-slate-900 px-6 py-5 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{getStatusBadge(vehicle.status)}</div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {vehicle.name}
                  </h3>
                  <span className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-300 border border-slate-700">
                    {vehicle.plate}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      vehicle.classification === 'Keystone'
                        ? 'bg-purple-900/60 text-purple-200 border border-purple-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {vehicle.classification}
                  </span>
                </div>

                {/* One-Line Plain-Language Reason (Mandatory Primary Display) */}
                <p className="mt-1 text-sm text-slate-200 font-medium leading-snug">
                  {vehicle.status_reason}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {(currentRole === 'MAINTENANCE_MANAGER' ||
                currentRole === 'SUPER_ADMIN' ||
                currentRole === 'FLEET_MANAGER' ||
                currentRole === 'MECHANIC') && (
                <button
                  onClick={() => setShowCreateWOModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Create Work Order</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Secondary Collapsible Numeric Sub-Scores */}
          <div className="mt-4 border-t border-slate-800 pt-3">
            <button
              onClick={() => setShowSubscores(!showSubscores)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <span>
                {showSubscores ? 'Hide Secondary Sub-Scores' : 'Show Secondary Sub-Scores (Fault, Compliance, Freshness)'}
              </span>
              {showSubscores ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showSubscores && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg bg-slate-800/80 p-3 border border-slate-700">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Fault Score</span>
                    <KPIBadge
                      type="Calculated"
                      formula="100 - (25 × active_fault_count + severity_penalty)"
                      size="sm"
                    />
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-bold text-white">{vehicle.fault_score}/100</span>
                    <span className="text-xs text-slate-400">Higher = Clean</span>
                  </div>
                </div>

                <div className="rounded-lg bg-slate-800/80 p-3 border border-slate-700">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Compliance Score</span>
                    <KPIBadge
                      type="Calculated"
                      formula="100 - mileage_variance_percentage"
                      size="sm"
                    />
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-bold text-white">
                      {vehicle.compliance_score}/100
                    </span>
                    <span className="text-xs text-slate-400">Interval adherence</span>
                  </div>
                </div>

                <div className="rounded-lg bg-slate-800/80 p-3 border border-slate-700">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Freshness Score</span>
                    <KPIBadge
                      type="Calculated"
                      formula="max(0, 100 - days_since_last_check × 2)"
                      size="sm"
                    />
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-bold text-white">
                      {vehicle.freshness_score}/100
                    </span>
                    <span className="text-xs text-slate-400">
                      Checked {vehicle.last_check_date}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Role-Conditional Tabs Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 overflow-x-auto">
          {allowedTabs.includes('summary') && (
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                currentTab === 'summary'
                  ? 'border-indigo-600 text-indigo-600 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="h-4 w-4" />
              <span>{t('tab.summary', {}, 'Summary')}</span>
            </button>
          )}

          {allowedTabs.includes('diagnostics') && (
            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                currentTab === 'diagnostics'
                  ? 'border-indigo-600 text-indigo-600 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertCircle className="h-4 w-4" />
              <span>{t('tab.diagnostics', {}, 'Diagnostic Snapshot')} ({vehicle.active_fault_codes.length})</span>
            </button>
          )}

          {allowedTabs.includes('history') && (
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                currentTab === 'history'
                  ? 'border-indigo-600 text-indigo-600 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>{t('tab.history', {}, 'Maintenance History')} ({vehicle.maintenance_history.length})</span>
            </button>
          )}

          {allowedTabs.includes('cost') && (
            <button
              onClick={() => setActiveTab('cost')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                currentTab === 'cost'
                  ? 'border-indigo-600 text-indigo-600 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <DollarSign className="h-4 w-4" />
              <span>{t('tab.cost', {}, 'Cost Breakdown')}</span>
            </button>
          )}

          {allowedTabs.includes('parts') && (
            <button
              onClick={() => setActiveTab('parts')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                currentTab === 'parts'
                  ? 'border-indigo-600 text-indigo-600 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="h-4 w-4" />
              <span>{t('tab.parts', {}, 'Parts Inventory')}</span>
            </button>
          )}

          {allowedTabs.includes('work_orders') && (
            <button
              onClick={() => setActiveTab('work_orders')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                currentTab === 'work_orders'
                  ? 'border-indigo-600 text-indigo-600 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wrench className="h-4 w-4" />
              <span>{t('tab.work_orders', {}, 'Work Orders')} ({vehicleWorkOrders.length})</span>
            </button>
          )}
          {allowedTabs.includes('warranty') && (
            <button
              onClick={() => setActiveTab('warranty')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                currentTab === 'warranty'
                  ? 'border-indigo-600 text-indigo-600 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>{t('tab.warranty', {}, 'Warranty')}</span>
            </button>
          )}
        </div>

        {/* Tab Body Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* SUMMARY TAB */}
          {currentTab === 'summary' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
                    <span>Odometer Reading</span>
                    <KPIBadge type="Calculated" formula="direct odometer telemetry" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">
                    {vehicle.mileage.toLocaleString()} km
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    Next scheduled service: {vehicle.next_service_mileage.toLocaleString()} km
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
                    <span>Schedule & Route (R4)</span>
                    <KPIBadge type="Configured" formula="scheduled dispatch route" />
                  </div>
                  <div className="mt-2 text-lg font-bold text-slate-900 truncate">
                    {vehicle.scheduled_route || 'Unassigned Reserve'}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-indigo-600">
                    Departure scheduled in {vehicle.scheduled_use_days} day(s)
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
                    <span>Active OBD Faults</span>
                    <KPIBadge type="Calculated" formula="count of ECU fault codes" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">
                    {vehicle.active_fault_codes.length} Active Code(s)
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    {vehicle.active_fault_codes.length > 0
                      ? `Primary: ${vehicle.active_fault_codes[0].code} (${vehicle.active_fault_codes[0].severity})`
                      : 'All diagnostic circuits normal.'}
                  </div>
                </div>
              </div>

              {/* Driver / Mechanic assignments */}
              <div className="rounded-xl border border-slate-200 p-4 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Operational Assignment</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Assigned Mechanic: <strong>{vehicle.assigned_mechanic_id || 'M-01 (David Thorne)'}</strong> • Assigned Driver: <strong>{vehicle.assigned_driver_id || 'Unassigned'}</strong>
                  </p>
                </div>
                {currentRole === 'DRIVER' && (
                  <button
                    onClick={() => {
                      changeScreen('INCIDENT_REPORTS');
                      onClose();
                    }}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 transition cursor-pointer"
                  >
                    Report Driver Incident (R6)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* DIAGNOSTIC SNAPSHOT TAB */}
          {currentTab === 'diagnostics' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-base">Active Telematics & OBD II Fault Snapshot</h4>
                <KPIBadge type="Calculated" formula="real-time ECU diagnostic stream" />
              </div>

              {vehicle.active_fault_codes.length === 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-8 text-center text-emerald-800">
                  <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-600 mb-2" />
                  <p className="font-bold">No active diagnostic fault codes</p>
                  <p className="text-xs text-emerald-700 mt-1">
                    All powertrain, braking, and electrical sensors reporting nominal values.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vehicle.active_fault_codes.map((fault) => {
                    const linkedPart = fault.required_part_id
                      ? inventory.find((p) => p.id === fault.required_part_id)
                      : null;

                    return (
                      <div
                        key={fault.code}
                        className="rounded-xl border border-red-200 bg-red-50/30 p-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="rounded-md bg-red-600 px-2.5 py-1 font-mono text-xs font-bold text-white">
                              {fault.code}
                            </span>
                            <div>
                              <h5 className="font-bold text-slate-900 text-sm">
                                {fault.name}
                              </h5>
                              <p className="text-xs text-slate-600">
                                Logged date: {fault.logged_date} • Severity: <strong>{fault.severity}</strong>
                              </p>
                            </div>
                          </div>
                          <KPIBadge
                            type="Calculated"
                            formula="direct OBD II fault code severity mapping"
                          />
                        </div>

                        <div className="mt-3 rounded-lg bg-white p-3 border border-slate-200 text-xs">
                          <strong className="text-slate-900">Required Technical Intervention:</strong>
                          <p className="text-slate-700 mt-0.5">{fault.required_intervention}</p>
                        </div>

                        {/* R3: Linked Part inventory display */}
                        {linkedPart && (
                          <div className="mt-2.5 rounded-lg bg-indigo-50/70 p-3 border border-indigo-200/80 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-indigo-700" />
                              <div>
                                <span className="font-bold text-indigo-950">
                                  R3 Auto-Linked Inventory: {linkedPart.name}
                                </span>
                                <span className="text-indigo-800 ml-2">
                                  SKU: {linkedPart.sku}
                                </span>
                              </div>
                            </div>
                            <div className="font-mono font-bold text-indigo-900">
                              Stock: {linkedPart.quantity} units (Threshold: {linkedPart.reorder_threshold})
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* MAINTENANCE HISTORY TAB */}
          {currentTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-base">
                  Maintenance & Repair History
                </h4>
                <span className="text-xs text-slate-500">
                  Click any Work Order ID to jump to source record
                </span>
              </div>

              {vehicle.maintenance_history.length === 0 ? (
                <div className="rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                  No historical maintenance records found for this vehicle.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Summary / Action</th>
                        <th className="py-2.5 px-3">Source WO</th>
                        <th className="py-2.5 px-3 text-right">Total Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {vehicle.maintenance_history.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-3 font-mono text-slate-700">
                            {item.date}
                          </td>
                          <td className="py-3 px-3">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-800">
                              {item.type}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-900 font-medium">
                            {item.summary}
                          </td>
                          <td className="py-3 px-3">
                            {item.work_order_id ? (
                              <button
                                onClick={() => {
                                  changeScreen('WORK_ORDER_QUEUE');
                                  onClose();
                                }}
                                className="inline-flex items-center gap-1 font-mono font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                              >
                                <span>{item.work_order_id}</span>
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            ${item.total_cost.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* COST TAB (Management Controller dedicated view) */}
          {currentTab === 'cost' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-base">
                    Vehicle Cost & Budget Traceability (Q3 2026)
                  </h4>
                  <p className="text-xs text-slate-600">
                    RBAC Cost Tab • Drill-down into actual spend vs. budget by category
                  </p>
                </div>
                <KPIBadge
                  type="Calculated"
                  formula="sum(amount) vs sum(budget_for_category) from cost_records"
                />
              </div>

              {/* Total Summary banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-xs font-semibold text-slate-500 uppercase">
                    Total Actual Spend
                  </span>
                  <div className="mt-1 text-2xl font-bold text-slate-900">
                    ${totalActualCost.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-xs font-semibold text-slate-500 uppercase">
                    Period Budget
                  </span>
                  <div className="mt-1 text-2xl font-bold text-slate-900">
                    ${totalBudgetCost.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-xs font-semibold text-slate-500 uppercase">
                    Variance %
                  </span>
                  <div
                    className={`mt-1 text-2xl font-bold ${
                      totalActualCost > totalBudgetCost
                        ? 'text-red-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {totalBudgetCost > 0
                      ? `${(((totalActualCost - totalBudgetCost) / totalBudgetCost) * 100).toFixed(1)}%`
                      : '0.0%'}
                  </div>
                </div>
              </div>

              {/* Cost Category Breakdown Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase">
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4 text-right">Actual Spend</th>
                      <th className="py-2.5 px-4 text-right">Budget</th>
                      <th className="py-2.5 px-4 text-right">Variance %</th>
                      <th className="py-2.5 px-4">Source Traceability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vehicleCostRecords.map((cr) => {
                      const variancePct =
                        cr.budget_for_category > 0
                          ? ((cr.amount - cr.budget_for_category) / cr.budget_for_category) *
                            100
                          : 0;

                      return (
                        <tr key={cr.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {cr.category}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold">
                            ${cr.amount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">
                            ${cr.budget_for_category.toLocaleString()}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-mono font-bold ${
                              variancePct > 0 ? 'text-red-600' : 'text-emerald-600'
                            }`}
                          >
                            {variancePct > 0 ? `+${variancePct.toFixed(1)}%` : `${variancePct.toFixed(1)}%`}
                          </td>
                          <td className="py-3 px-4">
                            {cr.work_order_id ? (
                              <button
                                onClick={() => {
                                  changeScreen('VARIANCE_DASHBOARD');
                                  onClose();
                                }}
                                className="inline-flex items-center gap-1 font-mono text-indigo-600 hover:text-indigo-800 cursor-pointer"
                              >
                                <span>WO #{cr.work_order_id}</span>
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            ) : (
                              <span className="text-slate-400">Standard Allocation</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PARTS / INVENTORY TAB (Logistics Controller dedicated view) */}
          {currentTab === 'parts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-base">
                    R3 Linked Parts & Compatible Stock
                  </h4>
                  <p className="text-xs text-slate-600">
                    RBAC Parts Tab • Stock availability automatically checked against vehicle fault codes
                  </p>
                </div>
                <KPIBadge
                  type="Calculated"
                  formula="inventory check where compatible_vehicles includes vehicle.plate"
                />
              </div>

              <div className="space-y-3">
                {inventory
                  .filter(
                    (p) =>
                      p.compatible_vehicles.includes(vehicle.plate) ||
                      p.compatible_vehicles.includes(vehicle.id)
                  )
                  .map((item) => {
                    const isLow = item.quantity <= item.reorder_threshold;
                    const isRequiredForFault = vehicle.active_fault_codes.some(
                      (f) => f.required_part_id === item.id
                    );

                    return (
                      <div
                        key={item.id}
                        className={`rounded-xl border p-4 transition ${
                          isRequiredForFault
                            ? 'border-indigo-300 bg-indigo-50/40'
                            : isLow
                            ? 'border-amber-300 bg-amber-50/40'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-slate-900 text-sm">
                                {item.name}
                              </h5>
                              {isRequiredForFault && (
                                <span className="rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                                  Required for Active Fault
                                </span>
                              )}
                              {isLow && (
                                <span className="rounded bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                                  At/Below Threshold ({item.reorder_threshold})
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5">
                              SKU: <strong>{item.sku}</strong> • Category: {item.category} • Lead Time: {item.lead_time_days} days
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-mono font-bold text-slate-900">
                              {item.quantity} units in Stock
                            </div>
                            <div className="text-xs text-slate-500">
                              ${item.unit_cost}/unit
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* WORK ORDERS TAB */}
          {currentTab === 'work_orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-base">
                    Work Orders for {vehicle.name}
                  </h4>
                  <p className="text-xs text-slate-600">
                    Traceable corrective and preventive maintenance actions
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateWOModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>New Work Order</span>
                </button>
              </div>

              {vehicleWorkOrders.length === 0 ? (
                <div className="rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                  No active or closed Work Orders found for this vehicle.
                </div>
              ) : (
                <div className="space-y-3">
                  {vehicleWorkOrders.map((wo) => (
                    <div
                      key={wo.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-xs transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-indigo-600 text-sm">
                            {wo.id}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                              wo.status === 'Open'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {wo.status}
                          </span>
                          <span className="text-xs text-slate-500">
                            Type: {wo.type}
                          </span>
                        </div>
                        <div className="text-xs font-mono font-bold text-slate-900">
                          ${(wo.labor_cost + wo.parts_used.reduce((s, p) => s + p.quantity * p.unit_cost, 0)).toLocaleString()}
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-slate-700">
                        <p><strong>Before/Notes:</strong> {wo.before_after_notes?.before || ''}</p>
                        {wo.before_after_notes?.after && (
                          <p className="mt-1 text-slate-600"><strong>After:</strong> {wo.before_after_notes.after}</p>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>Assigned: {wo.assigned_mechanic_name}</span>
                        <span>Created: {wo.created_date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* WARRANTY TAB */}
          {currentTab === 'warranty' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-base">
                    {t('warranty.status_title', { name: vehicle.name }, `Warranty Status for ${vehicle.name}`)}
                  </h4>
                  <p className="text-xs text-slate-600">
                    {t('warranty.status_subtitle', {}, 'Track coverage to avoid voiding manufacturer warranty')}
                  </p>
                </div>
              </div>
              
              {warrantyLoading ? (
                <div className="p-8 text-center text-slate-500">{t('warranty.loading', {}, 'Loading warranty info...')}</div>
              ) : warranty ? (
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="text-lg font-bold text-slate-900">{warranty.manufacturer} {t('warranty.title', {}, 'Warranty')}</h5>
                      <p className="text-sm text-slate-500">{t('warranty.id_label', {}, 'ID:')} {warranty.id}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      warranty.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      warranty.status === 'expiring_soon' ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {t(`warranty.status.${warranty.status}`, {}, warranty.status.toUpperCase())}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                    <div>
                      <div className="text-xs font-bold uppercase text-slate-500 mb-1">{t('warranty.expiration_details', {}, 'Expiration Details')}</div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-700">{t('warranty.date', {}, 'Date:')} <strong className="text-slate-900">{warranty.expiry_date || t('warranty.na', {}, 'N/A')}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-700">{t('warranty.mileage', {}, 'Mileage:')} <strong className="text-slate-900">{warranty.expiry_mileage ? `${warranty.expiry_mileage.toLocaleString()} km` : t('warranty.na', {}, 'N/A')}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-50">
                          <span className="text-sm text-slate-500">{t('warranty.current_mileage', { mileage: vehicle.mileage.toLocaleString() }, `Current Mileage: ${vehicle.mileage.toLocaleString()} km`)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs font-bold uppercase text-slate-500 mb-1">{t('warranty.covered_systems', {}, 'Covered Systems')}</div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {warranty.covered_systems.map((sys, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                            {t(`warranty.system.${sys}`, {}, sys)}
                          </span>
                        ))}
                        {warranty.covered_systems.length === 0 && (
                          <span className="text-sm text-slate-500 italic">{t('warranty.no_systems_listed', {}, 'No specific systems listed')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 flex flex-col items-center justify-center text-center">
                  <AlertCircle className="h-10 w-10 text-slate-400 mb-3" />
                  <h5 className="text-slate-900 font-bold mb-1">{t('warranty.no_active_warranty', {}, 'No Active Warranty')}</h5>
                  <p className="text-slate-500 text-sm max-w-sm">
                    {t('warranty.no_active_warranty_desc', {}, 'There is no manufacturer warranty record currently associated with this vehicle.')}
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            RBAC View: {currentRole} • Active Tab: {currentTab}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800 cursor-pointer"
          >
            Close Detail
          </button>
        </div>
      </div>

      {/* CREATE WORK ORDER MODAL */}
      {showCreateWOModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4"
          onClick={(e) => {
            e.stopPropagation();
            setShowCreateWOModal(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h4 className="font-bold text-slate-900 text-lg">
                Create Work Order for {vehicle.plate}
              </h4>
              <button
                onClick={() => setShowCreateWOModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWO} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Maintenance Type
                </label>
                <select
                  value={woType}
                  onChange={(e) => setWoType(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 p-2 font-medium"
                >
                  <option value="Corrective">Corrective Repair</option>
                  <option value="Preventive">Preventive Maintenance</option>
                  <option value="Inspection">Inspection</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Required Part (R3 Auto-Link Check)
                </label>
                <select
                  value={selectedPartId}
                  onChange={(e) => setSelectedPartId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 font-medium"
                >
                  <option value="">-- No additional replacement part --</option>
                  {inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} (${item.unit_cost}) — Stock: {item.quantity}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Estimated Labor Hours ($140/hr)
                </label>
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={woHours}
                  onChange={(e) => setWoHours(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Diagnostic & Before-Service Notes
                </label>
                <textarea
                  rows={3}
                  value={woNotes}
                  onChange={(e) => setWoNotes(e.target.value)}
                  placeholder="Enter OBD fault findings or inspection details..."
                  className="w-full rounded-lg border border-slate-300 p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateWOModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-white font-bold hover:bg-indigo-700"
                >
                  Submit Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
