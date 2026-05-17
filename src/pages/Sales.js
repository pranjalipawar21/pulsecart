import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast toast-${type}`}>{msg} <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8, opacity: .7 }}>✕</button></div>;
}

function SaleModal({ products, onClose, onSave }) {
  const [form, setForm] = useState({ product_id: '', quantity_sold: 1, selling_price: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const selectedProduct = products.find(p => p.id === Number(form.product_id));

  const handleProductChange = (e) => {
    const p = products.find(pr => pr.id === Number(e.target.value));
    setForm(f => ({ ...f, product_id: e.target.value, selling_price: p ? p.price : '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await api.createSale(form); onSave(); }
    catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">💰 Record New Sale</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--danger)' }}>⚠ {error}</div>}
            <div className="form-group">
              <label className="form-label">Product *</label>
              <select className="form-select" value={form.product_id} onChange={handleProductChange} required>
                <option value="">Select a product</option>
                {products.map(p => (
                  <option key={p.id} value={p.id} disabled={p.stock === 0}>
                    {p.product} (Stock: {p.stock}) — ₹{p.price}
                  </option>
                ))}
              </select>
            </div>
            {selectedProduct && (
              <div style={{ background: 'var(--panel-alt)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text)' }}>{selectedProduct.product}</strong>
                {' · '}Available: <strong style={{ color: selectedProduct.stock <= selectedProduct.reorder_threshold ? 'var(--danger)' : 'var(--success)' }}>{selectedProduct.stock} units</strong>
                {' · '}SKU: <span className="mono">{selectedProduct.sku}</span>
              </div>
            )}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input className="form-input" type="number" min="1" max={selectedProduct?.stock || 9999} value={form.quantity_sold} onChange={set('quantity_sold')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Selling Price (₹) *</label>
                <input className="form-input" type="number" step="0.01" value={form.selling_price} onChange={set('selling_price')} required />
              </div>
            </div>
            {form.product_id && form.quantity_sold && form.selling_price && (
              <div style={{ background: 'var(--success-bg)', border: '1px solid rgba(5,150,105,.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>
                Total: ₹{(Number(form.quantity_sold) * Number(form.selling_price)).toLocaleString('en-IN')}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea className="form-textarea" value={form.notes} onChange={set('notes')} placeholder="Customer name, sale reference…" rows={2} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-brand" disabled={loading}>{loading ? '⟳ Recording…' : 'Record Sale'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Sales({ isOwner }) {
  const [sales, setSales]       = useState([]);
  const [products, setProducts] = useState([]);
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [toast, setToast]       = useState(null);
  const [days, setDays]         = useState(30);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p, sm] = await Promise.all([api.getSales(days), api.getProducts(), api.getSalesSummary()]);
      setSales(s.data || []);
      setProducts((p.data || []).filter(pr => pr.stock > 0));
      setSummary(sm.data || null);
    } catch (e) { showToast(e.message, 'error'); }
    setLoading(false);
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const today = summary?.today || {};
  const fmt = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  return (
    <div className="page-content fade-in">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {modal && <SaleModal products={products} onClose={() => setModal(false)} onSave={() => { setModal(false); showToast('Sale recorded! Stock updated.'); load(); }} />}

      <div className="page-header">
        <div><div className="page-title">💰 Sales</div><div className="page-sub">Record sales and track revenue</div></div>
        <button id="create-sale-btn" className="btn btn-brand" onClick={() => setModal(true)}>➕ Record Sale</button>
      </div>

      {/* Today's Summary */}
      {summary && (
        <div className="kpi-grid" style={{ marginBottom: 24 }}>
          <div className="kpi-card"><div className="kpi-accent" style={{ background: 'linear-gradient(90deg,#E8620A,#E8620A55)' }} /><div className="kpi-label">Today's Revenue</div><div className="kpi-value" style={{ color: 'var(--brand)', fontSize: 22 }}>{fmt(today.today_revenue)}</div></div>
          <div className="kpi-card"><div className="kpi-accent" style={{ background: 'linear-gradient(90deg,#059669,#05966955)' }} /><div className="kpi-label">Transactions Today</div><div className="kpi-value" style={{ color: 'var(--success)', fontSize: 22 }}>{today.total_transactions || 0}</div></div>
          <div className="kpi-card"><div className="kpi-accent" style={{ background: 'linear-gradient(90deg,#8B5CF6,#8B5CF655)' }} /><div className="kpi-label">Units Sold Today</div><div className="kpi-value" style={{ color: '#8B5CF6', fontSize: 22 }}>{today.total_units_sold || 0}</div></div>
        </div>
      )}

      <div className="table-wrap">
        <div className="table-controls">
          <div className="table-controls-title">Sales History</div>
          <select className="form-select" style={{ width: 160 }} value={days} onChange={e => setDays(Number(e.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        {loading ? <div className="empty-state"><div className="spin" style={{ fontSize: 28 }}>⟳</div><div className="empty-sub" style={{ marginTop: 12 }}>Loading sales…</div></div>
        : sales.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💰</div>
            <div className="empty-title">No sales recorded</div>
            <div className="empty-sub">Record your first sale to see history here.</div>
            <button className="btn btn-brand" onClick={() => setModal(true)}>➕ Record Sale</button>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr>
              <th>#</th><th>Product</th><th>SKU</th><th>Category</th>
              <th>Qty</th><th>Price</th><th>Total</th><th>Staff</th><th>Date</th>
            </tr></thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>#{s.id}</td>
                  <td style={{ fontWeight: 600 }}>{s.product}</td>
                  <td><span className="mono">{s.sku}</span></td>
                  <td><span className="badge badge-neutral">{s.category || '—'}</span></td>
                  <td style={{ fontWeight: 700 }}>{s.quantity_sold}</td>
                  <td>₹{Number(s.selling_price).toLocaleString('en-IN')}</td>
                  <td style={{ fontWeight: 700, color: 'var(--success)' }}>₹{Number(s.total_amount).toLocaleString('en-IN')}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.staff_name || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(s.sale_date).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
