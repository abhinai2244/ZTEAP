'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  Laptop,
  Shield,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export default function ResourceOwnerDashboard() {
  const [resources, setResources] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Approval modal state
  const [activeActionReq, setActiveActionReq] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [actionReason, setActionReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchOwnerData = async () => {
    try {
      const [resRes, appRes] = await Promise.all([
        fetch('/api/resources?owned=true'),
        fetch('/api/approvals'),
      ]);

      const resData = await resRes.json();
      const appData = await appRes.json();

      setResources(resData.resources || []);
      setPendingApprovals(appData.pending || []);
    } catch (err) {
      console.error('Error fetching owner data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwnerData();
  }, []);

  const handleApprovalAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeActionReq) return;
    setProcessing(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/approvals/${activeActionReq.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          reason: actionReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process approval action');
      }

      setActiveActionReq(null);
      setActionReason('');
      fetchOwnerData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Loading owned application queue and pending requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Application Ownership & Approvals</h1>
          <p className="text-sm text-slate-400">
            Review and govern access requests for internal applications you own.
          </p>
        </div>
        <button
          onClick={fetchOwnerData}
          className="inline-flex items-center px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh Queue
        </button>
      </div>

      {/* Pending Access Approvals Queue */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Pending Access Approvals ({pendingApprovals.length})
          </h3>
          <span className="text-[11px] text-amber-400 flex items-center">
            <AlertTriangle className="w-3.5 h-3.5 mr-1" />
            Zero-Trust Rule: Self-approvals are strictly blocked
          </span>
        </div>

        {pendingApprovals.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-500 text-xs">
            No pending access requests require your approval at this time.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingApprovals.map((req) => (
              <div
                key={req.id}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">{req.resource.name}</h4>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Requester: <strong className="text-slate-200">{req.user?.firstName} {req.user?.lastName}</strong> ({req.user?.email})
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase font-bold">
                      AWAITING REVIEW
                    </span>
                  </div>

                  <div className="mt-3 p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300">
                    <span className="text-slate-400 font-semibold block mb-0.5">Stated Business Purpose:</span>
                    &ldquo;{req.reason}&rdquo;
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] text-slate-400">
                    <div>
                      Device: <strong className="text-slate-200">{req.device?.name}</strong>
                    </div>
                    <div>
                      Risk Score: <strong className="text-amber-400">{req.riskAssessment?.score ?? 'N/A'}/100</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setActiveActionReq(req);
                      setActionType('APPROVED');
                      setActionReason('Approved for valid operational need.');
                    }}
                    className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve
                  </button>
                  <button
                    onClick={() => {
                      setActiveActionReq(req);
                      setActionType('REJECTED');
                      setActionReason('Insufficient justification or high security sensitivity.');
                    }}
                    className="flex-1 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold flex items-center justify-center transition-colors"
                  >
                    <XCircle className="w-4 h-4 mr-1.5" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Owned Applications List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Registered Applications ({resources.length})
        </h3>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Application</th>
                <th className="py-3 px-4">Sensitivity</th>
                <th className="py-3 px-4">Required Role</th>
                <th className="py-3 px-4">Approval Mode</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {resources.map((res) => (
                <tr key={res.id} className="hover:bg-slate-800/30">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white">{res.name}</div>
                    <div className="text-[11px] text-slate-400">{res.description}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold">{res.sensitivity}</td>
                  <td className="py-3.5 px-4 font-mono">{res.requiredRole}</td>
                  <td className="py-3.5 px-4">
                    <span className="text-[11px]">
                      {res.requiresApproval ? 'Requires Explicit Approval' : 'Automated Policy Decision'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                      ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Process Approval Action */}
      {activeActionReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-1">
              Confirm {actionType === 'APPROVED' ? 'Approval' : 'Rejection'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Resource: <strong className="text-slate-200">{activeActionReq.resource?.name}</strong> • Requester:{' '}
              <strong className="text-slate-200">{activeActionReq.user?.email}</strong>
            </p>

            {actionError && (
              <div className="mb-4 p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-200 text-xs">
                {actionError}
              </div>
            )}

            <form onSubmit={handleApprovalAction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Decision Justification / Reason
                </label>
                <textarea
                  required
                  rows={3}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveActionReq(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold text-white transition-colors ${
                    actionType === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
                  }`}
                >
                  {processing ? 'Recording Decision...' : `Confirm ${actionType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
