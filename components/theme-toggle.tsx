'use client';

import React from 'react';
import { useTheme } from './theme-provider';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-2 rounded-xl transition-all duration-200 border ${
        theme === 'dark'
          ? 'bg-slate-800/80 text-amber-300 border-slate-700 hover:bg-slate-700 hover:text-amber-200'
          : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200 hover:text-indigo-600 shadow-sm'
      } ${className}`}
      aria-label="Toggle Dark / Light Theme"
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 transition-transform hover:-rotate-12" />
      )}
    </button>
  );
}
