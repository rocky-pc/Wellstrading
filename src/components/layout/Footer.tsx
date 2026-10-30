import React from 'react';
import { Activity, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-[#070b14] text-slate-500 text-[11px] py-3 px-4 font-sans mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-300">WELLSTRADING</span>
          <span>•</span>
          <span className="text-slate-400">Algorithmic Engine (Low Latency 1s)</span>
          <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Synchronized
          </span>
        </div>

        <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
          <Link to="/admin" className="hover:text-emerald-400 transition-colors flex items-center gap-1 font-semibold text-slate-300">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>Admin Controls</span>
          </Link>
          <span>•</span>
          <span>Frontend + Supabase</span>
          <span>•</span>
          <span>Virtual Paper Trading</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
