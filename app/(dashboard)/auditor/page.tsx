'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  Calendar,
} from 'lucide-react';

export default function AuditorDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [page, setPage] = useState(1);

  // Expanded metadata viewer
  const [expandedLog, setExpandedLog] = useState<any | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (actionFilter) params.append('action', actionFilter);
      if (severityFilter) params.append('severity', severityFilter);

      const res = await fetch(`/api/audit?${params.toString()}`);
      const data = await res.json();

      setLogs(data.logs || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, severityFilter]);

  const exportLogsAsJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ztap-audit-logs-${new Date().toISOString()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-8">
      {/* Title & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Immutable Security Audit Trail</h1>
          <p className="text-sm text-slate-400">
            Append-only tamper-evident logs of all authentication, authorization, and policy events.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchLogs}
            className="inline-flex items-center px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </button>
          <button
            onClick={exportLogsAsJSON}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-indigo-600/20"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export for SIEM
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Search Action
          </label>
          <input
            type="text"
            placeholder="e.g. LOGIN_SUCCESS, ACCESS_DENIED..."
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Filter Severity
          </label>
          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Severities</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="ERROR">ERROR</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>

        <div className="flex items-end text-xs text-slate-400">
          <span>
            Total Recorded Events: <strong className="text-white">{pagination.total}</strong>
          </span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Target Resource</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No audit records matching query filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isCrit = log.severity === 'CRITICAL' || log.severity === 'ERROR';
                  const isWarn = log.severity === 'WARNING';

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toISOString().replace('T', ' ').slice(0, 19)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase font-mono ${
                            isCrit
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : isWarn
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {log.severity}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-white">{log.action}</td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {log.actorEmail || log.actor?.email || 'Anonymous'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{log.resource || 'System'}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-semibold ${
                            log.result === 'SUCCESS' || log.result === 'ALLOW'
                              ? 'text-emerald-400'
                              : log.result === 'BLOCKED' || log.result === 'DENY'
                              ? 'text-red-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {log.result}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setExpandedLog(log)}
                          className="inline-flex items-center text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Page {pagination.page} of {pagination.totalPages || 1}
          </span>
          <div className="flex space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Full Audit Record Inspection */}
      {expandedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Audit Event Inspection</h3>
                <p className="text-xs text-slate-400">
                  Event ID: <code className="text-slate-300">{expandedLog.id}</code>
                </p>
              </div>
              <button onClick={() => setExpandedLog(null)} className="text-slate-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-800/60 border border-slate-700/60">
                <div>
                  <span className="text-slate-500 block">Correlation ID:</span>
                  <code className="text-slate-300 break-all">{expandedLog.correlationId || 'N/A'}</code>
                </div>
                <div>
                  <span className="text-slate-500 block">Origin IP:</span>
                  <code className="text-slate-300">{expandedLog.ipAddress || '127.0.0.1'}</code>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">
                  Structured Metadata Payload
                </span>
                <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-indigo-300 overflow-x-auto">
                  {JSON.stringify(expandedLog.metadata, null, 2) || '{}'}
                </pre>
              </div>
            </div>

            <div className="text-right mt-6">
              <button
                onClick={() => setExpandedLog(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
