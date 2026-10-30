import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { INSTRUMENTS, formatPrice } from '@/lib/instruments';
import { AssetClass, Instrument, MarketQuote } from '@/types';
import { useTrading } from '@/context/TradingContext';
import { MarketDataService } from '@/services/marketData';
import { Search, Star, TrendingUp, TrendingDown, Eye } from 'lucide-react';

interface Props {
  activeSymbol?: string;
  onSelectSymbol?: (symbol: string) => void;
}

export const WatchlistWidget: React.FC<Props> = ({ activeSymbol, onSelectSymbol }) => {
  const navigate = useNavigate();
  const { watchlist, toggleWatchlist, isInWatchlist } = useTrading();
  const [filter, setFilter] = useState<'ALL' | 'FAVORITES' | AssetClass>('ALL');
  const [search, setSearch] = useState('');
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});

  useEffect(() => {
    setInstruments(MarketDataService.getAllInstruments());
    const unsubscribe = MarketDataService.subscribeAll((newQuotes) => {
      setQuotes((prev) => ({ ...prev, ...newQuotes }));
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Filter instruments
  const displayed = instruments.filter((inst) => {
    const matchesSearch =
      inst.symbol.toLowerCase().includes(search.toLowerCase()) ||
      inst.name.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === 'FAVORITES') return isInWatchlist(inst.symbol);
    if (filter === 'ALL') return true;
    return inst.assetClass === filter;
  });

  const handleSelect = (symbol: string) => {
    if (onSelectSymbol) {
      onSelectSymbol(symbol);
    } else {
      navigate(`/trade/${symbol.replace('/', '-')}`);
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#090e1a] rounded-xl border border-slate-800/80 overflow-hidden">
      {/* Header & Search */}
      <div className="p-3 border-b border-slate-800 bg-[#070b14] space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs uppercase tracking-wider text-slate-300">
            Market Watchlist
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {displayed.length} instruments
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Filter symbols..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-7 pl-8 pr-2 text-xs bg-slate-900 border border-slate-800 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-700"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto text-[10px] pt-1">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-2 py-0.5 rounded font-medium transition-colors shrink-0 ${
              filter === 'ALL'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('FAVORITES')}
            className={`px-2 py-0.5 rounded font-medium transition-colors flex items-center gap-1 shrink-0 ${
              filter === 'FAVORITES'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            <Star className="w-2.5 h-2.5 fill-current" />
            <span>Favs</span>
          </button>
          <button
            onClick={() => setFilter('FOREX')}
            className={`px-2 py-0.5 rounded font-medium transition-colors shrink-0 ${
              filter === 'FOREX'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            Forex
          </button>
          <button
            onClick={() => setFilter('CRYPTO')}
            className={`px-2 py-0.5 rounded font-medium transition-colors shrink-0 ${
              filter === 'CRYPTO'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            Crypto
          </button>
          <button
            onClick={() => setFilter('STOCKS')}
            className={`px-2 py-0.5 rounded font-medium transition-colors shrink-0 ${
              filter === 'STOCKS'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            Stocks
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
        {displayed.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">No instruments found</div>
        ) : (
          displayed.map((inst) => {
            const isSelected =
              activeSymbol &&
              (inst.symbol.toUpperCase() === activeSymbol.toUpperCase() ||
                inst.symbol.replace('/', '-').toUpperCase() === activeSymbol.toUpperCase());

            const quote = quotes[inst.symbol];
            const isFavorite = isInWatchlist(inst.symbol);
            const isPositive = quote ? quote.changePercent24h >= 0 : true;

            return (
              <div
                key={inst.symbol}
                onClick={() => handleSelect(inst.symbol)}
                className={`flex items-center justify-between p-2.5 cursor-pointer text-xs transition-colors group ${
                  isSelected
                    ? 'bg-emerald-500/10 border-l-2 border-emerald-500'
                    : 'hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWatchlist(inst.symbol);
                    }}
                    className="text-slate-600 hover:text-amber-400 p-0.5 transition-colors"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        isFavorite ? 'text-amber-400 fill-amber-400' : ''
                      }`}
                    />
                  </button>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
                        {inst.symbol}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 truncate max-w-[100px]">
                      {inst.name}
                    </span>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="font-semibold text-slate-200">
                    {quote ? formatPrice(quote.price, inst.digits) : '---'}
                  </div>
                  <div
                    className={`text-[10px] flex items-center justify-end gap-0.5 ${
                      isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isPositive ? '+' : ''}
                    {quote ? quote.changePercent24h.toFixed(2) : '0.00'}%
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default WatchlistWidget;
