import React, { useEffect, useState } from 'react';
import { adminApiService } from '../../services/adminApiService';
import { ScrollText, AlertTriangle } from 'lucide-react';

export const PlatformAuditLog: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    let isMounted = true;
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await adminApiService.getPlatformAuditLogs(page, limit);
        if (isMounted) {
          setLogs(res.data || []);
          setTotal(res.total || 0);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load audit logs');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchLogs();
    return () => { isMounted = false; };
  }, [page]);

  if (loading && logs.length === 0) {
    return <div className="p-8 text-slate-400">Loading platform audit logs...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-lg flex items-start">
          <AlertTriangle className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold">Error Loading Audit Logs</h3>
            <p className="mt-1 text-sm opacity-90">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Platform Audit Log</h1>
          <p className="text-slate-400 mt-1">Cross-tenant administrative actions and security events.</p>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-700">
          <thead className="bg-slate-900/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Timestamp</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Actor</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Action</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Tenant/Entity</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-750 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-slate-200">{log.user_email || log.actor_id}</div>
                  <div className="text-xs text-slate-500">{log.user_role}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                  {log.tenant_id ? log.tenant_id.split('-')[0] + '...' : 'Global'}
                  {log.entity_id && ` / Entity: ${log.entity_id.split('-')[0]}...`}
                </td>
                <td className="px-6 py-4 text-sm text-slate-400 max-w-xs truncate" title={log.new_value}>
                  {log.new_value || log.previous_value || '-'}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No audit logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        {total > limit && (
          <div className="px-6 py-4 border-t border-slate-700 flex justify-between items-center bg-slate-900/50">
            <span className="text-sm text-slate-400">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} logs
            </span>
            <div className="flex space-x-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded border border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
              >
                Previous
              </button>
              <button 
                disabled={page * limit >= total}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded border border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
