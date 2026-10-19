import React, { useState } from 'react';
import { useTrading } from '@/context/TradingContext';
import { formatCurrency, formatPrice, getInstrumentBySymbol } from '@/lib/instruments';
import { History, TrendingUp, TrendingDown, Clock, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export const TradesHistoryTable: React.FC = () => {
  const { trades, orders, transactions } = useTrading();
  const [activeTab, setActiveTab] = useState<'TRADES' | 'ORDERS' | 'TRANSACTIONS'>('TRADES');

  return (
    <div className="w-full overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/60 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('TRADES')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'TRADES'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Closed Trades ({trades.length})
          </button>
          <button
            onClick={() => setActiveTab('ORDERS')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'ORDERS'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Order Log ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('TRANSACTIONS')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'TRANSACTIONS'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Balance Ledger
          </button>
        </div>
      </div>

      {/* Tab 1: Closed Trades */}
      {activeTab === 'TRADES' && (
        <div className="overflow-x-auto">
          {trades.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No closed trade history yet. Closed positions will appear here with realized P/L.
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#070b14] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800/80">
                <tr>
                  <th className="py-2.5 px-3">Closed Date</th>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Lots</th>
                  <th className="py-2.5 px-3">Entry Price</th>
                  <th className="py-2.5 px-3">Close Price</th>
                  <th className="py-2.5 px-3 text-right">Realized P/L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {trades.map((t) => {
                  const inst = getInstrumentBySymbol(t.symbol);
                  const digits = inst?.digits || 2;
                  const isProfit = t.realized_pnl >= 0;

                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                        {new Date(t.closed_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-100">{t.symbol}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            t.side === 'BUY'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-rose-500/15 text-rose-400'
                          }`}
                        >
                          {t.side === 'BUY' ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {t.side}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{t.quantity}</td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {formatPrice(t.entry_price, digits)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {formatPrice(t.close_price, digits)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`font-bold text-sm ${
                            isProfit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isProfit ? '+' : ''}
                          {formatCurrency(t.realized_pnl)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 2: Orders */}
      {activeTab === 'ORDERS' && (
        <div className="overflow-x-auto">
          {orders.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">No orders recorded yet.</div>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#070b14] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800/80">
                <tr>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Side</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Quantity</th>
                  <th className="py-2.5 px-3">Executed Price</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      {new Date(o.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-100">{o.symbol}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          o.side === 'BUY'
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : 'text-rose-400 bg-rose-500/10'
                        }`}
                      >
                        {o.side}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{o.type}</td>
                    <td className="py-2.5 px-3 text-slate-300">{o.quantity}</td>
                    <td className="py-2.5 px-3 text-slate-300 font-semibold">
                      {o.executed_price ? formatPrice(o.executed_price, 4) : 'MARKET'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 3: Transactions */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="p-4 space-y-3">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">Virtual Initial Balance</span>
              <span className="text-emerald-400 font-mono font-bold">+$10,000.00 USD</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Demo account auto-credited with 10,000 USD virtual equity upon user registration.
            </p>
          </div>
          {trades.map((tr) => (
            <div
              key={tr.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-xs"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    tr.realized_pnl >= 0
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {tr.realized_pnl >= 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownLeft className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-slate-200">
                    Trade P/L: {tr.symbol} ({tr.side})
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {new Date(tr.closed_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <div
                className={`font-mono font-bold text-sm ${
                  tr.realized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {tr.realized_pnl >= 0 ? '+' : ''}
                {formatCurrency(tr.realized_pnl)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TradesHistoryTable;
