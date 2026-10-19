import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTrading } from '@/context/TradingContext';
import { formatCurrency } from '@/lib/instruments';
import PositionsTable from '@/components/trading/PositionsTable';
import TradesHistoryTable from '@/components/trading/TradesHistoryTable';
import WatchlistWidget from '@/components/trading/WatchlistWidget';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Layers,
  RotateCcw,
  Shield,
  Activity,
  ArrowRight,
  PieChart,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const {
    account,
    equity,
    freeMargin,
    marginLevel,
    totalUnrealizedPnl,
    positions,
    trades,
    resetBalance,
  } = useTrading();

  const handleReset = async () => {
    if (confirm('Reset your demo virtual balance to $10,000.00 USD?')) {
      await resetBalance();
    }
  };

  // Calculate Win Rate %
  const profitableTrades = trades.filter((t) => t.realized_pnl > 0).length;
  const winRate = trades.length > 0 ? (profitableTrades / trades.length) * 100 : 0;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">Trading Portfolio</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              DEMO ACCOUNT
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Account {account?.account_number || 'WT-100000'} &bull; Base Currency USD &bull; Leverage 1:100
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Balance ($10,000)</span>
          </button>
          <Link
            to="/trade/EUR-USD"
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors shadow-lg shadow-emerald-500/20"
          >
            <span>Open Terminal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Account Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Balance Card */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Virtual Balance</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white">
            {formatCurrency(account?.balance || 10000)}
          </div>
          <div className="text-[11px] text-slate-500">Unrealized P/L: {formatCurrency(totalUnrealizedPnl)}</div>
        </div>

        {/* Equity Card */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Account Equity</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div
            className={`text-2xl font-black font-mono ${
              equity >= (account?.balance || 10000) ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatCurrency(equity)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
            <span>Free Margin:</span>
            <b className="text-slate-200">{formatCurrency(freeMargin)}</b>
          </div>
        </div>

        {/* Margin Level Card */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Margin Level</span>
            <Shield className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white">
            {account?.margin_used ? `${marginLevel.toFixed(1)}%` : '100%'}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
            <span>Margin Used:</span>
            <b className="text-slate-200">{formatCurrency(account?.margin_used || 0)}</b>
          </div>
        </div>

        {/* Closed Trades & Win Rate */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Historical Win Rate</span>
            <PieChart className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white">
            {trades.length > 0 ? `${winRate.toFixed(0)}%` : '0%'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {profitableTrades} won of {trades.length} closed trades
          </div>
        </div>
      </div>

      {/* Main Grid: Active Positions & Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Positions (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#070b14]">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Active Positions ({positions.length})</h3>
              </div>
              <Link
                to="/positions"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
              >
                <span>Full Positions View</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <PositionsTable limit={5} />
          </div>

          {/* Trade History */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#070b14]">
              <h3 className="font-bold text-sm text-white">Recent Trade Activity</h3>
              <Link
                to="/history"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
              >
                <span>View Full Log</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <TradesHistoryTable />
          </div>
        </div>

        {/* Right: Watchlist (4 cols) */}
        <div className="lg:col-span-4 h-[600px]">
          <WatchlistWidget />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
