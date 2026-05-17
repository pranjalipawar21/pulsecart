import { useState } from 'react';
import api from '../services/api';

export default function Register({ onBack }) {
  const [form, setForm] = useState({ username: '', password: '', confirm: '', full_name: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await api.register({ username: form.username, password: form.password, full_name: form.full_name, email: form.email });
      setSuccess('Account created! You can now sign in.');
      setTimeout(onBack, 1500);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    }
    setLoading(false);
  };

  const inputStyle = {
    width: '100%', padding: '11px 14px', background: '#0F1117',
    border: '1px solid #2D3748', borderRadius: 8, fontSize: 13,
    color: '#F1F5F9', fontFamily: "'Inter',sans-serif", outline: 'none',
  };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 6, letterSpacing: '.03em' };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#1A1F2E,#0F1117)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'Inter',sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#E8620A,#F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 auto 14px', boxShadow: '0 8px 24px rgba(232,98,10,.4)' }}>P</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-.02em' }}>Create Account</h1>
          <p style={{ fontSize: 12, color: '#8898AA', marginTop: 4 }}>Register for PulseCart (Staff access)</p>
        </div>

        <div style={{ background: '#1A1F2E', border: '1px solid #2D3748', borderRadius: 16, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,.4)' }}>
          {error && <div style={{ background: '#2D0A0A', border: '1px solid rgba(220,38,38,.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#EF4444' }}>⚠ {error}</div>}
          {success && <div style={{ background: '#022C22', border: '1px solid rgba(5,150,105,.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#10B981' }}>✓ {success}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>FULL NAME</label>
              <input id="reg-name" type="text" value={form.full_name} onChange={set('full_name')} placeholder="Your full name" style={inputStyle} onFocus={e => e.target.style.borderColor='#E8620A'} onBlur={e => e.target.style.borderColor='#2D3748'} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>EMAIL</label>
              <input id="reg-email" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" style={inputStyle} onFocus={e => e.target.style.borderColor='#E8620A'} onBlur={e => e.target.style.borderColor='#2D3748'} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>USERNAME *</label>
              <input id="reg-username" type="text" value={form.username} onChange={set('username')} placeholder="Choose a username" required style={inputStyle} onFocus={e => e.target.style.borderColor='#E8620A'} onBlur={e => e.target.style.borderColor='#2D3748'} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>PASSWORD *</label>
              <input id="reg-password" type="password" value={form.password} onChange={set('password')} placeholder="Min 6 characters" required style={inputStyle} onFocus={e => e.target.style.borderColor='#E8620A'} onBlur={e => e.target.style.borderColor='#2D3748'} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>CONFIRM PASSWORD *</label>
              <input id="reg-confirm" type="password" value={form.confirm} onChange={set('confirm')} placeholder="Repeat password" required style={inputStyle} onFocus={e => e.target.style.borderColor='#E8620A'} onBlur={e => e.target.style.borderColor='#2D3748'} />
            </div>
            <button id="reg-submit" type="submit" disabled={loading} style={{ width: '100%', padding: 12, background: 'linear-gradient(135deg,#E8620A,#F59E0B)', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Inter',sans-serif", boxShadow: '0 4px 12px rgba(232,98,10,.35)' }}>
              {loading ? '⟳ Creating...' : 'Create Account'}
            </button>
          </form>

          <div style={{ marginTop: 18, textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: '#64748B' }}>Already have an account? </span>
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#E8620A', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>Sign in</button>
          </div>
        </div>
      </div>
    </div>
  );
}
