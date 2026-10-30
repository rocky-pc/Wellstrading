import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { INSTRUMENTS, formatPrice } from '@/lib/instruments';
import { MarketQuote } from '@/types';
import { MarketDataService } from '@/services/marketData';
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Zap,
  BarChart2,
  Lock,
  ArrowRight,
  Globe2,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [tickerQuotes, setTickerQuotes] = useState<Record<string, MarketQuote>>({});

  const featuredSymbols = ['EUR/USD', 'BTC/USDT', 'ETH/USDT', 'AAPL', 'NVDA', 'XAU/USD'];

  useEffect(() => {
    const unsubscribe = MarketDataService.subscribeAll((newQuotes) => {
      setTickerQuotes((prev) => ({ ...prev, ...newQuotes }));
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[#070b14] text-slate-100 overflow-x-hidden">
      {/* 1. Real-time Ticker Ribbon */}
      <div className="w-full bg-[#0a0f1d] border-b border-slate-800/80 overflow-hidden py-2">
        <div className="flex items-center gap-8 animate-marquee whitespace-nowrap px-4 text-xs font-mono">
          {featuredSymbols.map((sym) => {
            const quote = tickerQuotes[sym];
            const isUp = quote ? quote.changePercent24h >= 0 : true;

            return (
              <Link
                key={sym}
                to={`/trade/${sym.replace('/', '-')}`}
                className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 transition-colors"
              >
                <span className="font-bold text-slate-200">{sym}</span>
                <span className="text-slate-100">
                  {quote ? formatPrice(quote.price, sym.includes('USD') && !sym.includes('XAU') ? 5 : 2) : '---'}
                </span>
                <span
                  className={`flex items-center text-[10px] ${
                    isUp ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'
                  }`}
                >
                  {isUp ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                  {isUp ? '+' : ''}
                  {quote ? quote.changePercent24h.toFixed(2) : '0.00'}%
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 2. Hero Section */}
      <section className="relative pt-16 pb-24 px-4 md:px-8 max-w-7xl mx-auto w-full text-center md:text-left">
        {/* Ambient lighting glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 blur-[140px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[250px] bg-sky-500/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next-Gen XM-Inspired Trading Terminal</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] text-white">
              Master Global Markets With{' '}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
                Zero Risk
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
              Experience the adrenaline of high-frequency Forex, Crypto, and Stock trading with low-latency synchronized market movements and customizable admin algorithm controls. Powered by Supabase data with $10,000 virtual USD capital.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <Link
                to="/trade/EUR-USD"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-sm tracking-wide transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 group"
              >
                <span>Launch Trading Terminal</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/signup"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                <span>Create Free Demo ($10,000)</span>
              </Link>
            </div>

            {/* Quick Badges */}
            <div className="flex flex-wrap items-center gap-6 pt-4 text-xs text-slate-400 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <CheckIcon />
                <span>1:100 Demo Leverage</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon />
                <span>TradingView Lightweight Charts</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon />
                <span>Zero Installation / 100% Serverless</span>
              </div>
            </div>
          </div>

          {/* Hero Terminal Teaser Card */}
          <div className="lg:col-span-5 relative">
            <div className="p-1 rounded-2xl bg-gradient-to-b from-slate-700/50 to-slate-900/80 shadow-2xl border border-slate-700/40">
              <div className="rounded-xl bg-[#090e1a] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                    <span className="ml-2 font-mono font-bold text-xs text-slate-300">
                      EUR/USD &bull; PRO TERMINAL
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    LIVE
                  </span>
                </div>

                {/* Big Bid / Ask Simulator */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                    <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block">
                      SELL
                    </span>
                    <span className="text-xl font-black font-mono text-rose-400">1.12250</span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                      BUY
                    </span>
                    <span className="text-xl font-black font-mono text-emerald-400">1.12265</span>
                  </div>
                </div>

                {/* Simulated Chart visual lines */}
                <div className="h-28 rounded-lg bg-slate-950/80 border border-slate-800 p-3 flex flex-col justify-end relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center opacity-10 font-black text-4xl text-slate-400">
                    CANDLESTICK ENGINE
                  </div>
                  <div className="flex items-end justify-between gap-1 h-20">
                    {[40, 65, 50, 75, 60, 85, 70, 95, 80, 100, 90, 110, 105, 125].map((h, i) => (
                      <div
                        key={i}
                        className={`w-full rounded-sm ${i % 2 === 0 ? 'bg-emerald-500/80' : 'bg-rose-500/80'}`}
                        style={{ height: `${h * 0.55}%` }}
                      />
                    ))}
                  </div>
                </div>

                {/* Demo Equity Metric */}
                <div className="flex justify-between items-center text-xs p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400">Virtual Demo Equity</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">$10,480.25 USD</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Live Markets Overview Table */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Institutional Asset Catalog
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Predefined algorithmic market pairs with 1-second real-time movements.
            </p>
          </div>
          <Link
            to="/markets"
            className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold flex items-center gap-1.5"
          >
            <span>Explore All Instruments</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#070b14] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Instrument</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Trajectory</th>
                  <th className="py-3 px-4">Last Price</th>
                  <th className="py-3 px-4">24h Change</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {INSTRUMENTS.slice(0, 7).map((inst) => {
                  const quote = tickerQuotes[inst.symbol];
                  const isUp = quote ? quote.changePercent24h >= 0 : true;

                  return (
                    <tr
                      key={inst.symbol}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-100 text-sm">{inst.symbol}</span>
                          <span className="text-[11px] text-slate-400 font-sans">{inst.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700/60">
                          {inst.assetClass}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            inst.direction === 'UP'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {inst.direction === 'UP' ? '▲ BULLISH' : '▼ BEARISH'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-100">
                        {quote ? formatPrice(quote.price, inst.digits) : '---'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold flex items-center gap-1 ${
                            isUp ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isUp ? '+' : ''}
                          {quote ? quote.changePercent24h.toFixed(2) : '0.00'}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/trade/${inst.symbol.replace('/', '-')}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 font-bold transition-all text-xs"
                        >
                          <span>Trade</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 4. Platform Architectural Pillars */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto w-full border-t border-slate-800/80">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Built For Serious Traders
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm">
            Zero compromises. Pure serverless execution with instant responsiveness.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-100">100% Serverless on Vercel</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              No VPS, no traditional Node servers, no Docker bottlenecks. Edge-rendered globally with sub-millisecond response latency.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-100">Supabase RLS &amp; Stored Functions</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Atomic paper-trading database transactions. Balances and margins are safeguarded by PostgreSQL Row Level Security.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-100">Algorithmic Market Engine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Predefined chart trajectories, sec-by-sec low-latency movements, and customizable currency pairs set via the Admin panel.
            </p>
          </div>
        </div>
      </section>

      {/* 5. CTA Section */}
      <section className="py-20 px-4 max-w-5xl mx-auto w-full text-center">
        <div className="p-10 rounded-3xl bg-gradient-to-b from-slate-900 to-emerald-950/40 border border-emerald-500/30 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            Ready To Test Your Trading Strategies?
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Get instant access to $10,000 USD virtual credit. Practice risk management, test indicators, and hone your edge without risking a penny.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              to="/signup"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm transition-all shadow-xl shadow-emerald-500/20"
            >
              Open Instant Demo Account
            </Link>
            <Link
              to="/trade/EUR-USD"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition-all"
            >
              Explore Terminal as Guest
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

const CheckIcon = () => (
  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
    </svg>
  </div>
);

export default LandingPage;
