import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTrading } from '@/context/TradingContext';
import { formatCurrency } from '@/lib/instruments';
import {
  RotateCcw,
  User,
  Shield,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Database,
  Radio,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, isConfigured } = useAuth();
  const { account, resetBalance } = useTrading();
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset your virtual demo balance to $10,000.00 USD? All open positions will be closed.')) {
      setResetting(true);
      await resetBalance();
      setResetting(false);
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 4000);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-black text-white">Account &amp; System Settings</h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your demo trading profile, virtual balance resets, and inspect live market data feeds.
        </p>
      </div>

      {resetSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Demo account successfully reset! Virtual balance is now $10,000.00 USD.</span>
        </div>
      )}

      {/* 1. Profile & Account Info */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <User className="w-4 h-4 text-emerald-400" />
          <span>Trader Profile</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-slate-500 text-[11px] block font-sans">Full Name / Display</span>
            <span className="font-semibold text-slate-200 text-sm">
              {user?.full_name || 'Demo Trader'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-slate-500 text-[11px] block font-sans">Email Address</span>
            <span className="font-semibold text-slate-200 text-sm truncate block">
              {user?.email || 'demo.trader@wellstrading.com'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-slate-500 text-[11px] block font-sans">Demo Account ID</span>
            <span className="font-semibold text-slate-200 text-sm">
              {account?.account_number || 'WT-100000'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-slate-500 text-[11px] block font-sans">Account Currency</span>
            <span className="font-semibold text-emerald-400 text-sm">USD ($)</span>
          </div>
        </div>
      </div>

      {/* 2. Virtual Capital Reset (Important requirement from Section 7) */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <RotateCcw className="w-4 h-4 text-amber-400" />
          <span>Virtual Capital Management</span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Need a fresh start? Resetting your virtual demo balance restores your account to exactly $10,000.00 USD and closes any existing open positions.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-amber-400">Current Virtual Balance</div>
            <div className="text-xl font-black font-mono text-white">
              {formatCurrency(account?.balance || 10000)}
            </div>
          </div>

          <button
            onClick={handleReset}
            disabled={resetting}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>{resetting ? 'Resetting Balance...' : 'Reset to $10,000 USD'}</span>
          </button>
        </div>
      </div>

      {/* 3. API Integrations & Serverless Infrastructure Status */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <Server className="w-4 h-4 text-sky-400" />
          <span>Market Engine &amp; Supabase Infrastructure</span>
        </div>

        <div className="divide-y divide-slate-800 text-xs">
          {/* Predefined Algorithmic Engine */}
          <div className="py-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-200">Predefined Algorithmic Market Engine</div>
              <div className="text-[11px] text-slate-500">
                Low-latency 1s synchronized ticks, admin-defined trajectories (UP/DOWN/TARGETS), customized currency pairs.
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Active (1000ms Loop)</span>
            </div>
          </div>

          {/* Supabase */}
          <div className="py-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-200">Database &amp; Auth: Supabase PostgreSQL</div>
              <div className="text-[11px] text-slate-500">
                Managed authentication, Row Level Security, market instruments storage, and atomic paper trading stored procedures.
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-[11px] font-medium font-mono">
              <Database className="w-3.5 h-3.5" />
              <span>{isConfigured ? 'Connected to Supabase' : 'Offline / Local Demo Engine'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
