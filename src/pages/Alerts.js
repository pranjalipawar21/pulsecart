import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast toast-${type}`}>{msg} <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8, opacity: .7 }}>✕</button></div>;
}

export default function Alerts({ isOwner, onCountChange }) {
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('pending');
  const [toast, setToast]     = useState(null);
  const [completing, setCompleting] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAlerts(filter || null);
      const data = res.data || [];
      setAlerts(data);
      if (onCountChange) onCountChange(data.filter(a => a.status === 'pending').length);
    } catch (e) { showToast(e.message, 'error'); }
    setLoading(false);
  }, [filter, onCountChange]);

  useEffect(() => { load(); }, [load]);

  const handleComplete = async (id) => {
    setCompleting(id);
    try { await api.completeAlert(id); showToast('Alert marked as completed.'); load(); }
    catch (e) { showToast(e.message, 'error'); }
    setCompleting(null);
  };

  const handleGenerate = async () => {
    try { const res = await api.generateAlerts(); showToast(`${res.message}`); load(); }
    catch (e) { showToast(e.message, 'error'); }
  };

  const urgencyBadge = (u) => {
    if (u === 'critical') return <span className="badge badge-danger">CRITICAL</span>;
    if (u === 'low')      return <span className="badge badge-warning">LOW</span>;
    return <span className="badge badge-success">OK</span>;
  };

  const pending = alerts.filter(a => a.status === 'pending').length;

  return (
    <div className="page-content fade-in">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div>
          <div className="page-title">🔔 Reorder Alerts</div>
          <div className="page-sub">{pending} pending alerts require attention</div>
        </div>
        {isOwner && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" onClick={handleGenerate} id="generate-alerts-btn">⚡ Generate Alerts</button>
            <button className="btn btn-outline" onClick={load}>↺ Refresh</button>
          </div>
        )}
      </div>

      {/* Summary banner */}
      {pending > 0 && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 14 }}>{pending} products need restocking</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Stock levels have dropped below the configured thresholds.</div>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <div className="table-controls">
          <div className="table-controls-title">Alerts</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <select className="form-select" style={{ width: 160 }} value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="pending">Pending Only</option>
              <option value="completed">Completed</option>
              <option value="">All Alerts</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><div className="spin" style={{ fontSize: 28 }}>⟳</div><div className="empty-sub" style={{ marginTop: 12 }}>Loading alerts…</div></div>
        ) : alerts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">{filter === 'pending' ? '✅' : '🔔'}</div>
            <div className="empty-title">{filter === 'pending' ? 'All stock levels healthy!' : 'No alerts found'}</div>
            <div className="empty-sub">{filter === 'pending' ? 'No products are currently below their reorder threshold.' : 'Try changing the filter to see alerts.'}</div>
            {isOwner && filter === 'pending' && <button className="btn btn-outline" onClick={handleGenerate}>⚡ Scan for Low Stock</button>}
          </div>
        ) : (
          <table className="data-table">
            <thead><tr>
              <th>Product</th><th>SKU</th><th>Current Stock</th>
              <th>Threshold</th><th>Live Stock</th><th>Supplier</th>
              <th>Urgency</th><th>Created</th><th>Status</th>
              {isOwner && <th>Action</th>}
            </tr></thead>
            <tbody>
              {alerts.map(a => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600 }}>{a.product}</td>
                  <td><span className="mono">{a.sku}</span></td>
                  <td style={{ fontWeight: 700, color: 'var(--danger)' }}>{a.current_stock}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{a.threshold}</td>
                  <td style={{ fontWeight: 700, color: a.live_stock <= a.threshold ? 'var(--danger)' : 'var(--success)' }}>{a.live_stock}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.supplier_name || '—'}</td>
                  <td>{urgencyBadge(a.urgency)}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(a.created_at).toLocaleDateString('en-IN')}</td>
                  <td>
                    {a.status === 'pending'
                      ? <span className="badge badge-warning">PENDING</span>
                      : <span className="badge badge-success">DONE</span>
                    }
                  </td>
                  {isOwner && (
                    <td>
                      {a.status === 'pending' && (
                        <button
                          id={`complete-alert-${a.id}`}
                          className="btn btn-success btn-sm"
                          onClick={() => handleComplete(a.id)}
                          disabled={completing === a.id}
                        >
                          {completing === a.id ? '⟳' : '✓ Done'}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
