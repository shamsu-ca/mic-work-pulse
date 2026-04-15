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
      setError("Please enter both email and password.");
      return;
    }
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--surface-container-low)' }}>
      <div className="surface-card flex-column gap-4" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        <div className="flex-column gap-2" style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div className="logo-icon bg-primary" style={{ margin: '0 auto', width: '48px', height: '48px', borderRadius: '8px' }}></div>
          <h1 className="headline-sm m-0">WorkPulse ERP</h1>
          <span className="label-sm text-muted">Sign in to your account</span>
        </div>

        {error && <div className="alert-strip text-center" style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{error}</div>}

        <form className="flex-column gap-4">
          <input 
            type="email" 
            className="input-base" 
            placeholder="Email address" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input 
            type="password" 
            className="input-base" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          <div className="flex-column gap-2 mt-2">
            <button 
              className="btn btn-primary w-full" 
              onClick={handleLogin}
              disabled={loading}
              type="submit"
            >
              {loading ? 'Processing...' : 'Sign In'}
            </button>
          </div>
          
          <div className="text-center mt-3">
            <span className="label-sm text-muted">Need an account? Contact your Administrator.</span>
          </div>
        </form>
      </div>
    </div>
  );
}
