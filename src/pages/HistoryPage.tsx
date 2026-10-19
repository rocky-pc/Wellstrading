import React from 'react';
import { useTrading } from '@/context/TradingContext';
import TradesHistoryTable from '@/components/trading/TradesHistoryTable';
import { formatCurrency } from '@/lib/instruments';
import { History, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const { trades, orders, account } = useTrading();

  const totalRealizedPnl = trades.reduce((acc, t) => acc + t.realized_pnl, 0);
  const isNetProfit = totalRealizedPnl >= 0;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Trading History &amp; Orders</h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete audit trail of all executed market orders, closed positions, and balance transactions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
            <span className="text-slate-500 mr-2">Total Closed Trades:</span>
            <b className="text-white">{trades.length}</b>
          </div>
        </div>
      </div>

      {/* Realized Performance Metric Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Total Realized P/L</div>
          <div
            className={`text-2xl font-black font-mono ${
              isNetProfit ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isNetProfit ? '+' : ''}
            {formatCurrency(totalRealizedPnl)}
          </div>
          <div className="text-[11px] text-slate-500">Cumulative closed performance</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Completed Orders</div>
          <div className="text-2xl font-black font-mono text-white">{orders.length}</div>
          <div className="text-[11px] text-slate-500">Order fills &amp; execution logs</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Current Balance</div>
          <div className="text-2xl font-black font-mono text-white">
            {formatCurrency(account?.balance || 10000)}
          </div>
          <div className="text-[11px] text-slate-500">Initial: $10,000.00 USD</div>
        </div>
      </div>

      {/* Main Tables Component */}
      <div className="rounded-2xl border border-slate-800 bg-[#090e1a] overflow-hidden shadow-2xl">
        <TradesHistoryTable />
      </div>
    </div>
  );
};

export default HistoryPage;
