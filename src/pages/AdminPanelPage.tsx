import React, { useState, useEffect } from 'react';
import { MarketDataService } from '@/services/marketData';
import { Instrument, MarketTrend, MarketQuote, AssetClass, AdminSettings, AdminAuditLog } from '@/types';
import { formatPrice } from '@/lib/instruments';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Zap,
  Target,
  RefreshCw,
  Sliders,
  Shield,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Database,
  Lock,
  User,
  Users,
  History,
  Settings as SettingsIcon,
  Check,
  Key,
  Eye,
  EyeOff,
  LogOut,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface AdminUserRecord {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_admin: boolean;
  created_at: string;
  account_number: string;
  balance: number;
  equity: number;
  leverage: number;
}

export const AdminPanelPage: React.FC = () => {
  const { user } = useAuth();

  // Admin Portal Authentication State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return (
      sessionStorage.getItem('wt_admin_session') === 'authenticated' ||
      localStorage.getItem('wt_admin_session') === 'authenticated'
    );
  });
  const [adminEmail, setAdminEmail] = useState('admin@wellstrading.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'CONTROLS' | 'USERS' | 'SETTINGS' | 'LOGS'>('CONTROLS');
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Users State
  const [usersList, setUsersList] = useState<AdminUserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Target price input state per symbol
  const [targetInputs, setTargetInputs] = useState<Record<string, string>>({});

  // Admin Settings State
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  // New Custom Pair Form State
  const [newPair, setNewPair] = useState({
    symbol: '',
    name: '',
    assetClass: 'FOREX' as AssetClass,
    basePrice: '',
    digits: 5,
    direction: 'UP' as MarketTrend,
    strength: 1.0,
    volatility: 'MEDIUM',
    targetPrice: '',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Authenticate Admin
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    // Admin passcode requirement: admin123
    if (adminPassword.trim() === 'admin123') {
      sessionStorage.setItem('wt_admin_session', 'authenticated');
      localStorage.setItem('wt_admin_session', 'authenticated');
      setIsAdminLoggedIn(true);
      showToast('Admin authenticated successfully');
      refreshList();
      loadUsersList();
    } else {
      setLoginError('Invalid administrator password. Access denied.');
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('wt_admin_session');
    localStorage.removeItem('wt_admin_session');
    setIsAdminLoggedIn(false);
    setAdminPassword('');
    showToast('Admin session terminated');
  };

  // Load instruments & settings
  const refreshList = async () => {
    const list = MarketDataService.getAllInstruments();
    setInstruments([...list]);
    const s = await MarketDataService.getAdminSettings();
    if (s) setSettings(s as any);
    const logs = await MarketDataService.getAuditLogs(20);
    if (logs) setAuditLogs(logs as any);
  };

  // Load registered users from Supabase RPC
  const loadUsersList = async () => {
    setLoadingUsers(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.rpc('admin_get_users_list');
        if (!error && data) {
          setUsersList(data as AdminUserRecord[]);
        }
      }
    } catch (err) {
      console.warn('Error loading users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isAdminLoggedIn) {
      refreshList();
      loadUsersList();

      // Subscribe to all 1-second price ticks
      const unsubscribe = MarketDataService.subscribeAll((newQuotes) => {
        setQuotes({ ...newQuotes });
      });

      const interval = setInterval(() => {
        setInstruments([...MarketDataService.getAllInstruments()]);
      }, 2000);

      return () => {
        unsubscribe();
        clearInterval(interval);
      };
    }
  }, [isAdminLoggedIn]);

  // Admin changes direction (UP / DOWN / SIDEWAYS)
  const handleSetDirection = async (symbol: string, direction: MarketTrend) => {
    setLoading(true);
    await MarketDataService.updateInstrumentTrend(symbol, direction);
    refreshList();
    setLoading(false);
    showToast(`Set ${symbol} direction to ${direction}`);
  };

  // Admin applies target price
  const handleApplyTarget = async (symbol: string) => {
    const val = parseFloat(targetInputs[symbol]);
    if (isNaN(val) || val <= 0) {
      showToast('Please enter a valid target price');
      return;
    }

    const currentInst = MarketDataService.getInstrument(symbol);
    const direction: MarketTrend = val > currentInst.currentPrice ? 'UP' : 'DOWN';

    setLoading(true);
    await MarketDataService.updateInstrumentTrend(symbol, direction, {
      targetPrice: val,
      algorithm: 'TARGET_SEEK',
    });
    refreshList();
    setLoading(false);
    showToast(`Target price ${val} applied for ${symbol}. Seeking target.`);
  };

  // Quick Pump (+3%)
  const handleQuickPump = async (symbol: string) => {
    const inst = MarketDataService.getInstrument(symbol);
    const target = inst.currentPrice * 1.03;
    await MarketDataService.updateInstrumentTrend(symbol, 'UP', {
      targetPrice: target,
      strength: 2.5,
      algorithm: 'PUMP',
    });
    refreshList();
    showToast(`🚀 PUMP initiated for ${symbol} (+3%)`);
  };

  // Quick Dump (-3%)
  const handleQuickDump = async (symbol: string) => {
    const inst = MarketDataService.getInstrument(symbol);
    const target = inst.currentPrice * 0.97;
    await MarketDataService.updateInstrumentTrend(symbol, 'DOWN', {
      targetPrice: target,
      strength: 2.5,
      algorithm: 'DUMP',
    });
    refreshList();
    showToast(`🔻 DUMP initiated for ${symbol} (-3%)`);
  };

  // Delete Custom Pair
  const handleDelete = async (symbol: string) => {
    if (confirm(`Are you sure you want to delete custom pair ${symbol}?`)) {
      await MarketDataService.deleteInstrument(symbol);
      refreshList();
      showToast(`Deleted ${symbol}`);
    }
  };

  // Save Settings
  const handleSaveSettings = async (updates: Partial<AdminSettings>) => {
    if (!settings) return;
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    await MarketDataService.updateAdminSettings(updates);
    showToast('Platform settings updated');
  };

  // Create Custom Pair Submit
  const handleCreatePair = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSym = newPair.symbol.trim().toUpperCase();
    const baseP = parseFloat(newPair.basePrice);

    if (!cleanSym || isNaN(baseP) || baseP <= 0) {
      alert('Please provide a valid symbol and starting price');
      return;
    }

    const volMap: Record<string, number> = {
      LOW: 0.0001,
      MEDIUM: 0.0003,
      HIGH: 0.0008,
    };

    const targetVal = newPair.targetPrice ? parseFloat(newPair.targetPrice) : undefined;

    const res = await MarketDataService.createCustomInstrument({
      symbol: cleanSym,
      name: newPair.name || cleanSym,
      assetClass: newPair.assetClass,
      basePrice: baseP,
      digits: Number(newPair.digits),
      direction: newPair.direction,
      strength: Number(newPair.strength),
      volatility: volMap[newPair.volatility] || 0.0003,
      targetPrice: targetVal,
    });

    if (res.success) {
      setShowCreateModal(false);
      setNewPair({
        symbol: '',
        name: '',
        assetClass: 'FOREX',
        basePrice: '',
        digits: 5,
        direction: 'UP',
        strength: 1.0,
        volatility: 'MEDIUM',
        targetPrice: '',
      });
      refreshList();
      showToast(`Custom pair ${cleanSym} successfully created!`);
    } else {
      alert(res.error || 'Failed to create instrument');
    }
  };

  // ============================================================================
  // VIEW 1: ADMIN LOGIN PORTAL (Gated with admin pass: admin123)
  // ============================================================================
  if (!isAdminLoggedIn) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4 bg-[#070b14] font-sans">
        <div className="w-full max-w-md rounded-2xl bg-[#090e1a] border border-slate-800 p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          {/* Subtle Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-inner">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-white">
                WELLSTRADING ADMIN PORTAL
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Restricted gateway for master market controls &amp; accounts management.
              </p>
            </div>
          </div>

          {loginError && (
            <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Admin Email</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@wellstrading.com"
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Admin Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter administrator passcode"
                  className="w-full h-10 pl-9 pr-10 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Master password: <span className="font-mono font-bold text-emerald-400">admin123</span>
              </p>
            </div>

            <button
              type="submit"
              className="w-full h-10 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-2"
            >
              <Key className="w-4 h-4" />
              <span>Unlock Admin Panel</span>
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <Link
              to="/trade/EUR-USD"
              className="text-xs text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Return to Public Trading Terminal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VIEW 2: AUTHENTICATED ADMIN DASHBOARD
  // ============================================================================
  const totalPairs = instruments.length;
  const upPairs = instruments.filter((i) => i.direction === 'UP').length;
  const downPairs = instruments.filter((i) => i.direction === 'DOWN').length;

  return (
    <div className="flex-1 w-full bg-[#070b14] text-slate-100 min-h-[calc(100vh-3.5rem)] p-4 md:p-8 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-500 text-slate-950 font-bold px-4 py-2.5 rounded-lg shadow-xl text-xs animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Shield className="w-5 h-5" />
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Admin Control &amp; Market Engine
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                LIVE 1-SEC ALGORITHM
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Deterministic trajectories, instant shocks, user accounts, and Supabase controls.
            </p>
          </div>

          {/* Admin Identity & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400">Admin:</span>
              <span className="font-bold text-white">{adminEmail}</span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                ROOT
              </span>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Custom Pair</span>
            </button>

            <Link
              to="/trade/EUR-USD"
              className="px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span>Terminal</span>
            </Link>

            <button
              onClick={handleAdminLogout}
              className="px-3 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors flex items-center gap-1.5"
              title="Lock Admin Portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Lock Portal</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('CONTROLS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'CONTROLS'
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Market Trajectory Controls ({instruments.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('USERS');
              loadUsersList();
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'USERS'
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Accounts &amp; Details ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'SETTINGS'
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Platform &amp; Database Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('LOGS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
              activeTab === 'LOGS'
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit History ({auditLogs.length})</span>
          </button>
        </div>

        {/* TAB 1: MARKET TRAJECTORY CONTROLS */}
        {activeTab === 'CONTROLS' && (
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 text-xs font-medium">Total Active Pairs</span>
                <p className="text-2xl font-black text-white mt-1">{totalPairs}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-emerald-400 text-xs font-medium flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Bullish Trajectories (UP)</span>
                </span>
                <p className="text-2xl font-black text-emerald-400 mt-1">{upPairs}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-rose-400 text-xs font-medium flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Bearish Trajectories (DOWN)</span>
                </span>
                <p className="text-2xl font-black text-rose-400 mt-1">{downPairs}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-sky-400 text-xs font-medium flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tick Engine Latency</span>
                </span>
                <p className="text-2xl font-black text-sky-400 mt-1 font-mono">1,000ms</p>
              </div>
            </div>

            {/* Instruments Management Table */}
            <div className="rounded-xl border border-slate-800 bg-[#090e1a] overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">Live Instrument Matrix</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live second-by-second updates broadcast to all active client charts.
                  </p>
                </div>
                <button
                  onClick={() => refreshList()}
                  className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#070b14] text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Symbol / Name</th>
                      <th className="py-3 px-4">Live Price</th>
                      <th className="py-3 px-4">Active Trajectory</th>
                      <th className="py-3 px-4">Target Price Control</th>
                      <th className="py-3 px-4">Instant Shocks</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {instruments.map((inst) => {
                      const quote = quotes[inst.symbol];
                      const currentPrice = quote ? quote.price : inst.currentPrice;
                      const isUp = inst.direction === 'UP';
                      const isDown = inst.direction === 'DOWN';

                      return (
                        <tr key={inst.symbol} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white font-mono text-sm">
                                {inst.symbol}
                              </span>
                              {inst.isCustom && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-400 font-semibold border border-purple-500/30">
                                  CUSTOM
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400">{inst.name}</span>
                          </td>

                          <td className="py-3 px-4 font-mono font-bold text-sm">
                            <span className={quote && quote.changePercent24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {formatPrice(currentPrice, inst.digits)}
                            </span>
                            {quote && (
                              <div className="text-[10px] text-slate-500 font-sans">
                                24h: {quote.changePercent24h >= 0 ? '+' : ''}
                                {quote.changePercent24h.toFixed(2)}%
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleSetDirection(inst.symbol, 'UP')}
                                className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all ${
                                  isUp
                                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                                    : 'bg-slate-900 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10'
                                }`}
                              >
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                <span>UP</span>
                              </button>
                              <button
                                onClick={() => handleSetDirection(inst.symbol, 'DOWN')}
                                className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all ${
                                  isDown
                                    ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/30'
                                    : 'bg-slate-900 text-rose-400 border border-rose-500/20 hover:bg-rose-500/10'
                                }`}
                              >
                                <ArrowDownRight className="w-3.5 h-3.5" />
                                <span>DOWN</span>
                              </button>
                              <button
                                onClick={() => handleSetDirection(inst.symbol, 'SIDEWAYS')}
                                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                                  inst.direction === 'SIDEWAYS'
                                    ? 'bg-slate-200 text-slate-950'
                                    : 'bg-slate-900 text-slate-400 border border-slate-700 hover:text-white'
                                }`}
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 max-w-xs">
                              <input
                                type="number"
                                step="any"
                                placeholder={inst.targetPrice ? String(inst.targetPrice) : 'Target $'}
                                value={targetInputs[inst.symbol] || ''}
                                onChange={(e) =>
                                  setTargetInputs({ ...targetInputs, [inst.symbol]: e.target.value })
                                }
                                className="w-28 h-8 px-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                              />
                              <button
                                onClick={() => handleApplyTarget(inst.symbol)}
                                className="h-8 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1 transition-colors"
                              >
                                <Target className="w-3 h-3 text-emerald-400" />
                                <span>Seek</span>
                              </button>
                            </div>
                            {inst.targetPrice && (
                              <div className="text-[10px] text-amber-400 font-mono mt-1">
                                Seeking target: {inst.targetPrice}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleQuickPump(inst.symbol)}
                                className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 transition-colors"
                              >
                                <Zap className="w-3 h-3" />
                                <span>+3% PUMP</span>
                              </button>
                              <button
                                onClick={() => handleQuickDump(inst.symbol)}
                                className="px-2 py-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 text-[11px] font-bold flex items-center gap-1 transition-colors"
                              >
                                <Zap className="w-3 h-3" />
                                <span>-3% DUMP</span>
                              </button>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to={`/trade/${inst.symbol.replace('/', '-')}`}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                title="Open in Terminal"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                              {inst.isCustom && (
                                <button
                                  onClick={() => handleDelete(inst.symbol)}
                                  className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                                  title="Delete Pair"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USER ACCOUNTS & DETAILS */}
        {activeTab === 'USERS' && (
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 text-xs font-medium">Registered User Profiles</span>
                <p className="text-2xl font-black text-white mt-1">{usersList.length}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-emerald-400 text-xs font-medium">Total Virtual Capital Issued</span>
                <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                  ${(usersList.length * 10000).toLocaleString()}.00 USD
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-sky-400 text-xs font-medium">Verification Protocol</span>
                <p className="text-xl font-black text-sky-400 mt-1">Instant (Auto-Confirmed)</p>
              </div>
            </div>

            {/* Users Table */}
            <div className="rounded-xl border border-slate-800 bg-[#090e1a] overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">Registered User Database</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    User profiles and virtual trading accounts stored in remote Supabase database.
                  </p>
                </div>
                <button
                  onClick={loadUsersList}
                  disabled={loadingUsers}
                  className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                  <span>Refresh Users</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#070b14] text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">User Details</th>
                      <th className="py-3 px-4">Role / Privileges</th>
                      <th className="py-3 px-4">Trading Account</th>
                      <th className="py-3 px-4">Demo Balance</th>
                      <th className="py-3 px-4">Leverage</th>
                      <th className="py-3 px-4 text-right">Registration Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white text-xs">{u.full_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                          <div className="text-[10px] text-slate-600 font-mono mt-0.5">ID: {u.id.substring(0, 8)}...</div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              u.role === 'ADMIN' || u.is_admin
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {u.role === 'ADMIN' || u.is_admin ? 'ADMINISTRATOR' : 'TRADER'}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-sky-400 text-xs">
                          {u.account_number || 'WT-100000'}
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-xs">
                          ${Number(u.balance || 10000).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-300">
                          1:{u.leverage || 100}
                        </td>

                        <td className="py-3 px-4 text-right text-slate-400 font-mono text-[11px]">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Active'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PLATFORM & DATABASE SETTINGS */}
        {activeTab === 'SETTINGS' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-[#090e1a] p-6 space-y-6">
              <div>
                <h3 className="font-bold text-base text-white">Global Platform Configuration</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Adjust global runtime parameters stored in Supabase `admin_settings`.
                </p>
              </div>

              {settings && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Market Operational Status</label>
                    <div className="flex items-center gap-2">
                      {(['OPEN', 'HALTED', 'MAINTENANCE'] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => handleSaveSettings({ market_status: st })}
                          className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                            settings.market_status === st
                              ? 'bg-emerald-500 text-slate-950 font-black'
                              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Default Client Leverage</label>
                    <div className="flex items-center gap-2">
                      {[50, 100, 200, 500].map((lev) => (
                        <button
                          key={lev}
                          onClick={() => handleSaveSettings({ default_leverage: lev })}
                          className={`px-3 py-2 rounded-lg text-xs font-bold font-mono transition-all ${
                            settings.default_leverage === lev
                              ? 'bg-sky-500 text-slate-950 font-black'
                              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                          }`}
                        >
                          1:{lev}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Demo Initial Balance ($)</label>
                    <input
                      type="number"
                      value={settings.demo_initial_balance}
                      onChange={(e) =>
                        handleSaveSettings({ demo_initial_balance: parseFloat(e.target.value) || 10000 })
                      }
                      className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Tick Interval (ms)</label>
                    <input
                      type="number"
                      value={settings.tick_interval_ms}
                      onChange={(e) =>
                        handleSaveSettings({ tick_interval_ms: parseInt(e.target.value) || 1000 })
                      }
                      className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT HISTORY */}
        {activeTab === 'LOGS' && (
          <div className="rounded-xl border border-slate-800 bg-[#090e1a] overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">Administrative Audit Trail</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Record of market trajectory modifications, price shocks, and setting adjustments.
                </p>
              </div>
              <button
                onClick={refreshList}
                className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No administrative actions recorded yet.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#070b14] text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4">Timestamp</th>
                      <th className="py-2.5 px-4">Action</th>
                      <th className="py-2.5 px-4">Target Instrument</th>
                      <th className="py-2.5 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-4 font-mono text-slate-400 text-[11px]">
                          {new Date(log.created_at).toLocaleTimeString()}{' '}
                          <span className="text-slate-600">
                            {new Date(log.created_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-emerald-400 border border-slate-700">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-bold text-white font-mono">
                          {log.target_symbol || '—'}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-300">
                          {log.details ? JSON.stringify(log.details) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Create Customized Currency Pair */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0b1120] border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Create Customized Currency Pair</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePair} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Symbol *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SOL/USD or XAU/EUR"
                    value={newPair.symbol}
                    onChange={(e) => setNewPair({ ...newPair, symbol: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Asset Class</label>
                  <select
                    value={newPair.assetClass}
                    onChange={(e) => setNewPair({ ...newPair, assetClass: e.target.value as any })}
                    className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="FOREX">Forex</option>
                    <option value="CRYPTO">Crypto</option>
                    <option value="COMMODITIES">Commodities</option>
                    <option value="STOCKS">Stocks</option>
                    <option value="INDICES">Indices</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Solana / US Dollar"
                  value={newPair.name}
                  onChange={(e) => setNewPair({ ...newPair, name: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Starting Base Price *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 150.25"
                    value={newPair.basePrice}
                    onChange={(e) => setNewPair({ ...newPair, basePrice: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Price Decimals</label>
                  <select
                    value={newPair.digits}
                    onChange={(e) => setNewPair({ ...newPair, digits: Number(e.target.value) })}
                    className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value={2}>2 (e.g. Crypto/Stocks: 100.25)</option>
                    <option value={3}>3 (e.g. JPY: 154.250)</option>
                    <option value={4}>4 (0.0001)</option>
                    <option value={5}>5 (e.g. FX standard: 1.08500)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Initial Trajectory</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setNewPair({ ...newPair, direction: 'UP' })}
                      className={`h-9 rounded-lg font-bold ${
                        newPair.direction === 'UP'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-950 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      ▲ UP
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPair({ ...newPair, direction: 'DOWN' })}
                      className={`h-9 rounded-lg font-bold ${
                        newPair.direction === 'DOWN'
                          ? 'bg-rose-500 text-slate-950'
                          : 'bg-slate-950 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      ▼ DOWN
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Drift Volatility</label>
                  <select
                    value={newPair.volatility}
                    onChange={(e) => setNewPair({ ...newPair, volatility: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="LOW">Low (Calm FX)</option>
                    <option value="MEDIUM">Medium (Normal)</option>
                    <option value="HIGH">High (Crypto Shocks)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-lg shadow-sm"
                >
                  Create &amp; Broadcast to All Users
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanelPage;
