import { useState, useEffect } from 'react';
import api from '../services/api';

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast toast-${type}`}>{msg} <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8, opacity: .7 }}>✕</button></div>;
}

export default function Settings({ isOwner }) {
  const [form, setForm]   = useState({ store_name: '', owner_email: '', low_stock_default_threshold: 10, theme_preference: 'light', currency: 'INR', timezone: 'Asia/Kolkata' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);
  const [theme, setTheme]     = useState(() => localStorage.getItem('pc_theme') || 'light');

  const showToast = (msg, type = 'success') => setToast({ msg, type });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    api.getSettings()
      .then(r => setForm(r.data || {}))
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isOwner) return;
    setSaving(true);
    try {
      await api.updateSettings({ ...form, theme_preference: theme });
      showToast('Settings saved successfully!');
    } catch (err) { showToast(err.message, 'error'); }
    setSaving(false);
  };

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('pc_theme', next);
  };

  if (loading) return <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}><div className="spin" style={{ fontSize: 32 }}>⟳</div></div>;

  return (
    <div className="page-content fade-in">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div><div className="page-title">⚙️ Settings</div><div className="page-sub">Store configuration and preferences</div></div>
      </div>

      <div style={{ maxWidth: 640 }}>
        {/* Theme Card */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">🎨 Appearance</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>
                {theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                Toggle between light and dark interface theme
              </div>
            </div>
            <label className="toggle" htmlFor="theme-toggle">
              <input id="theme-toggle" type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
              <div className="toggle-track" />
            </label>
          </div>
        </div>

        {/* Store Info Card */}
        <form onSubmit={handleSave}>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">🏪 Store Information</div>
            <div className="form-group">
              <label className="form-label">Store Name</label>
              <input className="form-input" value={form.store_name || ''} onChange={set('store_name')} placeholder="Your store name" disabled={!isOwner} />
            </div>
            <div className="form-group">
              <label className="form-label">Owner Email</label>
              <input className="form-input" type="email" value={form.owner_email || ''} onChange={set('owner_email')} placeholder="owner@store.com" disabled={!isOwner} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Currency</label>
                <select className="form-select" value={form.currency || 'INR'} onChange={set('currency')} disabled={!isOwner}>
                  <option value="INR">₹ INR — Indian Rupee</option>
                  <option value="USD">$ USD — US Dollar</option>
                  <option value="EUR">€ EUR — Euro</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Timezone</label>
                <select className="form-select" value={form.timezone || 'Asia/Kolkata'} onChange={set('timezone')} disabled={!isOwner}>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                  <option value="UTC">UTC +0:00</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">📦 Inventory Defaults</div>
            <div className="form-group">
              <label className="form-label">Default Low Stock Threshold</label>
              <input className="form-input" type="number" min="1" value={form.low_stock_default_threshold || 10} onChange={set('low_stock_default_threshold')} disabled={!isOwner} style={{ maxWidth: 200 }} />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                New products will use this threshold when none is specified.
              </div>
            </div>
          </div>

          {isOwner ? (
            <button id="save-settings-btn" type="submit" className="btn btn-brand btn-lg" disabled={saving} style={{ width: '100%' }}>
              {saving ? '⟳ Saving…' : '💾 Save Settings'}
            </button>
          ) : (
            <div style={{ background: 'var(--panel-alt)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
              🔒 Only the store owner can modify settings.
            </div>
          )}
        </form>

        {/* Info */}
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-title">ℹ️ About PulseCart</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['Version', 'v3.0.0'], ['Stack', 'React + Node.js + MySQL'], ['Auth', 'JWT (8h expiry)'], ['Database', 'MySQL 8.0']].map(([k, v]) => (
              <div key={k} style={{ background: 'var(--panel-alt)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
