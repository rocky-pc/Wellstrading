import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTrading } from '@/context/TradingContext';
import { formatCurrency } from '@/lib/instruments';
import {
  TrendingUp,
  Search,
  RotateCcw,
  LogOut,
  ChevronDown,
  Settings,
  Shield,
  Menu,
  X,
} from 'lucide-react';
import InstrumentSearchModal from '../common/InstrumentSearchModal';

export const Navbar: React.FC = () => {
  const { user, signOut } = useAuth();
  const { account, equity, resetBalance } = useTrading();
  const location = useLocation();
  const [showSearch, setShowSearch] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    if (confirm('Reset your virtual demo balance to $10,000.00 USD?')) {
      setResetting(true);
      await resetBalance();
      setResetting(false);
      setShowProfileMenu(false);
    }
  };

  const navLinks = [
    { name: 'Terminal', path: '/trade/EUR-USD' },
    { name: 'Positions', path: '/positions' },
    { name: 'Markets', path: '/markets' },
    { name: 'History', path: '/history' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#070b14]/95 backdrop-blur-md font-sans">
        <div className="flex h-14 items-center justify-between px-3 md:px-6">
          {/* Left: Brand Logo & Navigation */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 group-hover:border-emerald-500 transition-colors">
                <TrendingUp className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base tracking-tight text-white">WELLS</span>
                <span className="font-black text-base tracking-tight text-emerald-400">TRADING</span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold">
              {navLinks.map((link) => {
                const isActive = location.pathname.startsWith(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-slate-800 text-emerald-400 font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}

              {/* Admin Panel Nav Badge */}
              <Link
                to="/admin"
                className={`ml-2 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 border ${
                  location.pathname === '/admin'
                    ? 'bg-emerald-500 text-slate-950 font-black border-emerald-500'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Panel</span>
              </Link>
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
                <span>Search pairs (EUR, BTC, AAPL)</span>
              </div>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 rounded border border-slate-700">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Right: Account Summary & Profile */}
          <div className="flex items-center gap-3">
            {account && (
              <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs font-mono">
                <div>
                  <span className="text-slate-500 mr-1.5">Balance:</span>
                  <span className="font-semibold text-slate-100">
                    {formatCurrency(account.balance)}
                  </span>
                </div>
                <div className="h-3 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-500 mr-1.5">Equity:</span>
                  <span className={`font-semibold ${equity >= account.balance ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(equity)}
                  </span>
                </div>
              </div>
            )}

            {/* Profile Menu */}
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
                      <Link
                        to="/admin"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-emerald-400 hover:bg-slate-800/80 transition-colors font-bold"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Admin Market Controls</span>
                      </Link>

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
                        <span>Settings</span>
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
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Link
                  to="/admin"
                  className="px-2.5 py-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30 transition-colors flex items-center gap-1"
                >
                  <Shield className="w-3 h-3" />
                  <span>Admin</span>
                </Link>
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-colors"
                >
                  Demo Account
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
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
            <div className="grid grid-cols-2 gap-1.5">
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
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
              >
                ⚡ Admin Panel
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Global Search Modal */}
      {showSearch && <InstrumentSearchModal onClose={() => setShowSearch(false)} />}
    </>
  );
};

export default Navbar;
