import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { INSTRUMENTS, getInstrumentBySymbol, formatPrice } from '@/lib/instruments';
import { MarketQuote } from '@/types';
import { MarketDataService } from '@/services/marketData';
import { useTrading } from '@/context/TradingContext';
import TradingChart from '@/components/trading/TradingChart';
import OrderTicket from '@/components/trading/OrderTicket';
import PositionsTable from '@/components/trading/PositionsTable';
import TradesHistoryTable from '@/components/trading/TradesHistoryTable';
import WatchlistWidget from '@/components/trading/WatchlistWidget';
import MarketTape from '@/components/trading/MarketTape';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  History,
  Star,
  Radio,
  Clock,
  ChevronRight,
  Shield,
} from 'lucide-react';

export const TradingTerminalPage: React.FC = () => {
  const { symbol: rawSymbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const { updateQuote, isInWatchlist, toggleWatchlist } = useTrading();

  // Normalize symbol (e.g. "EUR-USD" -> "EUR/USD")
  const symbol = rawSymbol ? rawSymbol.replace('-', '/') : 'EUR/USD';
  const instrument = getInstrumentBySymbol(symbol) || INSTRUMENTS[0];

  const [quote, setQuote] = useState<MarketQuote | null>(null);
  const [activeBottomTab, setActiveBottomTab] = useState<'POSITIONS' | 'HISTORY'>('POSITIONS');
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  const prevPriceRef = useRef<number | null>(null);

  // Poll or stream live quotes
  useEffect(() => {
    let isMounted = true;

    // 1. Initial quote fetch
    MarketDataService.getQuote(instrument.symbol).then((q) => {
      if (isMounted && q) {
        setQuote(q);
        updateQuote(q);
        prevPriceRef.current = q.price;
      }
    });

    // 2. Real-time updates: Binance WebSockets or Twelve Data polling
    if (instrument.provider === 'BINANCE') {
      const unsubscribe = MarketDataService.subscribeBinanceStream(
        instrument.symbol,
        (newQuote) => {
          if (!isMounted) return;
          if (prevPriceRef.current !== null && newQuote.price !== prevPriceRef.current) {
            setPriceFlash(newQuote.price > prevPriceRef.current ? 'up' : 'down');
            setTimeout(() => setPriceFlash(null), 600);
          }
          prevPriceRef.current = newQuote.price;
          setQuote(newQuote);
          updateQuote(newQuote);
        }
      );
      return () => {
        isMounted = false;
        unsubscribe();
      };
    } else {
      // Twelve Data polling every 12 seconds
      const interval = setInterval(async () => {
        try {
          const newQuote = await MarketDataService.getQuote(instrument.symbol);
          if (!isMounted) return;
          if (prevPriceRef.current !== null && newQuote.price !== prevPriceRef.current) {
            setPriceFlash(newQuote.price > prevPriceRef.current ? 'up' : 'down');
            setTimeout(() => setPriceFlash(null), 600);
          }
          prevPriceRef.current = newQuote.price;
          setQuote(newQuote);
          updateQuote(newQuote);
        } catch {
          // ignore
        }
      }, 12000);

      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }
  }, [instrument.symbol, instrument.provider, updateQuote]);

  const isPositive = quote ? quote.changePercent24h >= 0 : true;
  const isFavorite = isInWatchlist(instrument.symbol);

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-3.5rem)] bg-[#070b14] text-slate-100">
      {/* 1. Terminal Top Information Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-[#090e1a] border-b border-slate-800 text-xs gap-3">
        {/* Left: Symbol & Price */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleWatchlist(instrument.symbol)}
            title="Toggle favorite"
            className="text-slate-500 hover:text-amber-400 p-1"
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'text-amber-400 fill-amber-400' : ''}`} />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base text-white">{instrument.symbol}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-slate-800 text-slate-400 border border-slate-700/60">
                {instrument.assetClass}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-sans hidden sm:inline-block">
              {instrument.name}
            </span>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

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
            <div className="text-xl font-black">
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
              <span className="text-[10px] text-slate-500 hidden md:inline">
                ({isPositive ? '+' : ''}
                {formatPrice(quote.change24h, instrument.digits)})
              </span>
            </div>
          )}
        </div>

        {/* Right: Market stats & Provider */}
        <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
          <div className="hidden lg:flex items-center gap-4">
            <div>
              <span className="text-slate-500 mr-1">24h High:</span>
              <span className="text-emerald-400 font-semibold">
                {quote ? formatPrice(quote.high24h, instrument.digits) : '---'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 mr-1">24h Low:</span>
              <span className="text-rose-400 font-semibold">
                {quote ? formatPrice(quote.low24h, instrument.digits) : '---'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 mr-1">Spread:</span>
              <span className="text-slate-200 font-semibold">{quote?.spread || '0.00015'}</span>
            </div>
          </div>

          {instrument.provider === 'BINANCE' ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>Binance Public Stream</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>Twelve Data Feed</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Terminal Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 p-2 overflow-hidden">
        {/* Left Column: Chart & Positions (8 or 9 cols) */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-2">
          {/* Top: Candlestick Chart */}
          <div className="h-[460px] w-full">
            <TradingChart
              symbol={instrument.symbol}
              instrument={instrument}
              latestQuote={quote}
            />
          </div>

          {/* Bottom Tabbed Table: Positions / History */}
          <div className="flex-1 min-h-[260px] rounded-xl border border-slate-800 bg-[#090e1a] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-3 border-b border-slate-800 bg-[#070b14]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveBottomTab('POSITIONS')}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                    activeBottomTab === 'POSITIONS'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Open Positions
                </button>
                <button
                  onClick={() => setActiveBottomTab('HISTORY')}
                  className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                    activeBottomTab === 'HISTORY'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Trade Log &amp; Closed
                </button>
              </div>

              <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                Virtual Paper Execution
              </span>
            </div>

            <div className="flex-1 overflow-y-auto">
              {activeBottomTab === 'POSITIONS' ? (
                <PositionsTable />
              ) : (
                <TradesHistoryTable />
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Order Ticket, Market Tape, & Quick Watchlist (4 or 3 cols) */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-2">
          {/* Order Ticket */}
          <OrderTicket instrument={instrument} quote={quote} />

          {/* Market Depth / Order Flow Tape */}
          <div className="h-48">
            <MarketTape quote={quote} digits={instrument.digits} />
          </div>

          {/* Quick Watchlist Accordion */}
          <div className="h-64">
            <WatchlistWidget
              activeSymbol={instrument.symbol}
              onSelectSymbol={(sym) => navigate(`/trade/${sym.replace('/', '-')}`)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingTerminalPage;
