import React, { useState, useEffect } from 'react';
import { MarketQuote } from '@/types';
import { formatPrice } from '@/lib/instruments';

interface Props {
  quote: MarketQuote | null;
  digits?: number;
}

interface OrderBookRow {
  price: number;
  size: number;
  total: number;
}

export const MarketTape: React.FC<Props> = ({ quote, digits = 2 }) => {
  const [bids, setBids] = useState<OrderBookRow[]>([]);
  const [asks, setAsks] = useState<OrderBookRow[]>([]);

  useEffect(() => {
    if (!quote) return;
    const base = quote.price;
    const step = base * 0.0001;

    // Generate dynamic book depth around current quote
    const newAsks: OrderBookRow[] = [];
    let askTotal = 0;
    for (let i = 5; i >= 1; i--) {
      const p = base + step * i;
      const size = parseFloat((Math.random() * 4 + 0.5).toFixed(2));
      askTotal += size;
      newAsks.push({ price: p, size, total: askTotal });
    }

    const newBids: OrderBookRow[] = [];
    let bidTotal = 0;
    for (let i = 1; i <= 5; i++) {
      const p = base - step * i;
      const size = parseFloat((Math.random() * 4 + 0.5).toFixed(2));
      bidTotal += size;
      newBids.push({ price: p, size, total: bidTotal });
    }

    setAsks(newAsks);
    setBids(newBids);
  }, [quote?.price, digits]);

  return (
    <div className="flex flex-col w-full h-full bg-[#090e1a] rounded-xl border border-slate-800/80 overflow-hidden font-mono text-xs">
      <div className="px-3 py-2 border-b border-slate-800 bg-[#070b14] flex justify-between items-center text-[11px] text-slate-400 font-sans">
        <span className="font-bold uppercase tracking-wider text-slate-300">Order Depth</span>
        <span>Spread: {quote?.spread || '0.0001'}</span>
      </div>

      <div className="p-2 space-y-1">
        {/* Asks (Red) */}
        <div className="space-y-0.5">
          {asks.map((a, idx) => (
            <div
              key={idx}
              className="relative flex items-center justify-between text-[11px] px-2 py-0.5"
            >
              <div
                className="absolute inset-y-0 right-0 bg-rose-500/10 rounded-sm pointer-events-none"
                style={{ width: `${Math.min(100, (a.size / 5) * 100)}%` }}
              />
              <span className="text-rose-400 font-semibold">{formatPrice(a.price, digits)}</span>
              <span className="text-slate-400">{a.size}</span>
            </div>
          ))}
        </div>

        {/* Current Mid Price Banner */}
        <div className="my-1.5 py-1.5 px-3 bg-slate-900 border-y border-slate-800 flex items-center justify-between font-bold">
          <span className="text-slate-100 text-sm">
            {quote ? formatPrice(quote.price, digits) : '---'}
          </span>
          <span className="text-[10px] text-emerald-400 font-sans">Mid Market</span>
        </div>

        {/* Bids (Green) */}
        <div className="space-y-0.5">
          {bids.map((b, idx) => (
            <div
              key={idx}
              className="relative flex items-center justify-between text-[11px] px-2 py-0.5"
            >
              <div
                className="absolute inset-y-0 right-0 bg-emerald-500/10 rounded-sm pointer-events-none"
                style={{ width: `${Math.min(100, (b.size / 5) * 100)}%` }}
              />
              <span className="text-emerald-400 font-semibold">
                {formatPrice(b.price, digits)}
              </span>
              <span className="text-slate-400">{b.size}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarketTape;
