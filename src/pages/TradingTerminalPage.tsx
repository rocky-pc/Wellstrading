import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { INSTRUMENTS, getInstrumentBySymbol, formatPrice } from '@/lib/instruments';
import { MarketQuote, Instrument, MarketTrend } from '@/types';
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
  Shield,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sliders,
  ExternalLink,
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
  const [showAdminDrawer, setShowAdminDrawer] = useState(false);
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

  // Admin quick direction flip
  const handleQuickDirection = async (direction: MarketTrend) => {
    await MarketDataService.updateInstrumentTrend(instrument.symbol, direction);
    const updated = MarketDataService.getInstrument(instrument.symbol);
    if (updated) setInstrument(updated);
  };

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

          {/* Current Admin Direction Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono">
            <span className="text-slate-400">Trend:</span>
            <span
              className={`font-bold ${
                instrument.direction === 'UP'
                  ? 'text-emerald-400'
                  : instrument.direction === 'DOWN'
                  ? 'text-rose-400'
                  : 'text-slate-300'
              }`}
            >
              {instrument.direction === 'UP' ? '▲ BULLISH (UP)' : instrument.direction === 'DOWN' ? '▼ BEARISH (DOWN)' : '— FLAT'}
            </span>
          </div>
        </div>

        {/* Right: Quick In-Terminal Admin Controls */}
        <div className="flex items-center gap-2">
          {/* 1-Click Fast Direction Buttons for the Admin */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => handleQuickDirection('UP')}
              title="Force upward price trajectory"
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                instrument.direction === 'UP'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>UP</span>
            </button>
            <button
              onClick={() => handleQuickDirection('DOWN')}
              title="Force downward price trajectory"
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                instrument.direction === 'DOWN'
                  ? 'bg-rose-500 text-slate-950 font-black'
                  : 'text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>DOWN</span>
            </button>
            <button
              onClick={() => handleQuickDirection('SIDEWAYS')}
              title="Hold sideways consolidation"
              className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                instrument.direction === 'SIDEWAYS'
                  ? 'bg-slate-200 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Full Admin Panel Link */}
          <button
            onClick={() => setShowAdminDrawer(!showAdminDrawer)}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
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

      {/* Admin Quick Drawer */}
      {showAdminDrawer && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0b1120] border-l border-slate-800 shadow-2xl p-6 flex flex-col font-sans">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-base text-white">Live Market Controls</h3>
            </div>
            <button
              onClick={() => setShowAdminDrawer(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
            <div>
              <span className="text-slate-400 uppercase tracking-wider text-[11px] font-bold">
                Selected Pair: {instrument.symbol}
              </span>
              <p className="text-slate-500 mt-0.5">
                Altering these settings will update the second-by-second price trajectory for all users.
              </p>
            </div>

            {/* Trajectory */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold">Directional Trend</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleQuickDirection('UP')}
                  className={`py-2 rounded-lg font-bold ${
                    instrument.direction === 'UP'
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'bg-slate-900 text-emerald-400 border border-emerald-500/20'
                  }`}
                >
                  ▲ FORCE UP
                </button>
                <button
                  onClick={() => handleQuickDirection('DOWN')}
                  className={`py-2 rounded-lg font-bold ${
                    instrument.direction === 'DOWN'
                      ? 'bg-rose-500 text-slate-950 font-black'
                      : 'bg-slate-900 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  ▼ FORCE DOWN
                </button>
                <button
                  onClick={() => handleQuickDirection('SIDEWAYS')}
                  className={`py-2 rounded-lg font-bold ${
                    instrument.direction === 'SIDEWAYS'
                      ? 'bg-slate-200 text-slate-950 font-black'
                      : 'bg-slate-900 text-slate-300 border border-slate-700'
                  }`}
                >
                  — FLAT
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="text-slate-300 font-bold">Instant Price Spikes</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const target = (quote?.price || instrument.currentPrice) * 1.03;
                    MarketDataService.updateInstrumentTrend(instrument.symbol, 'UP', {
                      targetPrice: target,
                      strength: 2.5,
                      algorithm: 'PUMP',
                    });
                  }}
                  className="py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-500/20"
                >
                  <Zap className="w-4 h-4" />
                  <span>+3% Bull Spike</span>
                </button>
                <button
                  onClick={() => {
                    const target = (quote?.price || instrument.currentPrice) * 0.97;
                    MarketDataService.updateInstrumentTrend(instrument.symbol, 'DOWN', {
                      targetPrice: target,
                      strength: 2.5,
                      algorithm: 'DUMP',
                    });
                  }}
                  className="py-2 px-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold flex items-center justify-center gap-1.5 hover:bg-rose-500/20"
                >
                  <Zap className="w-4 h-4" />
                  <span>-3% Flash Dip</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={() => {
                setShowAdminDrawer(false);
                navigate('/admin');
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <span>Open Full Admin Panel & Pair Creator</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingTerminalPage;
