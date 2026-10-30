import React, { useState, useMemo } from 'react';
import { Instrument, MarketQuote, OrderSide } from '@/types';
import { useTrading } from '@/context/TradingContext';
import { formatCurrency, formatPrice } from '@/lib/instruments';
import { TrendingDown, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  instrument: Instrument;
  quote: MarketQuote | null;
}

export const OrderTicket: React.FC<Props> = ({ instrument, quote }) => {
  const { account, freeMargin, placeMarketOrder } = useTrading();

  const [selectedSide, setSelectedSide] = useState<OrderSide>('BUY');
  const [quantity, setQuantity] = useState<number>(instrument.minLot || 0.1);
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const currentPrice = quote?.price || instrument.currentPrice || 100;
  const bidPrice = quote?.bid || currentPrice;
  const askPrice = quote?.ask || currentPrice;
  const leverage = account?.leverage || instrument.defaultLeverage || 100;
  const contractSize = instrument.contractSize || 1;

  // Margin Required: (quantity * contractSize * currentPrice) / leverage
  const marginRequired = useMemo(() => {
    return (quantity * contractSize * currentPrice) / leverage;
  }, [quantity, contractSize, currentPrice, leverage]);

  const hasInsufficientMargin = marginRequired > freeMargin;

  const adjustLot = (delta: number) => {
    setQuantity((prev) => {
      const next = Math.max(instrument.minLot, Math.min(instrument.maxLot, prev + delta));
      return parseFloat(next.toFixed(3));
    });
  };

  const handleOrderSubmit = async () => {
    setFeedback(null);
    setSubmitting(true);

    const execPrice = selectedSide === 'BUY' ? askPrice : bidPrice;
    const sl = stopLoss ? parseFloat(stopLoss) : undefined;
    const tp = takeProfit ? parseFloat(takeProfit) : undefined;

    const result = await placeMarketOrder({
      symbol: instrument.symbol,
      side: selectedSide,
      quantity,
      price: execPrice,
      stopLoss: sl,
      takeProfit: tp,
    });

    setSubmitting(false);

    if (result.success) {
      setFeedback({
        type: 'success',
        message: `${selectedSide} ${quantity} ${instrument.symbol} placed at ${formatPrice(
          execPrice,
          instrument.digits
        )}`,
      });
      setTimeout(() => setFeedback(null), 3500);
    } else {
      setFeedback({
        type: 'error',
        message: result.error || 'Execution failed',
      });
    }
  };

  return (
    <div className="flex flex-col w-full bg-[#090e1a] rounded-xl border border-slate-800/80 overflow-hidden font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-[#070b14]">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-sm text-white">{instrument.symbol}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            1:{leverage}
          </span>
        </div>
        <div className="font-mono text-xs font-semibold text-slate-300">
          Spread: <span className="text-emerald-400">{quote?.spread || '0.0002'}</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Minimalist Side Switcher: BUY / SELL Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setSelectedSide('BUY')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              selectedSide === 'BUY'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>BUY / LONG</span>
            <span className="font-mono ml-1 text-[11px] opacity-90">
              {formatPrice(askPrice, instrument.digits)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedSide('SELL')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              selectedSide === 'SELL'
                ? 'bg-rose-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>SELL / SHORT</span>
            <span className="font-mono ml-1 text-[11px] opacity-90">
              {formatPrice(bidPrice, instrument.digits)}
            </span>
          </button>
        </div>

        {/* Volume / Lot Input & Stepper */}
        <div>
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1.5">
            <span className="font-medium">Trading Volume (Lots)</span>
            <span className="font-mono text-[11px]">
              Step: {instrument.lotStep} | Min: {instrument.minLot}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => adjustLot(-instrument.lotStep)}
              className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-lg flex items-center justify-center transition-colors"
            >
              -
            </button>
            <input
              type="number"
              step={instrument.lotStep}
              min={instrument.minLot}
              max={instrument.maxLot}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(instrument.minLot, parseFloat(e.target.value) || 0.01))}
              className="flex-1 h-10 bg-slate-900 border border-slate-800 rounded-lg text-center font-mono font-bold text-base text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => adjustLot(instrument.lotStep)}
              className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-lg flex items-center justify-center transition-colors"
            >
              +
            </button>
          </div>

          {/* Quick Lot Chips */}
          <div className="grid grid-cols-5 gap-1.5 mt-2">
            {[0.01, 0.05, 0.1, 0.5, 1.0].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setQuantity(preset)}
                className={`py-1 text-[11px] font-mono rounded border transition-colors ${
                  quantity === preset
                    ? 'bg-slate-800 text-emerald-400 border-emerald-500/40 font-bold'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Minimalist SL / TP Dropdown Toggle */}
        <div className="pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-slate-200 py-1"
          >
            <span>Stop Loss & Take Profit (Optional)</span>
            <span className="text-[10px] text-emerald-400 font-medium">
              {showAdvanced ? 'Hide' : '+ Add Protection'}
            </span>
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-2 gap-3 mt-2 font-mono text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Stop Loss (Price)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 1.0800"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Take Profit (Price)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 1.0950"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Order Details & Margin Summary */}
        <div className="bg-slate-900/60 rounded-lg p-2.5 space-y-1.5 text-xs font-mono text-slate-400 border border-slate-800/60">
          <div className="flex justify-between">
            <span>Required Margin:</span>
            <span className="font-semibold text-slate-200">{formatCurrency(marginRequired)}</span>
          </div>
          <div className="flex justify-between">
            <span>Free Margin:</span>
            <span
              className={`font-semibold ${
                hasInsufficientMargin ? 'text-rose-400' : 'text-slate-200'
              }`}
            >
              {formatCurrency(freeMargin)}
            </span>
          </div>
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div
            className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Big 1-Click Execution Button */}
        <button
          type="button"
          onClick={handleOrderSubmit}
          disabled={submitting || hasInsufficientMargin}
          className={`w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-[0.99] flex items-center justify-center gap-2 ${
            hasInsufficientMargin
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : selectedSide === 'BUY'
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
              : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
          }`}
        >
          {submitting ? (
            <span>Processing Execution...</span>
          ) : hasInsufficientMargin ? (
            <span>Insufficient Margin</span>
          ) : (
            <>
              {selectedSide === 'BUY' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>
                EXECUTE {selectedSide} {quantity} LOTS
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default OrderTicket;
