import React, { useState, useMemo } from 'react';
import { Instrument, MarketQuote, OrderSide, OrderType } from '@/types';
import { useTrading } from '@/context/TradingContext';
import { formatCurrency, formatPrice } from '@/lib/instruments';
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  ShieldAlert,
  Info,
} from 'lucide-react';

interface Props {
  instrument: Instrument;
  quote: MarketQuote | null;
}

export const OrderTicket: React.FC<Props> = ({ instrument, quote }) => {
  const { account, equity, freeMargin, placeMarketOrder } = useTrading();

  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [selectedSide, setSelectedSide] = useState<OrderSide>('BUY');
  const [quantity, setQuantity] = useState<number>(instrument.minLot || 0.1);
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [enableSL, setEnableSL] = useState<boolean>(false);
  const [enableTP, setEnableTP] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const currentPrice = quote?.price || 100;
  const bidPrice = quote?.bid || currentPrice;
  const askPrice = quote?.ask || currentPrice;
  const leverage = account?.leverage || instrument.defaultLeverage || 100;
  const contractSize = instrument.contractSize || 1;

  // Margin Required: (quantity * contractSize * currentPrice) / leverage
  const marginRequired = useMemo(() => {
    return (quantity * contractSize * currentPrice) / leverage;
  }, [quantity, contractSize, currentPrice, leverage]);

  // Pip value approx calculation
  const pipValue = useMemo(() => {
    return quantity * contractSize * instrument.pipSize;
  }, [quantity, contractSize, instrument.pipSize]);

  // Insufficient margin check
  const hasInsufficientMargin = marginRequired > freeMargin;

  // Handle lot changes
  const adjustLot = (delta: number) => {
    setQuantity((prev) => {
      const next = Math.max(instrument.minLot, Math.min(instrument.maxLot, prev + delta));
      return parseFloat(next.toFixed(3));
    });
  };

  const handleOrderSubmit = async (side: OrderSide) => {
    setFeedback(null);
    setSubmitting(true);
    setSelectedSide(side);

    const execPrice = side === 'BUY' ? askPrice : bidPrice;
    const sl = enableSL && stopLoss ? parseFloat(stopLoss) : undefined;
    const tp = enableTP && takeProfit ? parseFloat(takeProfit) : undefined;

    const result = await placeMarketOrder({
      symbol: instrument.symbol,
      side,
      quantity,
      price: execPrice,
      stopLoss: sl,
      takeProfit: tp,
    });

    setSubmitting(false);

    if (result.success) {
      setFeedback({
        type: 'success',
        message: `Simulated ${side} ${quantity} ${instrument.symbol} placed at ${formatPrice(
          execPrice,
          instrument.digits
        )}`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setFeedback({
        type: 'error',
        message: result.error || 'Failed to place order',
      });
    }
  };

  return (
    <div className="flex flex-col w-full bg-[#0a0f1d] rounded-xl border border-slate-800/80 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-[#070b14]">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-sm text-slate-100">{instrument.symbol}</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            1:{leverage}
          </span>
        </div>

        {/* Order Type Tabs */}
        <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setOrderType('MARKET')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              orderType === 'MARKET'
                ? 'bg-slate-800 text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Market Order
          </button>
          <button
            onClick={() => setOrderType('LIMIT')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              orderType === 'LIMIT'
                ? 'bg-slate-800 text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pending / Limit
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* XM Dual Big Buy/Sell Execution Tiles */}
        <div className="grid grid-cols-2 gap-3">
          {/* SELL BUTTON */}
          <button
            onClick={() => handleOrderSubmit('SELL')}
            disabled={submitting || hasInsufficientMargin}
            className={`group relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
              hasInsufficientMargin
                ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-800'
                : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 hover:border-rose-500 active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 mb-1 uppercase tracking-wider">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>SELL / BID</span>
            </div>
            <div className="text-xl font-black font-mono text-rose-400">
              {formatPrice(bidPrice, instrument.digits)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Short Position</div>
          </button>

          {/* BUY BUTTON */}
          <button
            onClick={() => handleOrderSubmit('BUY')}
            disabled={submitting || hasInsufficientMargin}
            className={`group relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
              hasInsufficientMargin
                ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-800'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 hover:border-emerald-500 active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-1 uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>BUY / ASK</span>
            </div>
            <div className="text-xl font-black font-mono text-emerald-400">
              {formatPrice(askPrice, instrument.digits)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Long Position</div>
          </button>
        </div>

        {/* Spread indicator */}
        <div className="flex items-center justify-center gap-2 py-1 text-[11px] text-slate-400 bg-slate-900/60 rounded-lg border border-slate-800/80 font-mono">
          <span>SPREAD:</span>
          <span className="font-semibold text-slate-200">
            {quote?.spread !== undefined ? quote.spread : '0.00015'}
          </span>
          <span className="text-slate-500">&bull;</span>
          <span>PIPS:</span>
          <span className="font-semibold text-emerald-400">
            {quote?.spread ? (quote.spread / instrument.pipSize).toFixed(1) : '1.5'}
          </span>
        </div>

        {/* Volume / Lot Selector */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-medium">Volume (Lots / Units)</span>
            <span className="text-slate-400 text-[11px]">
              Range: {instrument.minLot} - {instrument.maxLot}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustLot(-0.1)}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-sm font-bold transition-colors"
            >
              -
            </button>
            <input
              type="number"
              step={instrument.lotStep}
              min={instrument.minLot}
              max={instrument.maxLot}
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || instrument.minLot)}
              className="flex-1 h-9 px-3 text-center bg-slate-900 border border-slate-800 rounded-lg font-mono text-sm text-white focus:outline-none focus:border-emerald-500 font-bold"
            />
            <button
              onClick={() => adjustLot(0.1)}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-sm font-bold transition-colors"
            >
              +
            </button>
          </div>

          {/* Quick Lot Chips */}
          <div className="grid grid-cols-5 gap-1 pt-1">
            {[0.01, 0.05, 0.1, 0.5, 1.0].map((lot) => (
              <button
                key={lot}
                onClick={() => setQuantity(lot)}
                className={`py-1 text-[11px] font-mono rounded bg-slate-900/90 border border-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ${
                  quantity === lot ? 'border-emerald-500/50 text-emerald-400 font-bold' : ''
                }`}
              >
                {lot}
              </button>
            ))}
          </div>
        </div>

        {/* Risk Management: Stop Loss & Take Profit */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="text-xs font-semibold text-slate-300">Risk Management</div>

          {/* Stop Loss */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableSL}
                  onChange={(e) => setEnableSL(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
                />
                <span>Stop Loss</span>
              </label>
              {enableSL && (
                <span className="text-[10px] text-rose-400 font-mono">Exit Protection</span>
              )}
            </div>

            {enableSL && (
              <input
                type="number"
                placeholder={`e.g. ${formatPrice(currentPrice * 0.99, instrument.digits)}`}
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="w-full h-8 px-3 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-rose-500"
              />
            )}
          </div>

          {/* Take Profit */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableTP}
                  onChange={(e) => setEnableTP(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
                />
                <span>Take Profit</span>
              </label>
              {enableTP && (
                <span className="text-[10px] text-emerald-400 font-mono">Profit Target</span>
              )}
            </div>

            {enableTP && (
              <input
                type="number"
                placeholder={`e.g. ${formatPrice(currentPrice * 1.015, instrument.digits)}`}
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                className="w-full h-8 px-3 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
            )}
          </div>
        </div>

        {/* Financial Metrics Summary */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5 text-xs font-mono">
          <div className="flex justify-between text-slate-400">
            <span>Required Margin:</span>
            <span className="font-semibold text-slate-100">{formatCurrency(marginRequired)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Free Margin:</span>
            <span
              className={`font-semibold ${
                hasInsufficientMargin ? 'text-rose-400 font-bold' : 'text-slate-100'
              }`}
            >
              {formatCurrency(freeMargin)}
            </span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Est. Pip Value:</span>
            <span className="font-semibold text-slate-100">~{formatCurrency(pipValue)}</span>
          </div>
        </div>

        {/* Insufficient Margin Warning */}
        {hasInsufficientMargin && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Insufficient free margin. Reduce volume or close positions.</span>
          </div>
        )}

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`flex items-center gap-2 p-2.5 rounded-lg text-xs border ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Notice */}
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/60 text-[10px] text-slate-500 leading-relaxed">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
          <span>
            Virtual Execution: Simulated order filled at live quote. Zero real funds at risk.
          </span>
        </div>
      </div>
    </div>
  );
};

export default OrderTicket;
