'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Mail, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Route based on role
      const roles: string[] = data.user.roles || [];
      if (roles.includes('SECURITY_ADMIN') || roles.includes('SYSTEM_ADMIN')) {
        router.push('/admin');
      } else if (roles.includes('RESOURCE_OWNER')) {
        router.push('/owner');
      } else if (roles.includes('AUDITOR')) {
        router.push('/auditor');
      } else {
        router.push('/employee');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('P@ssw0rd!2024');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-900 dark:text-slate-100 transition-colors relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/10 dark:bg-indigo-600/20 border border-indigo-500/20 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 mb-4 shadow-lg shadow-indigo-500/10">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">ZTAP</h2>
        <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
          Zero-Trust Enterprise Access Portal
        </p>
        <p className="text-xs text-indigo-600 dark:text-indigo-400/80 mt-1 uppercase tracking-wider font-semibold">
          Continuous Risk-Adaptive Policy Enforcement
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900/90 py-8 px-4 shadow-xl dark:shadow-2xl border border-slate-200 dark:border-slate-800 rounded-2xl sm:px-10 backdrop-blur-xl">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-800/60 flex items-start space-x-3 text-red-200 text-sm">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Work Email
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@enterprise.com"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Master Password
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Authenticate & Verify Identity
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credential Selectors for evaluators */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 text-center">
              Evaluator Demo Quick-Login
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials('employee@example.com')}
                className="text-left px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs transition-colors"
              >
                <div className="font-semibold text-slate-800 dark:text-slate-200">Employee</div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px] truncate">employee@example.com</div>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('securityadmin@example.com')}
                className="text-left px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs transition-colors"
              >
                <div className="font-semibold text-indigo-600 dark:text-indigo-400">Security Admin</div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px] truncate">securityadmin@example.com</div>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('owner@example.com')}
                className="text-left px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs transition-colors"
              >
                <div className="font-semibold text-amber-600 dark:text-amber-400">Resource Owner</div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px] truncate">owner@example.com</div>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('auditor@example.com')}
                className="text-left px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs transition-colors"
              >
                <div className="font-semibold text-emerald-600 dark:text-emerald-400">Auditor</div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px] truncate">auditor@example.com</div>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mt-3">
              Default password: <code className="text-slate-800 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">P@ssw0rd!2024</code> (Argon2id hashed)
            </p>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await fetch('/api/auth/reset-lockout', { method: 'POST' });
                    const d = await res.json();
                    if (d.success) {
                      setError(null);
                      alert('Rate limit reset & accounts unlocked successfully!');
                    } else {
                      setError('Failed to reset: ' + d.error);
                    }
                  } catch (e: any) {
                    setError('Reset failed: ' + e.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-mono"
              >
                [Reset Rate Limit & Unlock Demo Accounts]
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
