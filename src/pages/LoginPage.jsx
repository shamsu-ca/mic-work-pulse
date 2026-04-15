import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError("Invalid email or password. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl shadow-primary/10 border border-white/60 p-8 flex flex-col gap-6">
          
          {/* Logo + Title */}
          <div className="flex flex-col items-center gap-3 text-center">
            <img 
              src="/app-icon-192.png" 
              alt="MIC WorkPulse" 
              className="w-16 h-16 rounded-2xl shadow-lg shadow-primary/20 object-cover"
              onError={(e) => { e.target.style.display='none'; }}
            />
            <div>
              <h1 className="text-2xl font-extrabold text-on-surface tracking-tight font-headline">MIC WorkPulse</h1>
              <p className="text-sm text-on-surface-variant font-medium mt-1">Sign in to your workspace</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-semibold">
              <span className="material-symbols-outlined text-[18px] flex-shrink-0">error</span>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-[18px]">mail</span>
                <input
                  type="email"
                  className="w-full bg-slate-50 border border-outline-variant rounded-xl pl-10 pr-4 py-3 text-sm font-medium text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-white transition-all"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-[18px]">lock</span>
                <input
                  type="password"
                  className="w-full bg-slate-50 border border-outline-variant rounded-xl pl-10 pr-4 py-3 text-sm font-medium text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-white transition-all"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-primary text-white font-bold py-3 rounded-xl shadow-md shadow-primary/30 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  Signing in...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  Sign In
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-on-surface-variant/70 font-medium">
            Need access? Contact your Administrator.
          </p>
        </div>

        <p className="text-center text-[10px] text-on-surface-variant/40 mt-4 font-medium tracking-wider uppercase">
          MIC WorkPulse · Secure Internal Portal
        </p>
      </div>
    </div>
  );
}
