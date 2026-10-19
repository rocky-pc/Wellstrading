import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { INSTRUMENTS, formatPrice } from '@/lib/instruments';
import { Instrument, MarketQuote } from '@/types';
import { MarketDataService } from '@/services/marketData';
import { Search, X, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const InstrumentSearchModal: React.FC<Props> = ({ onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'FOREX' | 'CRYPTO' | 'STOCKS' | 'COMMODITIES'>('ALL');
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});

  // Filter instruments
  const filtered = INSTRUMENTS.filter((inst) => {
    const matchesTab = activeTab === 'ALL' || inst.assetClass === activeTab;
    const matchesQuery =
      inst.symbol.toLowerCase().includes(query.toLowerCase()) ||
      inst.name.toLowerCase().includes(query.toLowerCase());
    return matchesTab && matchesQuery;
  });

  // Pre-fetch quotes for top 8 filtered instruments
  useEffect(() => {
    const sample = filtered.slice(0, 8);
    sample.forEach(async (inst) => {
      try {
        const q = await MarketDataService.getQuote(inst.symbol);
        setQuotes((prev) => ({ ...prev, [inst.symbol]: q }));
      } catch {
        // ignore
      }
    });
  }, [filtered.length, activeTab]);

  // Handle keyboard ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSelect = (symbol: string) => {
    const normalized = symbol.replace('/', '-');
    navigate(`/trade/${normalized}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 border-b border-slate-800">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbol, forex pair, crypto, or stock..."
            autoFocus
            className="w-full h-14 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-2 px-2 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 rounded border border-slate-700"
          >
            ESC
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 text-xs overflow-x-auto">
          {(['ALL', 'FOREX', 'CRYPTO', 'STOCKS', 'COMMODITIES'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/50 p-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No trading instruments found matching &quot;{query}&quot;
            </div>
          ) : (
            filtered.map((inst) => {
              const quote = quotes[inst.symbol];
              const isPositive = quote ? quote.changePercent24h >= 0 : true;

              return (
                <div
                  key={inst.symbol}
                  onClick={() => handleSelect(inst.symbol)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/60 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-100 group-hover:text-emerald-400 transition-colors">
                          {inst.symbol}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                          {inst.assetClass}
                        </span>
                        <span className="text-[10px] px-1 py-0.5 rounded text-slate-500">
                          {inst.provider === 'BINANCE' ? 'Binance' : 'Twelve Data'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 truncate max-w-xs">{inst.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {quote ? (
                      <div className="text-right">
                        <div className="text-xs font-mono font-semibold text-slate-100">
                          {formatPrice(quote.price, inst.digits)}
                        </div>
                        <div
                          className={`text-[11px] font-mono flex items-center justify-end gap-1 ${
                            isPositive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isPositive ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          <span>
                            {isPositive ? '+' : ''}
                            {quote.changePercent24h.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 font-mono">1:{inst.defaultLeverage}x</span>
                    )}

                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default InstrumentSearchModal;
