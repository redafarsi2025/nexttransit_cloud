import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocalization } from '../../context/LocalizationContext';
import { getAuditTrail } from '../../services/auditService';
import { AuditLogEntry } from '../../types';
import {
  FileText,
  ShieldCheck,
  Filter,
  Calendar,
  Lock,
  UserCheck,
  ChevronDown,
  ChevronRight,
  Database,
  Search,
  CheckCircle,
  AlertOctagon,
  Clock,
  Layers,
} from 'lucide-react';

export const AuditLog: React.FC = () => {
  const { currentRole } = useAuth();
  const { t } = useLocalization();

  const isAuthorized = currentRole === 'DIRECTOR' || currentRole === 'FLEET_MANAGER';

  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    async function loadLogs() {
      const data = await getAuditTrail(entityTypeFilter, undefined, startDate, endDate);
      setLogs(data);
    }
    loadLogs();
  }, [entityTypeFilter, startDate, endDate]);

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.entity_id.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.actor_id.toLowerCase().includes(q) ||
      (log.actor_role && log.actor_role.toLowerCase().includes(q))
    );
  });

  if (!isAuthorized) {
    return (
      <div className="p-8 max-w-4xl mx-auto animate-in fade-in">
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="inline-flex p-4 bg-amber-100 text-amber-700 rounded-full">
            <Lock className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Restricted Security View</h2>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            The Audit Trail is an append-only contractual ledger accessible strictly to the <strong>Director</strong> and <strong>Fleet Manager</strong> roles.
          </p>
          <div className="text-xs font-semibold text-slate-500">
            Current Active Role: <span className="text-amber-800 font-bold">{currentRole}</span>
          </div>
        </div>
      </div>
    );
  }

  const getActionBadgeColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'APPROVAL':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'OVERRIDE':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'CREATE':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'STATUS_CHANGE':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'vehicle':
        return '🚛';
      case 'work_order':
        return '🔧';
      case 'alert':
        return '🚨';
      case 'cae_budget':
        return '💰';
      case 'fuel_log':
        return '⛽';
      case 'incident':
        return '⚠️';
      default:
        return '📋';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in pb-12">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="h-4 w-4" />
            {t('audit.header_tag', {}, 'Compliance & Contractual Ledger (Append-Only)')}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t('audit.header_title', {}, 'Multi-Tenant Immutable Audit Trail')}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {t('audit.header_desc', {}, 'Tamper-proof ledger of all vehicle updates, work order transitions, R1-R7 rule overrides, and CAE budget approvals.')}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl text-emerald-800 text-xs font-bold">
          <Lock className="w-4 h-4 text-emerald-600" />
          <span>RLS Enforced Append-Only</span>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        {/* Entity Type Filter */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            {t('audit.filter_entity', {}, 'Entity Type')}
          </label>
          <select
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">{t('audit.filter_all_entities', {}, 'All Entities')}</option>
            <option value="vehicle">Vehicles (Status / Faults)</option>
            <option value="work_order">Work Orders (Lifecycle)</option>
            <option value="alert">Alerts (Rule Overrides)</option>
            <option value="cae_budget">CAE Budget Approvals</option>
            <option value="fuel_log">Fuel Logs & Anomalies</option>
            <option value="incident">Driver Incidents</option>
          </select>
        </div>

        {/* Start Date */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {t('audit.filter_start_date', {}, 'Start Date')}
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-indigo-500"
          />
        </div>

        {/* End Date */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {t('audit.filter_end_date', {}, 'End Date')}
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-indigo-500"
          />
        </div>

        {/* Search Input */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            Search Ledger
          </label>
          <input
            type="text"
            placeholder="Search by ID, action, actor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">{t('audit.col_timestamp', {}, 'Timestamp (UTC)')}</th>
                <th className="py-3.5 px-4">{t('audit.col_actor', {}, 'Actor & Role')}</th>
                <th className="py-3.5 px-4">{t('audit.col_entity', {}, 'Entity & ID')}</th>
                <th className="py-3.5 px-4">{t('audit.col_action', {}, 'Action Executed')}</th>
                <th className="py-3.5 px-4 text-right">{t('audit.col_diff', {}, 'State Delta')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-sm">
                      {t('audit.empty_trail', {}, 'No audit trail entries matched the specified filters.')}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{new Date(log.created_at).toISOString().replace('T', ' ').substring(0, 19)}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{log.actor_id}</div>
                          <div className="text-[10px] font-mono text-slate-500 uppercase">{log.actor_role || 'SYSTEM'}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{getEntityIcon(log.entity_type)}</span>
                            <div>
                              <div className="font-bold text-slate-900">{log.entity_id}</div>
                              <div className="text-[10px] text-slate-500 uppercase font-mono">{log.entity_type}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wide ${getActionBadgeColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            <span>{isExpanded ? 'Hide Delta' : 'View Delta'}</span>
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable JSON Diff Row */}
                      {isExpanded && (
                        <tr className="bg-slate-900 text-slate-100">
                          <td colSpan={5} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                <div className="text-amber-400 font-bold text-[11px] uppercase mb-1 border-b border-slate-800 pb-1">
                                  State Before Mutation
                                </div>
                                <pre className="text-slate-300 text-[11px] overflow-x-auto whitespace-pre-wrap">
                                  {JSON.stringify(log.before, null, 2)}
                                </pre>
                              </div>

                              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                <div className="text-emerald-400 font-bold text-[11px] uppercase mb-1 border-b border-slate-800 pb-1">
                                  State After Mutation
                                </div>
                                <pre className="text-slate-300 text-[11px] overflow-x-auto whitespace-pre-wrap">
                                  {JSON.stringify(log.after, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
