import React, { useState } from 'react';
import { useTrading } from '@/context/TradingContext';
import { formatCurrency, formatPrice, getInstrumentBySymbol } from '@/lib/instruments';
import { Position } from '@/types';
import {
  TrendingUp,
  TrendingDown,
  X,
  Layers,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface Props {
  limit?: number;
}

export const PositionsTable: React.FC<Props> = ({ limit }) => {
  const { positions, closePosition, closeAllPositions, loading } = useTrading();
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closingAll, setClosingAll] = useState(false);

  const displayPositions = limit ? positions.slice(0, limit) : positions;

  const handleClose = async (positionId: string) => {
    setClosingId(positionId);
    await closePosition(positionId);
    setClosingId(null);
  };

  const handleCloseAll = async () => {
    if (confirm('Are you sure you want to close ALL open positions at market prices?')) {
      setClosingAll(true);
      await closeAllPositions();
      setClosingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-500 text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-emerald-400" />
        <span>Loading active positions...</span>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 text-slate-600">
          <Layers className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-300">No Open Positions</h4>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          You currently have no active trades. Execute a BUY or SELL order to open a new simulated position.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden">
      {/* Table Header Action Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/60 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">Open Positions ({positions.length})</span>
        </div>
        {positions.length > 1 && (
          <button
            onClick={handleCloseAll}
            disabled={closingAll}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-md transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>{closingAll ? 'Closing All...' : 'Close All Positions'}</span>
          </button>
        )}
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#070b14] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800/80">
            <tr>
              <th className="py-2.5 px-3">Symbol</th>
              <th className="py-2.5 px-3">Side</th>
              <th className="py-2.5 px-3">Volume</th>
              <th className="py-2.5 px-3">Open Price</th>
              <th className="py-2.5 px-3">Current Price</th>
              <th className="py-2.5 px-3">SL / TP</th>
              <th className="py-2.5 px-3">Margin</th>
              <th className="py-2.5 px-3 text-right">Profit / Loss (USD)</th>
              <th className="py-2.5 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {displayPositions.map((pos) => {
              const inst = getInstrumentBySymbol(pos.symbol);
              const digits = inst?.digits || 2;
              const isProfit = pos.unrealized_pnl >= 0;
              const isClosing = closingId === pos.id;

              return (
                <tr
                  key={pos.id}
                  className="hover:bg-slate-800/40 transition-colors group"
                >
                  <td className="py-2.5 px-3 font-bold text-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span>{pos.symbol}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                        {inst?.assetClass || 'CFD'}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        pos.side === 'BUY'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {pos.side === 'BUY' ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {pos.side}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">{pos.quantity}</td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {formatPrice(pos.entry_price, digits)}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-100">
                    {formatPrice(pos.current_price, digits)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                    <div>SL: {pos.stop_loss ? formatPrice(pos.stop_loss, digits) : '-'}</div>
                    <div>TP: {pos.take_profit ? formatPrice(pos.take_profit, digits) : '-'}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">
                    {formatCurrency(pos.margin)}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div
                      className={`font-bold text-sm ${
                        isProfit ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isProfit ? '+' : ''}
                      {formatCurrency(pos.unrealized_pnl)}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => handleClose(pos.id)}
                      disabled={isClosing}
                      title="Close position"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/80 hover:border-rose-500/30 transition-colors"
                    >
                      {isClosing ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-400" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PositionsTable;
