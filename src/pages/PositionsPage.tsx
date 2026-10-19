import React from 'react';
import { Link } from 'react-router-dom';
import { useTrading } from '@/context/TradingContext';
import { formatCurrency } from '@/lib/instruments';
import PositionsTable from '@/components/trading/PositionsTable';
import { Layers, TrendingUp, TrendingDown, Shield, ArrowRight } from 'lucide-react';

export const PositionsPage: React.FC = () => {
  const { positions, totalUnrealizedPnl, account, equity, freeMargin, marginLevel } = useTrading();

  const totalLots = positions.reduce((acc, p) => acc + p.quantity, 0);
  const isProfit = totalUnrealizedPnl >= 0;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Open Positions Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time simulated position tracking, unrealized profit &amp; loss, and margin requirements.
          </p>
        </div>

        <Link
          to="/trade/EUR-USD"
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors shadow-lg shadow-emerald-500/20"
        >
          <span>Open New Position</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Total Unrealized P/L</div>
          <div
            className={`text-2xl font-black font-mono ${
              isProfit ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isProfit ? '+' : ''}
            {formatCurrency(totalUnrealizedPnl)}
          </div>
          <div className="text-[11px] text-slate-500">Live mark-to-market</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Active Positions</div>
          <div className="text-2xl font-black font-mono text-white">{positions.length}</div>
          <div className="text-[11px] text-slate-500">Total Exposure: {totalLots.toFixed(2)} Lots</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Margin Used / Locked</div>
          <div className="text-2xl font-black font-mono text-white">
            {formatCurrency(account?.margin_used || 0)}
          </div>
          <div className="text-[11px] text-slate-500">Free Margin: {formatCurrency(freeMargin)}</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Margin Level %</div>
          <div className="text-2xl font-black font-mono text-white">
            {account?.margin_used ? `${marginLevel.toFixed(1)}%` : '100%'}
          </div>
          <div className="text-[11px] text-slate-500">Stop-out threshold: 50%</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl border border-slate-800 bg-[#090e1a] overflow-hidden shadow-2xl">
        <PositionsTable />
      </div>
    </div>
  );
};

export default PositionsPage;
