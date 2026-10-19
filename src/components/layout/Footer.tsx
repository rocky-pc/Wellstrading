import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, ShieldCheck, Zap, Database, Server } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-[#070b14] text-slate-400 text-xs py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-8">
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3 md:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="font-extrabold text-sm tracking-tight text-white">WELLS</span>
              <span className="font-extrabold text-sm tracking-tight text-emerald-400">TRADING</span>
            </Link>
            <p className="text-slate-400 text-xs leading-relaxed">
              Institutional-grade paper trading terminal inspired by XM&apos;s UX. Real-time market data powered by Twelve Data and Binance.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-200 mb-3 uppercase tracking-wider text-[11px]">
              Markets & Trading
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/markets" className="hover:text-emerald-400 transition-colors">
                  Forex Currencies
                </Link>
              </li>
              <li>
                <Link to="/markets" className="hover:text-emerald-400 transition-colors">
                  Cryptocurrency Pairs
                </Link>
              </li>
              <li>
                <Link to="/markets" className="hover:text-emerald-400 transition-colors">
                  Global Equities & Stocks
                </Link>
              </li>
              <li>
                <Link to="/markets" className="hover:text-emerald-400 transition-colors">
                  Precious Metals & Gold
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-200 mb-3 uppercase tracking-wider text-[11px]">
              Platform & Terminal
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/trade/EUR-USD" className="hover:text-emerald-400 transition-colors">
                  Trading Terminal
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-emerald-400 transition-colors">
                  Portfolio Dashboard
                </Link>
              </li>
              <li>
                <Link to="/positions" className="hover:text-emerald-400 transition-colors">
                  Open Positions
                </Link>
              </li>
              <li>
                <Link to="/history" className="hover:text-emerald-400 transition-colors">
                  Order & Trade History
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-200 mb-3 uppercase tracking-wider text-[11px]">
              Architecture
            </h4>
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center gap-2 text-slate-300">
                <Server className="w-3.5 h-3.5 text-emerald-400" />
                <span>100% Serverless on Vercel</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Database className="w-3.5 h-3.5 text-sky-400" />
                <span>Supabase PostgreSQL & RLS</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Twelve Data & Binance APIs</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>TradingView Lightweight Charts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Regulatory & Risk Disclaimer (XM-style compliant notice) */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] leading-relaxed text-slate-400 space-y-2">
          <div className="font-semibold text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Simulated Paper Trading Risk Notice
          </div>
          <p>
            WellsTrading provides simulated demo trading software strictly for educational and training purposes. The $10,000 USD virtual credit provided has no monetary value and cannot be withdrawn or exchanged. Trading financial derivatives involves high risk of rapid capital loss due to leverage. Real-money broker trading should only be conducted through appropriately licensed entities.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 gap-4">
          <div>&copy; {new Date().getFullYear()} WellsTrading Technologies. Original branding &amp; architecture. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <span>Serverless Edge Architecture</span>
            <span>&bull;</span>
            <span>Zero Real Financial Risk</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
