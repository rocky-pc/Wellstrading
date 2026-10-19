import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTrading } from '@/context/TradingContext';
import { formatCurrency } from '@/lib/instruments';
import {
  TrendingUp,
  Search,
  RotateCcw,
  User,
  LogOut,
  ChevronDown,
  Layers,
  Star,
  Globe,
  Settings,
  ShieldCheck,
  Menu,
  X,
} from 'lucide-react';
import InstrumentSearchModal from '../common/InstrumentSearchModal';

export const Navbar: React.FC = () => {
  const { user, signOut } = useAuth();
  const { account, equity, marginLevel, resetBalance } = useTrading();
  const location = useLocation();
  const [showSearch, setShowSearch] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset your virtual demo balance to $10,000.00 USD?')) {
      setResetting(true);
      await resetBalance();
      setResetting(false);
      setShowProfileMenu(false);
    }
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Terminal', path: '/trade/EUR-USD' },
    { name: 'Markets', path: '/markets' },
    { name: 'Positions', path: '/positions' },
    { name: 'History', path: '/history' },
    { name: 'Watchlist', path: '/watchlist' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#070b14]/95 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-3 md:px-6">
          {/* Left: Brand Logo & Navigation */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-sky-500/20 border border-emerald-500/30 group-hover:border-emerald-500 transition-colors">
                <TrendingUp className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-white">WELLS</span>
                  <span className="font-extrabold text-base tracking-tight text-emerald-400">TRADING</span>
                </div>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
              {navLinks.map((link) => {
                const isActive = location.pathname.startsWith(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      isActive
                        ? 'bg-slate-800 text-emerald-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Center: Search Button */}
          <div className="hidden md:flex items-center flex-1 max-w-xs mx-4">
            <button
              onClick={() => setShowSearch(true)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-400 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400" />
                <span>Search instruments... (EUR, BTC, AAPL)</span>
              </div>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 rounded border border-slate-700">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Right: Account Summary & Profile */}
          <div className="flex items-center gap-3">
            {/* Quick Demo Stats Pill */}
            {account && (
              <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    DEMO
                  </span>
                  <span className="text-slate-400 font-mono">{account.account_number}</span>
                </div>
                <div className="h-3 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-400 mr-1.5">Balance:</span>
                  <span className="font-semibold text-slate-100 font-mono">
                    {formatCurrency(account.balance)}
                  </span>
                </div>
                <div className="h-3 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-400 mr-1.5">Equity:</span>
                  <span className={`font-semibold font-mono ${equity >= account.balance ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(equity)}
                  </span>
                </div>
              </div>
            )}

            {/* Profile Dropdown */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                    {user.full_name?.charAt(0).toUpperCase() || 'T'}
                  </div>
                  <span className="hidden md:inline-block max-w-[100px] truncate">
                    {user.full_name || user.email}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900/95 border border-slate-800 shadow-2xl py-1 text-xs z-50 backdrop-blur-lg">
                    <div className="px-3 py-2 border-b border-slate-800">
                      <p className="font-semibold text-slate-200 truncate">{user.full_name}</p>
                      <p className="text-slate-400 truncate text-[11px]">{user.email}</p>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={handleReset}
                        disabled={resetting}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-amber-400 hover:bg-slate-800/80 transition-colors"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
                        <span>Reset Balance ($10,000)</span>
                      </button>

                      <Link
                        to="/settings"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-slate-300 hover:bg-slate-800/80 transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5 text-slate-400" />
                        <span>Account Settings</span>
                      </Link>
                    </div>

                    <div className="border-t border-slate-800 py-1">
                      <button
                        onClick={() => {
                          signOut();
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-rose-400 hover:bg-slate-800/80 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold transition-colors shadow-lg shadow-emerald-500/20"
                >
                  Open Demo Account
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-800 bg-[#070b14] px-4 py-3 space-y-2">
            <button
              onClick={() => {
                setShowSearch(true);
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 bg-slate-900 rounded-lg border border-slate-800"
            >
              <Search className="w-4 h-4 text-emerald-400" />
              <span>Search Instruments...</span>
            </button>

            <div className="grid grid-cols-2 gap-1.5 pt-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {account && (
              <div className="pt-2 border-t border-slate-800 text-xs flex justify-between items-center text-slate-400">
                <span>Balance: {formatCurrency(account.balance)}</span>
                <span className="text-emerald-400">Equity: {formatCurrency(equity)}</span>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Global Instrument Search Modal */}
      {showSearch && <InstrumentSearchModal onClose={() => setShowSearch(false)} />}
    </>
  );
};
