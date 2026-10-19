import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { INSTRUMENTS, formatPrice } from '@/lib/instruments';
import { AssetClass, MarketQuote } from '@/types';
import { MarketDataService } from '@/services/marketData';
import { useTrading } from '@/context/TradingContext';
import {
  Search,
  Star,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Filter,
  ArrowUpDown,
  Radio,
  Clock,
  Layers,
} from 'lucide-react';

export const MarketsPage: React.FC = () => {
  const { isInWatchlist, toggleWatchlist } = useTrading();
  const [activeTab, setActiveTab] = useState<'ALL' | AssetClass>('ALL');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'symbol' | 'change' | 'price'>('change');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});
  const [loading, setLoading] = useState(false);

  // Fetch quotes for all instruments in parallel
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const loadAllQuotes = async () => {
      // First 12 instruments
      for (const inst of INSTRUMENTS) {
        try {
          const q = await MarketDataService.getQuote(inst.symbol);
          if (isMounted) {
            setQuotes((prev) => ({ ...prev, [inst.symbol]: q }));
          }
        } catch {
          // ignore
        }
      }
      if (isMounted) setLoading(false);
    };

    loadAllQuotes();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter & sort
  const filteredInstruments = INSTRUMENTS.filter((inst) => {
    const matchesTab = activeTab === 'ALL' || inst.assetClass === activeTab;
    const matchesSearch =
      inst.symbol.toLowerCase().includes(search.toLowerCase()) ||
      inst.name.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  }).sort((a, b) => {
    const quoteA = quotes[a.symbol];
    const quoteB = quotes[b.symbol];

    if (sortBy === 'symbol') {
      return sortOrder === 'asc'
        ? a.symbol.localeCompare(b.symbol)
        : b.symbol.localeCompare(a.symbol);
    }
    if (sortBy === 'price') {
      const priceA = quoteA?.price || 0;
      const priceB = quoteB?.price || 0;
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
    { label: 'All Markets', value: 'ALL' },
    { label: 'Forex Pairs', value: 'FOREX' },
    { label: 'Crypto', value: 'CRYPTO' },
    { label: 'Stocks', value: 'STOCKS' },
    { label: 'Precious Metals', value: 'COMMODITIES' },
    { label: 'Indices', value: 'INDICES' },
  ];

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Market Explorer</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time financial asset quotes across global exchanges and public market streams.
          </p>
        </div>

        {/* Summary counter pills */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <span className="text-slate-500 mr-1.5">Instruments:</span>
            <b className="text-white">{INSTRUMENTS.length}</b>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <span className="mr-1.5">Forex:</span>
            <b>6</b>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <span className="mr-1.5">Crypto:</span>
            <b>5</b>
          </div>
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
                  ? 'bg-emerald-500 text-slate-950 shadow'
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
            placeholder="Search symbol or name..."
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
                <th className="py-3 px-4">Provider</th>
                <th
                  onClick={() => toggleSort('price')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Price</span>
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
                <th className="py-3 px-4">24h High / Low</th>
                <th className="py-3 px-4">Leverage</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredInstruments.map((inst) => {
                const quote = quotes[inst.symbol];
                const isFavorite = isInWatchlist(inst.symbol);
                const isPositive = quote ? quote.changePercent24h >= 0 : true;

                return (
                  <tr
                    key={inst.symbol}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleWatchlist(inst.symbol)}
                        className="text-slate-600 hover:text-amber-400 p-1"
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            isFavorite ? 'text-amber-400 fill-amber-400' : ''
                          }`}
                        />
                      </button>
                    </td>

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

                    <td className="py-3 px-4 font-sans text-slate-400">
                      {inst.provider === 'BINANCE' ? (
                        <div className="flex items-center gap-1 text-emerald-400">
                          <Radio className="w-3 h-3 animate-pulse" />
                          <span>Binance Public</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>Twelve Data</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-100 text-sm">
                      {quote ? formatPrice(quote.price, inst.digits) : '---'}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                          isPositive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>
                          {isPositive ? '+' : ''}
                          {quote ? quote.changePercent24h.toFixed(2) : '0.00'}%
                        </span>
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      <div>H: {quote ? formatPrice(quote.high24h, inst.digits) : '---'}</div>
                      <div>L: {quote ? formatPrice(quote.low24h, inst.digits) : '---'}</div>
                    </td>

                    <td className="py-3 px-4 text-slate-300">1:{inst.defaultLeverage}</td>

                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/trade/${inst.symbol.replace('/', '-')}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 font-bold transition-all text-xs"
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
