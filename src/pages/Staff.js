import { useState, useEffect } from 'react';
import api from '../services/api';

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast toast-${type}`}>{msg} <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8, opacity: .7 }}>✕</button></div>;
}

function AddStaffModal({ onClose, onSave }) {
  const [form, setForm] = useState({ username: '', password: '', full_name: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await api.register({ ...form, role: 'staff' }); onSave(); }
    catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">👤 Add Staff Member</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--danger)' }}>⚠ {error}</div>}
            <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" value={form.full_name} onChange={set('full_name')} placeholder="Employee full name" /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={set('email')} placeholder="employee@store.com" /></div>
            <div className="form-group"><label className="form-label">Username *</label><input className="form-input" value={form.username} onChange={set('username')} placeholder="Login username" required /></div>
            <div className="form-group"><label className="form-label">Password *</label><input className="form-input" type="password" value={form.password} onChange={set('password')} placeholder="Min 6 characters" required /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-brand" disabled={loading}>{loading ? '⟳ Adding…' : 'Add Staff'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Staff() {
  const [staff, setStaff]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(false);
  const [toast, setToast]   = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const load = async () => {
    setLoading(true);
    try { const r = await api.getStaff(); setStaff(r.data || []); }
    catch (e) { showToast(e.message, 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  return (
    <div className="page-content fade-in">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {modal && <AddStaffModal onClose={() => setModal(false)} onSave={() => { setModal(false); showToast('Staff member added!'); load(); }} />}

      <div className="page-header">
        <div><div className="page-title">👥 Staff Management</div><div className="page-sub">Manage store team members and access</div></div>
        <button id="add-staff-btn" className="btn btn-brand" onClick={() => setModal(true)}>➕ Add Staff</button>
      </div>

      <div className="table-wrap">
        <div className="table-controls">
          <div className="table-controls-title">Team Members <span className="badge badge-brand" style={{ marginLeft: 10 }}>{staff.length}</span></div>
        </div>

        {loading ? (
          <div className="empty-state"><div className="spin" style={{ fontSize: 28 }}>⟳</div><div className="empty-sub" style={{ marginTop: 12 }}>Loading staff…</div></div>
        ) : staff.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <div className="empty-title">No staff yet</div>
            <div className="empty-sub">Add your first team member to get started.</div>
            <button className="btn btn-brand" onClick={() => setModal(true)}>➕ Add Staff</button>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
            <tbody>
              {staff.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: u.role === 'owner' ? 'linear-gradient(135deg,#E8620A,#F59E0B)' : 'linear-gradient(135deg,#0284C7,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {(u.full_name || u.username)[0].toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600 }}>{u.full_name || '—'}</span>
                    </div>
                  </td>
                  <td><span className="mono" style={{ color: 'var(--text)' }}>@{u.username}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{u.email || '—'}</td>
                  <td>
                    {u.role === 'owner'
                      ? <span className="badge badge-brand">👑 OWNER</span>
                      : <span className="badge badge-info">STAFF</span>
                    }
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
