import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Login({ onRegister }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username, form.password);
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg,#1A1F2E 0%,#0F1117 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      fontFamily: "'Inter','Segoe UI',sans-serif",
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg,#E8620A,#F59E0B)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(232,98,10,.4)',
          }}>P</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-.02em', marginBottom: 4 }}>PulseCart</h1>
          <p style={{ fontSize: 12, color: '#8898AA', letterSpacing: '.1em', textTransform: 'uppercase' }}>Retail Intelligence Platform</p>
        </div>

        {/* Card */}
        <div style={{ background: '#1A1F2E', border: '1px solid #2D3748', borderRadius: 16, padding: 32, boxShadow: '0 20px 60px rgba(0,0,0,.4)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#F1F5F9', marginBottom: 6 }}>Sign in</h2>
          <p style={{ fontSize: 13, color: '#8898AA', marginBottom: 24 }}>Use your store credentials to continue</p>

          {error && (
            <div style={{ background: '#2D0A0A', border: '1px solid rgba(220,38,38,.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#EF4444' }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 6, letterSpacing: '.03em' }}>USERNAME</label>
              <input
                id="login-username"
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="Enter your username"
                required
                style={{
                  width: '100%', padding: '11px 14px', background: '#0F1117',
                  border: '1px solid #2D3748', borderRadius: 8, fontSize: 13,
                  color: '#F1F5F9', fontFamily: "'Inter',sans-serif", outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = '#E8620A'}
                onBlur={e => e.target.style.borderColor = '#2D3748'}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 6, letterSpacing: '.03em' }}>PASSWORD</label>
              <input
                id="login-password"
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Enter your password"
                required
                style={{
                  width: '100%', padding: '11px 14px', background: '#0F1117',
                  border: '1px solid #2D3748', borderRadius: 8, fontSize: 13,
                  color: '#F1F5F9', fontFamily: "'Inter',sans-serif", outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = '#E8620A'}
                onBlur={e => e.target.style.borderColor = '#2D3748'}
              />
            </div>
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px', background: loading ? '#C5510A' : 'linear-gradient(135deg,#E8620A,#F59E0B)',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
                color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: "'Inter',sans-serif", letterSpacing: '.01em',
                boxShadow: '0 4px 12px rgba(232,98,10,.35)',
              }}
            >
              {loading ? '⟳ Signing in...' : 'Sign In →'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: '#64748B' }}>Don't have an account? </span>
            <button onClick={onRegister} style={{ background: 'none', border: 'none', color: '#E8620A', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>
              Register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
