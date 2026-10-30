import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice } from '@/lib/instruments';
import { AssetClass, MarketQuote, Instrument } from '@/types';
import { MarketDataService } from '@/services/marketData';
import { useTrading } from '@/context/TradingContext';
import {
  Search,
  Star,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ArrowUpDown,
  Shield,
  Plus,
} from 'lucide-react';

export const MarketsPage: React.FC = () => {
  const { isInWatchlist, toggleWatchlist } = useTrading();
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | AssetClass>('ALL');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'symbol' | 'change' | 'price'>('symbol');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});

  useEffect(() => {
    setInstruments(MarketDataService.getAllInstruments());

    // Subscribe to live 1s algorithmic stream
    const unsubscribe = MarketDataService.subscribeAll((newQuotes) => {
      setQuotes((prev) => ({ ...prev, ...newQuotes }));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const filteredInstruments = instruments
    .filter((inst) => {
      const matchesTab = activeTab === 'ALL' || inst.assetClass === activeTab;
      const matchesSearch =
        inst.symbol.toLowerCase().includes(search.toLowerCase()) ||
        inst.name.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    })
    .sort((a, b) => {
      const quoteA = quotes[a.symbol];
      const quoteB = quotes[b.symbol];

      if (sortBy === 'symbol') {
        return sortOrder === 'asc'
          ? a.symbol.localeCompare(b.symbol)
          : b.symbol.localeCompare(a.symbol);
      }
      if (sortBy === 'price') {
        const priceA = quoteA?.price || a.currentPrice || 0;
        const priceB = quoteB?.price || b.currentPrice || 0;
        return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
      }
      if (sortBy === 'change') {
        const chgA = quoteA?.changePercent24h || 0;
        const chgB = quoteB?.changePercent24h || 0;
        return sortOrder === 'asc' ? chgA - chgB : chgB - chgA;
      }
      return 0;
    });

  const toggleSort = (type: 'symbol' | 'change' | 'price') => {
    if (sortBy === type) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(type);
      setSortOrder('desc');
    }
  };

  const tabs: { label: string; value: 'ALL' | AssetClass }[] = [
    { label: 'All Pairs', value: 'ALL' },
    { label: 'Forex', value: 'FOREX' },
    { label: 'Crypto', value: 'CRYPTO' },
    { label: 'Stocks', value: 'STOCKS' },
    { label: 'Metals', value: 'COMMODITIES' },
  ];

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto w-full font-sans">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Market Pairs</h1>
          <p className="text-xs text-slate-400 mt-1">
            Predefined algorithmic quotes moving second-by-second. Controlled via Admin panel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin"
            className="px-3.5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Controls</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto p-1 bg-slate-900/80 rounded-xl border border-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.value
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search pair or symbol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-800 bg-[#090e1a] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#070b14] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 w-10 text-center">Fav</th>
                <th
                  onClick={() => toggleSort('symbol')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Instrument</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Class</th>
                <th
                  onClick={() => toggleSort('price')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Live Price (1s)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('change')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>24h Change</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Admin Trajectory</th>
                <th className="py-3 px-4">Leverage</th>
                <th className="py-3 px-4 text-right">Trade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredInstruments.map((inst) => {
                const quote = quotes[inst.symbol];
                const curPrice = quote ? quote.price : inst.currentPrice;
                const isUp = quote ? quote.changePercent24h >= 0 : true;
                const isFavorite = isInWatchlist(inst.symbol);

                return (
                  <tr
                    key={inst.symbol}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleWatchlist(inst.symbol)}
                        className="text-slate-600 hover:text-amber-400 transition-colors p-1"
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            isFavorite ? 'text-amber-400 fill-amber-400' : ''
                          }`}
                        />
                      </button>
                    </td>

                    <td className="py-3 px-4">
                      <Link
                        to={`/trade/${inst.symbol.replace('/', '-')}`}
                        className="flex items-center gap-2 group-hover:text-emerald-400 transition-colors"
                      >
                        <div>
                          <div className="font-extrabold text-white flex items-center gap-1.5">
                            <span>{inst.symbol}</span>
                            {inst.isCustom && (
                              <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                CUSTOM
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-sans">{inst.name}</div>
                        </div>
                      </Link>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                        {inst.assetClass}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-white text-sm">
                      {formatPrice(curPrice, inst.digits)}
                    </td>

                    <td className="py-3 px-4 font-mono">
                      <div
                        className={`flex items-center gap-1 font-semibold ${
                          isUp ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        <span>
                          {isUp ? '+' : ''}
                          {quote ? quote.changePercent24h.toFixed(2) : '0.00'}%
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px]">
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          inst.direction === 'UP'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : inst.direction === 'DOWN'
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {inst.direction === 'UP' ? '▲ BULLISH' : inst.direction === 'DOWN' ? '▼ BEARISH' : '— FLAT'}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-400">
                      1:{inst.defaultLeverage}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/trade/${inst.symbol.replace('/', '-')}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold text-xs transition-colors border border-emerald-500/20"
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
    </div>
  );
};

export default MarketsPage;
