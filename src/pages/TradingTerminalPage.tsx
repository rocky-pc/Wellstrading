import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { INSTRUMENTS, getInstrumentBySymbol, formatPrice } from '@/lib/instruments';
import { MarketQuote, Instrument } from '@/types';
import { MarketDataService } from '@/services/marketData';
import { useTrading } from '@/context/TradingContext';
import TradingChart from '@/components/trading/TradingChart';
import OrderTicket from '@/components/trading/OrderTicket';
import PositionsTable from '@/components/trading/PositionsTable';
import TradesHistoryTable from '@/components/trading/TradesHistoryTable';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  History,
  Star,
  ChevronDown,
} from 'lucide-react';

export const TradingTerminalPage: React.FC = () => {
  const { symbol: rawSymbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const { updateQuote, isInWatchlist, toggleWatchlist } = useTrading();

  // Normalize symbol (e.g. "EUR-USD" -> "EUR/USD")
  const symbol = rawSymbol ? rawSymbol.replace('-', '/') : 'EUR/USD';
  const [instrument, setInstrument] = useState<Instrument>(
    () => MarketDataService.getInstrument(symbol) || INSTRUMENTS[0]
  );

  const [allInstruments, setAllInstruments] = useState<Instrument[]>([]);
  const [quote, setQuote] = useState<MarketQuote | null>(null);
  const [activeBottomTab, setActiveBottomTab] = useState<'POSITIONS' | 'HISTORY'>('POSITIONS');
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  const [showPairDropdown, setShowPairDropdown] = useState(false);
  const prevPriceRef = useRef<number | null>(null);

  // Sync instruments list
  useEffect(() => {
    setAllInstruments(MarketDataService.getAllInstruments());
    const inst = MarketDataService.getInstrument(symbol);
    if (inst) setInstrument(inst);
  }, [symbol]);

  // Subscribe to real-time 1-second price ticks
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = MarketDataService.subscribeQuote(instrument.symbol, (newQuote) => {
      if (!isMounted) return;

      if (prevPriceRef.current !== null && newQuote.price !== prevPriceRef.current) {
        setPriceFlash(newQuote.price > prevPriceRef.current ? 'up' : 'down');
        setTimeout(() => setPriceFlash(null), 500);
      }

      prevPriceRef.current = newQuote.price;
      setQuote(newQuote);
      updateQuote(newQuote);

      // Refresh instrument config if direction was changed remotely
      const currentInst = MarketDataService.getInstrument(instrument.symbol);
      if (currentInst) setInstrument(currentInst);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [instrument.symbol, updateQuote]);

  const isPositive = quote ? quote.changePercent24h >= 0 : true;
  const isFavorite = isInWatchlist(instrument.symbol);

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-3.5rem)] bg-[#070b14] text-slate-100 font-sans">
      {/* 1. Minimalist Top Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-[#090e1a] border-b border-slate-800/80 text-xs gap-3">
        {/* Left: Quick Symbol Dropdown & Live Price */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleWatchlist(instrument.symbol)}
            title="Toggle favorite"
            className="text-slate-500 hover:text-amber-400 p-1"
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'text-amber-400 fill-amber-400' : ''}`} />
          </button>

          {/* Pair Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowPairDropdown(!showPairDropdown)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-white">{instrument.symbol}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-slate-800 text-slate-400">
                  {instrument.assetClass}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {showPairDropdown && (
              <div className="absolute left-0 top-full mt-1.5 w-64 max-h-80 overflow-y-auto bg-[#0b1120] border border-slate-700 rounded-xl shadow-2xl z-50 p-1.5 space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Available Pairs ({allInstruments.length})
                </div>
                {allInstruments.map((item) => (
                  <button
                    key={item.symbol}
                    onClick={() => {
                      setShowPairDropdown(false);
                      navigate(`/trade/${item.symbol.replace('/', '-')}`);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors ${
                      item.symbol === instrument.symbol
                        ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30'
                        : 'text-slate-300 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="text-left">
                      <div className="font-bold">{item.symbol}</div>
                      <div className="text-[10px] text-slate-400">{item.name}</div>
                    </div>
                    <div className="text-right font-mono">
                      <div>{formatPrice(item.currentPrice, item.digits)}</div>
                      <div
                        className={`text-[10px] ${
                          item.direction === 'UP' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {item.direction === 'UP' ? '▲ UP' : '▼ DOWN'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-slate-800 hidden sm:block" />

          {/* Real-time Flashing Price */}
          <div
            className={`px-3 py-1 rounded-lg transition-colors font-mono ${
              priceFlash === 'up'
                ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                : priceFlash === 'down'
                ? 'bg-rose-500/20 text-rose-400 font-bold'
                : 'text-white'
            }`}
          >
            <div className="text-lg font-black">
              {quote ? formatPrice(quote.price, instrument.digits) : '---'}
            </div>
          </div>

          {/* 24h Change */}
          {quote && (
            <div
              className={`flex items-center gap-1 font-mono text-xs font-semibold ${
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>
                {isPositive ? '+' : ''}
                {quote.changePercent24h.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        {/* Right: Institutional Market Meta Stats */}
        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-slate-500">24h High:</span>
            <span className="font-semibold text-slate-200">
              {formatPrice(quote?.high24h || instrument.currentPrice * 1.01, instrument.digits)}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-slate-500">24h Low:</span>
            <span className="font-semibold text-slate-200">
              {formatPrice(quote?.low24h || instrument.currentPrice * 0.99, instrument.digits)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Spread:</span>
            <span className="font-semibold text-emerald-400">
              {(instrument.spread * Math.pow(10, instrument.digits - 1)).toFixed(1)} pts
            </span>
          </div>
          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-slate-500">Leverage:</span>
            <span className="font-semibold text-sky-400">1:{instrument.defaultLeverage || 100}</span>
          </div>
        </div>
      </div>

      {/* 2. Main Trading Workstation (Minimalist 2-Column Layout) */}
      <div className="flex-1 flex flex-col lg:flex-row p-3 gap-3 min-h-0">
        {/* Left: Chart & Bottom Tabs (Dominant trading canvas) */}
        <div className="flex-1 flex flex-col min-w-0 space-y-3">
          {/* Chart Component */}
          <div className="flex-1 min-h-[460px]">
            <TradingChart
              symbol={instrument.symbol}
              instrument={instrument}
              latestQuote={quote}
            />
          </div>

          {/* Minimalist Bottom Positions & History Tab */}
          <div className="bg-[#090e1a] rounded-xl border border-slate-800/80 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-[#070b14]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveBottomTab('POSITIONS')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors ${
                    activeBottomTab === 'POSITIONS'
                      ? 'bg-slate-800 text-emerald-400 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Open Positions</span>
                </button>
                <button
                  onClick={() => setActiveBottomTab('HISTORY')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors ${
                    activeBottomTab === 'HISTORY'
                      ? 'bg-slate-800 text-emerald-400 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Trade History</span>
                </button>
              </div>
            </div>

            <div className="p-2">
              {activeBottomTab === 'POSITIONS' ? (
                <PositionsTable />
              ) : (
                <TradesHistoryTable />
              )}
            </div>
          </div>
        </div>

        {/* Right: Minimalist Order Ticket */}
        <div className="w-full lg:w-80 shrink-0">
          <OrderTicket instrument={instrument} quote={quote} />
        </div>
      </div>
    </div>
  );
};

export default TradingTerminalPage;
