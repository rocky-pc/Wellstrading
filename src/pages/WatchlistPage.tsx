import React from 'react';
import { Link } from 'react-router-dom';
import { INSTRUMENTS } from '@/lib/instruments';
import { useTrading } from '@/context/TradingContext';
import WatchlistWidget from '@/components/trading/WatchlistWidget';
import { Star, ArrowRight, Layers } from 'lucide-react';

export const WatchlistPage: React.FC = () => {
  const { watchlist } = useTrading();

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <h1 className="text-2xl font-black text-white">Favorite Watchlists</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Pin and monitor your favorite Forex pairs, cryptocurrencies, and stocks with real-time updates.
          </p>
        </div>

        <Link
          to="/markets"
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
        >
          <span>Browse All Markets</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Main Watchlist Container */}
      <div className="h-[650px] rounded-2xl border border-slate-800 bg-[#090e1a] overflow-hidden shadow-2xl">
        <WatchlistWidget />
      </div>
    </div>
  );
};

export default WatchlistPage;
