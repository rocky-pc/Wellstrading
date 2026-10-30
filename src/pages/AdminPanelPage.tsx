import React, { useState, useEffect } from 'react';
import { MarketDataService } from '@/services/marketData';
import { Instrument, MarketTrend, MarketQuote, AssetClass, AdminSettings, AdminAuditLog } from '@/types';
import { formatPrice } from '@/lib/instruments';
import { useAuth } from '@/context/AuthContext';
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
  History,
  Settings as SettingsIcon,
  Check,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminPanelPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'CONTROLS' | 'SETTINGS' | 'LOGS'>('CONTROLS');
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Load instruments & settings
  const refreshList = async () => {
    const list = MarketDataService.getAllInstruments();
    setInstruments([...list]);
    const s = await MarketDataService.getAdminSettings();
    if (s) setSettings(s as any);
    const logs = await MarketDataService.getAuditLogs(20);
    if (logs) setAuditLogs(logs as any);
  };

  useEffect(() => {
    refreshList();

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
  }, []);

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
              Deterministic trajectories, instant shocks, custom pairs, and Supabase database controls.
            </p>
          </div>

          {/* Admin Identity & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400">Admin:</span>
              <span className="font-bold text-white">
                {user?.email || 'sjega82@gmail.com'}
              </span>
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
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('CONTROLS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'CONTROLS'
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Market Trajectory Controls ({instruments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
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
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'LOGS'
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit History</span>
          </button>
        </div>

        {/* TAB 1: CONTROLS */}
        {activeTab === 'CONTROLS' && (
          <div className="space-y-6">
            {/* Stats Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#0b1120] border border-slate-800/80 rounded-xl p-3.5">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Pairs</span>
                <div className="text-xl font-bold text-white mt-0.5">{totalPairs}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Predefined + Custom</div>
              </div>

              <div className="bg-[#0b1120] border border-slate-800/80 rounded-xl p-3.5">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Bullish (UP)</span>
                <div className="text-xl font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  <span>{upPairs}</span>
                </div>
                <div className="text-[10px] text-emerald-500/70 mt-0.5">Climbing sec by sec</div>
              </div>

              <div className="bg-[#0b1120] border border-slate-800/80 rounded-xl p-3.5">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Bearish (DOWN)</span>
                <div className="text-xl font-bold text-rose-400 mt-0.5 flex items-center gap-1">
                  <TrendingDown className="w-4 h-4" />
                  <span>{downPairs}</span>
                </div>
                <div className="text-[10px] text-rose-500/70 mt-0.5">Falling sec by sec</div>
              </div>

              <div className="bg-[#0b1120] border border-slate-800/80 rounded-xl p-3.5">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Engine Latency</span>
                <div className="text-xl font-bold text-sky-400 mt-0.5 flex items-center gap-1">
                  <Activity className="w-4 h-4 animate-pulse" />
                  <span>{settings?.tick_interval_ms || 1000}ms</span>
                </div>
                <div className="text-[10px] text-sky-500/70 mt-0.5">Synchronized for all users</div>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {instruments.map((inst) => {
                const liveQuote = quotes[inst.symbol];
                const curPrice = liveQuote ? liveQuote.price : inst.currentPrice;
                const isUp = inst.direction === 'UP';
                const isDown = inst.direction === 'DOWN';
                const isFlat = inst.direction === 'SIDEWAYS';
                const targetVal = targetInputs[inst.symbol] || (inst.targetPrice ? String(inst.targetPrice) : '');

                return (
                  <div
                    key={inst.symbol}
                    className={`bg-[#090e1a] rounded-xl border p-4 transition-all duration-200 ${
                      isUp
                        ? 'border-emerald-500/30 hover:border-emerald-500/60'
                        : isDown
                        ? 'border-rose-500/30 hover:border-rose-500/60'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Pair Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-base text-white">{inst.symbol}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            {inst.assetClass}
                          </span>
                          {inst.isCustom && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              CUSTOM
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">{inst.name}</span>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-lg text-white">
                          {formatPrice(curPrice, inst.digits)}
                        </div>
                        <div
                          className={`text-xs font-mono font-semibold ${
                            liveQuote && liveQuote.changePercent24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {liveQuote && liveQuote.changePercent24h >= 0 ? '+' : ''}
                          {liveQuote ? liveQuote.changePercent24h.toFixed(2) : '0.00'}%
                        </div>
                      </div>
                    </div>

                    {/* Active Trajectory */}
                    <div className="my-3 py-1.5 px-3 rounded-lg bg-slate-900/90 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px]">ACTIVE TRAJECTORY:</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            isUp
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isDown
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {isUp ? '▲ MOVING UP' : isDown ? '▼ MOVING DOWN' : '— CONSOLIDATING'}
                        </span>
                      </div>

                      {inst.targetPrice && (
                        <div className="text-[11px] text-sky-400 flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          <span>Target: {formatPrice(inst.targetPrice, inst.digits)}</span>
                        </div>
                      )}
                    </div>

                    {/* Directional Buttons */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <button
                        onClick={() => handleSetDirection(inst.symbol, 'UP')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isUp
                            ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 font-black'
                            : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                        }`}
                      >
                        <ArrowUpRight className="w-4 h-4" />
                        <span>FORCE UP</span>
                      </button>

                      <button
                        onClick={() => handleSetDirection(inst.symbol, 'DOWN')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isDown
                            ? 'bg-rose-500 text-slate-950 shadow-lg shadow-rose-500/20 font-black'
                            : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20'
                        }`}
                      >
                        <ArrowDownRight className="w-4 h-4" />
                        <span>FORCE DOWN</span>
                      </button>

                      <button
                        onClick={() => handleSetDirection(inst.symbol, 'SIDEWAYS')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isFlat
                            ? 'bg-slate-200 text-slate-950 shadow font-black'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700'
                        }`}
                      >
                        <Minus className="w-4 h-4" />
                        <span>FLAT</span>
                      </button>
                    </div>

                    {/* Target Price Seeker & Quick Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
                      <div className="flex-1 min-w-[170px] flex items-center gap-1.5">
                        <input
                          type="number"
                          step="any"
                          placeholder={`Target price (e.g. ${formatPrice(curPrice * 1.02, inst.digits)})`}
                          value={targetVal}
                          onChange={(e) =>
                            setTargetInputs({ ...targetInputs, [inst.symbol]: e.target.value })
                          }
                          className="w-full bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                        />
                        <button
                          onClick={() => handleApplyTarget(inst.symbol)}
                          className="px-2.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded font-semibold whitespace-nowrap transition-colors"
                        >
                          Seek
                        </button>
                      </div>

                      <button
                        onClick={() => handleQuickPump(inst.symbol)}
                        title="Instant 3% rally"
                        className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded font-bold transition-colors flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3" />
                        <span>+3% Rally</span>
                      </button>

                      <button
                        onClick={() => handleQuickDump(inst.symbol)}
                        title="Instant 3% drop"
                        className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded font-bold transition-colors flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3" />
                        <span>-3% Drop</span>
                      </button>

                      <Link
                        to={`/trade/${inst.symbol.replace('/', '-')}`}
                        target="_blank"
                        className="p-1.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded transition-colors"
                        title="Open in Terminal"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>

                      {inst.isCustom && (
                        <button
                          onClick={() => handleDelete(inst.symbol)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded transition-colors"
                          title="Delete custom pair"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: SETTINGS & DATABASE */}
        {activeTab === 'SETTINGS' && (
          <div className="space-y-6">
            {/* Database & Connection Overview */}
            <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-sky-400" />
                  <h3 className="font-bold text-base text-white">Supabase Database Integration</h3>
                </div>
                <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Connected: rtcbdviyzkhxwaxwpzqn
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-slate-400">Database Engine</div>
                  <div className="font-bold text-slate-100 text-sm">PostgreSQL 17.6</div>
                  <div className="text-[10px] text-emerald-400">Row Level Security (RLS) Active</div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-slate-400">Project Ref ID</div>
                  <div className="font-bold text-slate-100 text-sm">rtcbdviyzkhxwaxwpzqn</div>
                  <div className="text-[10px] text-sky-400">Region: ap-southeast-2</div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-slate-400">Realtime Replication</div>
                  <div className="font-bold text-slate-100 text-sm">Enabled</div>
                  <div className="text-[10px] text-slate-400">market_instruments &amp; admin_settings</div>
                </div>
              </div>
            </div>

            {/* Platform Control Settings Form */}
            {settings && (
              <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-6 space-y-6">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-emerald-400" />
                  <span>Platform Parameters</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1.5">Global Market Status</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['OPEN', 'HALTED', 'MAINTENANCE'] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => handleSaveSettings({ market_status: status })}
                          className={`py-2 px-3 rounded-lg font-bold transition-colors ${
                            settings.market_status === status
                              ? 'bg-emerald-500 text-slate-950 shadow'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1.5">Default Account Leverage</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[50, 100, 200, 500].map((lev) => (
                        <button
                          key={lev}
                          type="button"
                          onClick={() => handleSaveSettings({ default_leverage: lev })}
                          className={`py-2 px-3 rounded-lg font-bold transition-colors font-mono ${
                            settings.default_leverage === lev
                              ? 'bg-emerald-500 text-slate-950 shadow'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          1:{lev}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1.5">Engine Tick Interval</label>
                    <div className="grid grid-cols-3 gap-2 font-mono">
                      {[500, 1000, 2000].map((ms) => (
                        <button
                          key={ms}
                          type="button"
                          onClick={() => handleSaveSettings({ tick_interval_ms: ms })}
                          className={`py-2 px-3 rounded-lg font-bold transition-colors ${
                            settings.tick_interval_ms === ms
                              ? 'bg-emerald-500 text-slate-950 shadow'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {ms === 1000 ? '1000ms (1s)' : `${ms}ms`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1.5">Virtual Demo Starting Balance</label>
                    <div className="flex items-center gap-2 font-mono">
                      <input
                        type="number"
                        value={settings.demo_initial_balance}
                        onChange={(e) =>
                          setSettings({ ...settings, demo_initial_balance: parseFloat(e.target.value) || 10000 })
                        }
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold w-48 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={() => handleSaveSettings({ demo_initial_balance: settings.demo_initial_balance })}
                        className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg font-bold transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AUDIT LOGS */}
        {activeTab === 'LOGS' && (
          <div className="bg-[#0b1120] border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                <span>Admin Actions &amp; Audit Logs</span>
              </h3>
              <button
                onClick={refreshList}
                className="p-1.5 rounded text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs font-mono">
                  No audit logs recorded yet. Changes made to pairs or settings will be tracked here.
                </div>
              ) : (
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#070b14] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4">Timestamp</th>
                      <th className="py-2.5 px-4">Action</th>
                      <th className="py-2.5 px-4">Target Symbol</th>
                      <th className="py-2.5 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-4 font-mono text-slate-400 text-[11px]">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-emerald-400 border border-slate-700">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0b1120] border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Create Customized Currency Pair</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePair} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Symbol (e.g. WELLS/USD)</label>
                  <input
                    type="text"
                    required
                    placeholder="BTC/EUR or WELLS/USD"
                    value={newPair.symbol}
                    onChange={(e) => setNewPair({ ...newPair, symbol: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Asset Class</label>
                  <select
                    value={newPair.assetClass}
                    onChange={(e) => setNewPair({ ...newPair, assetClass: e.target.value as AssetClass })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="FOREX">Forex</option>
                    <option value="CRYPTO">Crypto</option>
                    <option value="STOCKS">Stocks</option>
                    <option value="COMMODITIES">Commodities</option>
                    <option value="CUSTOM">Custom Synthetic</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Wells Global Index"
                  value={newPair.name}
                  onChange={(e) => setNewPair({ ...newPair, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Starting Base Price</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="1.2500 or 85000"
                    value={newPair.basePrice}
                    onChange={(e) => setNewPair({ ...newPair, basePrice: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Decimal Digits (Precision)</label>
                  <select
                    value={newPair.digits}
                    onChange={(e) => setNewPair({ ...newPair, digits: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value={2}>2 decimals (e.g. 150.50)</option>
                    <option value={3}>3 decimals (e.g. 152.450)</option>
                    <option value={4}>4 decimals (e.g. 1.2500)</option>
                    <option value={5}>5 decimals (e.g. 1.08642)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Initial Movement</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewPair({ ...newPair, direction: 'UP' })}
                      className={`py-2 rounded-lg font-bold text-xs ${
                        newPair.direction === 'UP'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      ▲ MOVE UP
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPair({ ...newPair, direction: 'DOWN' })}
                      className={`py-2 rounded-lg font-bold text-xs ${
                        newPair.direction === 'DOWN'
                          ? 'bg-rose-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      ▼ MOVE DOWN
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Volatility Jitter</label>
                  <select
                    value={newPair.volatility}
                    onChange={(e) => setNewPair({ ...newPair, volatility: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="LOW">Low (Smooth Institutional Trend)</option>
                    <option value="MEDIUM">Medium (Natural Forex Fluctuation)</option>
                    <option value="HIGH">High (Active Crypto Movement)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Optional Target Price</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Leave empty for continuous drift"
                  value={newPair.targetPrice}
                  onChange={(e) => setNewPair({ ...newPair, targetPrice: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
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
