import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { TrendingUp, Lock, Mail, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, quickDemoLogin, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn(email, password);
    setLoading(false);

    if (res.error) {
      setError(res.error.message);
    } else {
      navigate('/dashboard');
    }
  };

  const handleDemoAccess = () => {
    quickDemoLogin();
    navigate('/dashboard');
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4 bg-[#070b14]">
      <div className="w-full max-w-md rounded-2xl bg-slate-900/90 border border-slate-800 p-8 shadow-2xl backdrop-blur-xl">
        {/* Brand */}
        <div className="text-center space-y-2 mb-8">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">WELLS</span>
            <span className="font-extrabold text-xl tracking-tight text-emerald-400">TRADING</span>
          </Link>
          <h2 className="text-xl font-bold text-white">Welcome Back</h2>
          <p className="text-xs text-slate-400">
            Sign in to access your $10,000 USD virtual trading account.
          </p>
        </div>

        {/* 1-Click Instant Demo Login Option */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Instant Demo Access</span>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">
            Testing the platform? Jump straight into the trading dashboard with one click.
          </p>
          <button
            onClick={handleDemoAccess}
            className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <span>Launch with Demo Trader Account</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="relative flex items-center justify-center my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <span className="relative px-3 bg-slate-900 text-[11px] text-slate-500 uppercase tracking-wider">
            Or sign in with email
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-slate-300">Password</label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors border border-slate-700"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="text-emerald-400 hover:underline font-semibold">
            Create Demo Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
