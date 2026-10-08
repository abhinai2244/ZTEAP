'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Shield,
  KeyRound,
  Users,
  Layers,
  FileText,
  LogOut,
  Laptop,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then((data) => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        router.push('/login');
      });
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm font-medium">Verifying Zero-Trust Session...</p>
        </div>
      </div>
    );
  }

  const roles: string[] = user?.roles || [];
  const isAdmin = roles.includes('SECURITY_ADMIN') || roles.includes('SYSTEM_ADMIN');
  const isOwner = roles.includes('RESOURCE_OWNER');
  const isAuditor = roles.includes('AUDITOR');

  const navItems = [
    { name: 'My Access', href: '/employee', icon: KeyRound, show: true },
    { name: 'Security Admin', href: '/admin', icon: Shield, show: isAdmin },
    { name: 'App Approvals', href: '/owner', icon: Layers, show: isOwner || isAdmin },
    { name: 'Audit Logs', href: '/auditor', icon: FileText, show: isAuditor || isAdmin },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/10 dark:bg-indigo-600/20 border border-indigo-500/20 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Shield className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">ZTAP</span>
            </Link>

            <nav className="hidden md:flex space-x-1">
              {navItems.filter((i) => i.show).map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {user?.firstName} {user?.lastName}
              </span>
              <div className="flex items-center justify-end space-x-1">
                {roles.map((r) => (
                  <span
                    key={r}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                      r === 'SECURITY_ADMIN'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : r === 'RESOURCE_OWNER'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : r === 'AUDITOR'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-950/30 dark:hover:bg-red-950/30 light:hover:bg-red-100 transition-colors border border-transparent hover:border-red-900/40"
                title="Terminate Session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Security Status Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 bg-white/60 dark:bg-slate-950/60 py-4 px-6 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="flex items-center justify-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-slate-700 dark:text-slate-300">Zero-Trust Policy Enforcement Engine Active</span>
          <span className="text-slate-400">•</span>
          <span>Continuous Dynamic Evaluation</span>
        </div>
      </footer>
    </div>
  );
}
