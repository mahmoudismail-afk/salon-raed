'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Scissors, Mail, Lock, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getUserRole } from '@/lib/actions/auth';
import '../auth.css';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'account-disabled') {
      setError('This account has been disabled or removed.');
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const emailToAuth = `${username.trim()}@salonraed.local`;
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: emailToAuth, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    let redirectPath = '/dashboard';
    const user = data?.user;

    if (user) {
      // Also check if they have a profile record
      const { data: profile } = await getUserRole(user.id);

      if (!profile) {
        await supabase.auth.signOut();
        setError('Your account record was not found. Please contact an admin.');
        setLoading(false);
        return;
      }

      const role = profile.role;
      if (role === 'staff') {
        redirectPath = '/members';
      }
    }

    // Hard redirect so the edge middleware always sees the fresh session cookie.
    // A soft router.push can race against the cookie being set on Cloudflare Workers.
    window.location.href = redirectPath;
  }

  return (
    <div className="auth-card animate-slide">
      {/* Logo */}
      <div className="auth-logo">
        <div className="auth-logo-icon">
          <Scissors size={28} />
        </div>
        <span className="auth-logo-text">Salon Raed</span>
      </div>

      <div className="auth-header">
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your management dashboard</p>
      </div>

      {error && (
        <div className="alert alert-danger animate-fade">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="auth-form" id="login-form">
        <div className="form-group">
          <label htmlFor="username" className="form-label">Username</label>
          <div className="input-with-icon">
            <Mail size={16} className="input-icon" />
            <input
              id="username"
              type="text"
              className="form-input"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
              required
              autoComplete="username"
              autoFocus
            />
          </div>
        </div>

        <div className="form-group">
          <div style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="password" className="form-label">Password</label>
          </div>
          <div className="input-with-icon">
            <Lock size={16} className="input-icon" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{ paddingRight: '2.75rem' }}
            />
            <button
              type="button"
              className="auth-eye-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          id="login-submit"
          type="submit"
          className={`btn btn-primary btn-full btn-lg ${loading ? 'btn-loading' : ''}`}
          disabled={loading}
        >
          {loading ? <span className="spinner" /> : null}
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="auth-page">
      {/* Background orbs */}
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <Suspense fallback={<div className="auth-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}><span className="spinner" /></div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
