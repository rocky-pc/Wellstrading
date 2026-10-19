import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { TrendingUp, Lock, Mail, User, AlertCircle, ShieldCheck } from 'lucide-react';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, quickDemoLogin } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signUp(email, password, fullName);
    setLoading(false);

    if (res.error) {
      setError(res.error.message);
    } else {
      navigate('/dashboard');
    }
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
          <h2 className="text-xl font-bold text-white">Open Demo Account</h2>
          <p className="text-xs text-slate-400">
            Auto-credited with $10,000 USD virtual funds upon registration.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Trader"
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

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
            <label className="text-xs font-medium text-slate-300">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Includes virtual $10,000 USD balance, 1:100 leverage, and live institutional market data.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20"
          >
            {loading ? 'Creating Account...' : 'Register & Start Demo Trading'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Already registered?{' '}
          <Link to="/login" className="text-emerald-400 hover:underline font-semibold">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
