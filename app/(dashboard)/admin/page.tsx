'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Lock,
  Unlock,
  AlertTriangle,
  UserPlus,
  RefreshCw,
  Sliders,
  Laptop,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export default function SecurityAdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'devices' | 'alerts'>('users');

  // Role Assignment State
  const [roleModalUser, setRoleModalUser] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState('RESOURCE_OWNER');
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      const [statsRes, usersRes, devicesRes] = await Promise.all([
        fetch('/api/stats/admin'),
        fetch('/api/users'),
        fetch('/api/devices?all=true'),
      ]);

      const statsData = await statsRes.json();
      const usersData = await usersRes.json();
      const devicesData = await devicesRes.json();

      setStats(statsData);
      setUsers(usersData.users || []);
      setDevices(devicesData.devices || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleDisableUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user account?')) return;
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'INACTIVE' }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to disable user');
      }
      fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleModalUser) return;
    setActionError(null);

    try {
      const res = await fetch(`/api/users/${roleModalUser.id}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleName: selectedRole }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to assign role');

      setRoleModalUser(null);
      fetchAdminData();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleUpdateDeviceStatus = async (deviceId: string, status: string) => {
    try {
      const res = await fetch(`/api/devices/${deviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          trustScore: status === 'TRUSTED' ? 95 : status === 'COMPROMISED' ? 0 : 40,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to update device');
      }
      fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Loading security administration telemetry...</p>
      </div>
    );
  }

  const metrics = stats?.metrics || {};

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Security Command Center</h1>
          <p className="text-sm text-slate-400">
            Real-time identity, role, policy enforcement, and device telemetry.
          </p>
        </div>
        <button
          onClick={fetchAdminData}
          className="inline-flex items-center px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh Telemetry
        </button>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-slate-400 text-xs">Total Users</div>
          <div className="text-2xl font-bold text-white mt-1">{metrics.totalUsers ?? 0}</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-slate-400 text-xs">Active Users</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{metrics.activeUsers ?? 0}</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-slate-400 text-xs">Locked Accounts</div>
          <div className="text-2xl font-bold text-red-400 mt-1">{metrics.lockedUsers ?? 0}</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-slate-400 text-xs">Total Requests</div>
          <div className="text-2xl font-bold text-white mt-1">{metrics.totalRequests ?? 0}</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-slate-400 text-xs">Denied Requests</div>
          <div className="text-2xl font-bold text-orange-400 mt-1">{metrics.deniedRequests ?? 0}</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-slate-400 text-xs">High-Risk Events</div>
          <div className="text-2xl font-bold text-indigo-400 mt-1">{metrics.highRiskRequests ?? 0}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800 flex space-x-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Identity & Role Management
        </button>
        <button
          onClick={() => setActiveTab('devices')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'devices'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Device Trust & Compliance
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'alerts'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Recent Security Incidents
        </button>
      </div>

      {/* Tab: Users Management */}
      {activeTab === 'users' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Assigned Roles</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">
                        {u.firstName} {u.lastName}
                      </div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {u.userRoles?.map((ur: any) => (
                          <span
                            key={ur.role?.name}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-slate-300"
                          >
                            {ur.role?.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => setRoleModalUser(u)}
                        className="px-2.5 py-1 rounded bg-indigo-950/60 border border-indigo-800/60 hover:bg-indigo-900 text-indigo-300 text-xs font-semibold transition-colors"
                      >
                        Assign Role
                      </button>
                      {u.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleDisableUser(u.id)}
                          className="px-2.5 py-1 rounded bg-red-950/60 border border-red-800/60 hover:bg-red-900 text-red-300 text-xs font-semibold transition-colors"
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Devices Trust & Compliance */}
      {activeTab === 'devices' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Device</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4">OS / Browser</th>
                  <th className="py-3 px-4">Trust Score</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4 text-right">Zero-Trust Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {devices.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">{d.name}</td>
                    <td className="py-3.5 px-4 text-slate-400 text-xs">
                      {d.user?.firstName} {d.user?.lastName} ({d.user?.email})
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {d.os || 'Unknown OS'} • {d.browser || 'Unknown Browser'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-xs">{d.trustScore}/100</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          d.status === 'TRUSTED' || d.status === 'COMPLIANT'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : d.status === 'COMPROMISED'
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {d.status !== 'COMPROMISED' ? (
                        <button
                          onClick={() => handleUpdateDeviceStatus(d.id, 'COMPROMISED')}
                          className="px-2 py-1 rounded bg-red-950/60 border border-red-800/60 hover:bg-red-900 text-red-300 text-xs font-semibold"
                        >
                          Mark Compromised
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateDeviceStatus(d.id, 'TRUSTED')}
                          className="px-2 py-1 rounded bg-emerald-950/60 border border-emerald-800/60 hover:bg-emerald-900 text-emerald-300 text-xs font-semibold"
                        >
                          Restore Trust
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Security Incidents */}
      {activeTab === 'alerts' && (
        <div className="space-y-3">
          {stats?.recentSecurityEvents?.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              No recent security incidents detected.
            </div>
          ) : (
            stats?.recentSecurityEvents?.map((evt: any) => (
              <div
                key={evt.id}
                className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-start justify-between"
              >
                <div className="flex items-start space-x-3">
                  <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-xs">{evt.action}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 uppercase font-mono">
                        {evt.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Actor: <code className="text-slate-300">{evt.actorEmail || 'Anonymous'}</code> • Resource:{' '}
                      <code className="text-slate-300">{evt.resource || 'Unknown'}</code> • Result:{' '}
                      <strong className="text-red-400">{evt.result}</strong>
                    </p>
                  </div>
                </div>
                <div className="text-right text-[11px] font-mono text-slate-500">
                  {new Date(evt.timestamp).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: Role Assignment */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-1">Assign User Role</h3>
            <p className="text-xs text-slate-400 mb-4">
              Modifying role for <strong className="text-slate-200">{roleModalUser.email}</strong>.
            </p>

            {actionError && (
              <div className="mb-4 p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-200 text-xs">
                {actionError}
              </div>
            )}

            <form onSubmit={handleAssignRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Role to Assign
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="EMPLOYEE">EMPLOYEE</option>
                  <option value="RESOURCE_OWNER">RESOURCE_OWNER</option>
                  <option value="SECURITY_ADMIN">SECURITY_ADMIN</option>
                  <option value="AUDITOR">AUDITOR</option>
                  <option value="SYSTEM_ADMIN">SYSTEM_ADMIN</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRoleModalUser(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500"
                >
                  Confirm Role Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
