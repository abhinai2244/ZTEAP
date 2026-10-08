'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Laptop,
  Smartphone,
  ExternalLink,
  PlusCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function EmployeeDashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Request Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Decision Inspection Modal State
  const [inspectedRequest, setInspectedRequest] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      const [reqRes, resRes, devRes] = await Promise.all([
        fetch('/api/access/requests'),
        fetch('/api/resources'),
        fetch('/api/devices'),
      ]);

      const reqData = await reqRes.json();
      const resData = await resRes.json();
      const devData = await devRes.json();

      setRequests(reqData.requests || []);
      setResources(resData.resources || []);
      setDevices(devData.devices || []);

      if (devData.devices?.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(devData.devices[0].id);
      }
      if (resData.resources?.length > 0 && !selectedResourceId) {
        setSelectedResourceId(resData.resources[0].id);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/access/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: selectedResourceId,
          deviceId: selectedDeviceId,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit access request');
      }

      setIsModalOpen(false);
      setReason('');
      await fetchData();
      setInspectedRequest(data); // Immediately show evaluation results
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Loading security posture and access history...</p>
      </div>
    );
  }

  const approvedRequests = requests.filter((r) => r.status === 'APPROVED');

  return (
    <div className="space-y-8">
      {/* Header and Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Employee Access Portal</h1>
          <p className="text-sm text-slate-400">
            Continuously evaluated dynamic access to internal enterprise systems.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Request Application Access
        </button>
      </div>

      {/* Device Trust & Security Posture Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {devices.map((device) => {
          const isTrusted = device.status === 'TRUSTED' || device.status === 'COMPLIANT';
          const isCompromised = device.status === 'COMPROMISED';

          return (
            <div
              key={device.id}
              className={`p-4 rounded-xl border ${
                isCompromised
                  ? 'bg-red-950/20 border-red-800/40'
                  : isTrusted
                  ? 'bg-slate-900/60 border-slate-800'
                  : 'bg-amber-950/20 border-amber-800/40'
              } flex items-center justify-between`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isCompromised
                      ? 'bg-red-900/30 text-red-400'
                      : isTrusted
                      ? 'bg-emerald-900/30 text-emerald-400'
                      : 'bg-amber-900/30 text-amber-400'
                  }`}
                >
                  {device.os?.includes('Android') || device.os?.includes('iOS') ? (
                    <Smartphone className="w-5 h-5" />
                  ) : (
                    <Laptop className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{device.name}</h4>
                  <p className="text-[11px] text-slate-400">
                    {device.os || 'Unknown OS'} • {device.isManaged ? 'Managed' : 'Unmanaged'}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    isCompromised
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : isTrusted
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {device.status}
                </span>
                <div className="text-[11px] font-mono text-slate-400 mt-1">
                  Trust: {device.trustScore}/100
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Approved Applications */}
      {approvedRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Approved Enterprise Applications ({approvedRequests.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {approvedRequests.map((req) => (
              <div
                key={req.id}
                className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/40 border border-slate-800 hover:border-slate-700 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <h4 className="font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {req.resource.name}
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                    {req.resource.description}
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    Sensitivity: <strong className="text-slate-300">{req.resource.sensitivity}</strong>
                  </span>
                  <button
                    onClick={() => alert(`Launching secure session for ${req.resource.name}...`)}
                    className="inline-flex items-center text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    Launch <ExternalLink className="w-3.5 h-3.5 ml-1" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Access Requests History Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Access Request Decisions & Audit Trail
        </h3>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Application</th>
                  <th className="py-3 px-4">Device</th>
                  <th className="py-3 px-4">Requested At</th>
                  <th className="py-3 px-4">Policy Decision</th>
                  <th className="py-3 px-4">Risk Score</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No access requests submitted yet. Use the button above to request application access.
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => {
                    const status = req.status;
                    const riskScore = req.riskAssessment?.score ?? 0;
                    const riskLevel = req.riskAssessment?.level ?? 'LOW';

                    return (
                      <tr key={req.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{req.resource.name}</div>
                          <div className="text-[11px] text-slate-400">{req.resource.sensitivity}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          {req.device?.name || 'Unknown Device'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                          {new Date(req.requestedAt).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              status === 'APPROVED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : status === 'DENIED'
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                : status === 'STEP_UP_REQUIRED'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {status === 'APPROVED' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                            {status === 'DENIED' && <XCircle className="w-3 h-3 mr-1" />}
                            {status === 'STEP_UP_REQUIRED' && <AlertCircle className="w-3 h-3 mr-1" />}
                            {status === 'PENDING' && <Clock className="w-3 h-3 mr-1" />}
                            {status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`font-mono font-bold text-xs ${
                                riskScore <= 30
                                  ? 'text-emerald-400'
                                  : riskScore <= 60
                                  ? 'text-amber-400'
                                  : riskScore <= 80
                                  ? 'text-orange-400'
                                  : 'text-red-400'
                              }`}
                            >
                              {riskScore}/100
                            </span>
                            <span className="text-[10px] text-slate-400">({riskLevel})</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setInspectedRequest(req)}
                            className="inline-flex items-center text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                          >
                            Inspect <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Request Application Access */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-1">Request Application Access</h3>
            <p className="text-xs text-slate-400 mb-4">
              Your request will be dynamically evaluated by the Zero-Trust Policy Engine across identity, device trust, resource sensitivity, and risk metrics.
            </p>

            {submitError && (
              <div className="mb-4 p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-200 text-xs">
                {submitError}
              </div>
            )}

            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Target Application
                </label>
                <select
                  value={selectedResourceId}
                  onChange={(e) => setSelectedResourceId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.sensitivity} - Required: {r.requiredRole})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Requesting Device
                </label>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.status} - Trust Score: {d.trustScore}/100)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Access Justification / Reason
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State the legitimate business purpose for accessing this application..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Evaluating Policy Engine...' : 'Submit & Evaluate Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Decision Details and Explainable Risk Breakdown */}
      {inspectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-bold text-white">Zero-Trust Evaluation Breakdown</h3>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-mono">
                    EXPLAINABLE AI
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Target: <strong className="text-slate-200">{inspectedRequest.resource?.name}</strong> • Device:{' '}
                  <strong className="text-slate-200">{inspectedRequest.device?.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setInspectedRequest(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Decision Banner */}
            <div
              className={`p-4 rounded-xl border mb-6 ${
                inspectedRequest.decision?.decision === 'ALLOW' || inspectedRequest.status === 'APPROVED'
                  ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                  : inspectedRequest.decision?.decision === 'DENY' || inspectedRequest.status === 'DENIED'
                  ? 'bg-red-950/30 border-red-800/60 text-red-200'
                  : 'bg-amber-950/30 border-amber-800/60 text-amber-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm tracking-wide uppercase">
                  Decision: {inspectedRequest.decision?.decision || inspectedRequest.status}
                </span>
                <span className="font-mono text-xs font-bold">
                  Risk Score: {inspectedRequest.riskAssessment?.score ?? 0}/100 (
                  {inspectedRequest.riskAssessment?.level ?? 'UNKNOWN'})
                </span>
              </div>
              <p className="text-xs mt-1.5 opacity-90">
                {inspectedRequest.decision?.decisionReason || 'Policy evaluation completed.'}
              </p>
            </div>

            {/* Contributing Risk Factors */}
            <div className="space-y-3 mb-6">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Contributing Risk Factors
              </h4>
              <div className="space-y-2">
                {Array.isArray(inspectedRequest.riskAssessment?.factors) ? (
                  inspectedRequest.riskAssessment.factors.map((factor: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-200">{factor.factor}</div>
                        <div className="text-[11px] text-slate-400">{factor.description}</div>
                      </div>
                      <span
                        className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                          factor.impact > 0
                            ? 'text-red-400 bg-red-950/50'
                            : factor.impact < 0
                            ? 'text-emerald-400 bg-emerald-950/50'
                            : 'text-slate-400 bg-slate-800'
                        }`}
                      >
                        {factor.impact > 0 ? `+${factor.impact}` : factor.impact}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No individual factor breakdown available.</p>
                )}
              </div>
            </div>

            <div className="text-right">
              <button
                onClick={() => setInspectedRequest(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
