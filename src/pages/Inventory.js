import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast toast-${type}`}>{msg} <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8, opacity: .7 }}>✕</button></div>;
}

function ProductModal({ product, categories, onClose, onSave }) {
  const editing = !!product?.id;
  const [form, setForm] = useState({
    sku: product?.sku || '', product_name: product?.product || '',
    category_id: product?.category_id || '', price: product?.price || '',
    cost_price: product?.cost_price || '', quantity: product?.stock || '',
    low_stock_threshold: product?.reorder_threshold || 10,
    supplier_name: product?.supplier_name || '', location: product?.location || 'Main Warehouse',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      if (editing) await api.updateProduct(product.id, form);
      else await api.createProduct(form);
      onSave();
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{editing ? '✏️ Edit Product' : '➕ Add New Product'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--danger)' }}>⚠ {error}</div>}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">SKU *</label>
                <input className="form-input" value={form.sku} onChange={set('sku')} placeholder="e.g. ELE-PHN-001" required disabled={editing} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category_id} onChange={set('category_id')}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input className="form-input" value={form.product_name} onChange={set('product_name')} placeholder="Product name" required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Selling Price (₹) *</label>
                <input className="form-input" type="number" step="0.01" value={form.price} onChange={set('price')} placeholder="0.00" required />
              </div>
              <div className="form-group">
                <label className="form-label">Cost Price (₹)</label>
                <input className="form-input" type="number" step="0.01" value={form.cost_price} onChange={set('cost_price')} placeholder="0.00" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Stock Quantity *</label>
                <input className="form-input" type="number" value={form.quantity} onChange={set('quantity')} placeholder="0" required />
              </div>
              <div className="form-group">
                <label className="form-label">Low Stock Threshold</label>
                <input className="form-input" type="number" value={form.low_stock_threshold} onChange={set('low_stock_threshold')} placeholder="10" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Supplier Name</label>
              <input className="form-input" value={form.supplier_name} onChange={set('supplier_name')} placeholder="Supplier company name" />
            </div>
            <div className="form-group">
              <label className="form-label">Location / Aisle</label>
              <input className="form-input" value={form.location} onChange={set('location')} placeholder="e.g. Aisle A1" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-brand" disabled={loading}>{loading ? '⟳ Saving…' : editing ? 'Save Changes' : 'Add Product'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Inventory({ isOwner }) {
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState('all');
  const [modal, setModal]           = useState(null); // null | 'add' | product-obj
  const [toast, setToast]           = useState(null);
  const [deleting, setDeleting]     = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([api.getProducts(), api.getCategories()]);
      setProducts(p.data || []);
      setCategories(c.data || []);
    } catch (e) { showToast(e.message, 'error'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    setDeleting(id);
    try { await api.deleteProduct(id); showToast('Product deleted.'); load(); }
    catch (e) { showToast(e.message, 'error'); }
    setDeleting(null);
  };

  const handleReorder = async (product) => {
    try { await api.reorderProduct(product.id, 50); showToast(`Reordered 50 units of ${product.product}`); load(); }
    catch (e) { showToast(e.message, 'error'); }
  };

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.product?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q);
    const matchFilter = filter === 'all' || (filter === 'low' && (p.status === 'low' || p.status === 'critical')) || (filter === 'critical' && p.status === 'critical');
    return matchSearch && matchFilter;
  });

  const statusBadge = (s) => {
    if (s === 'critical') return <span className="badge badge-danger">CRITICAL</span>;
    if (s === 'low')      return <span className="badge badge-warning">LOW</span>;
    return <span className="badge badge-success">OK</span>;
  };

  return (
    <div className="page-content fade-in">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {modal && <ProductModal product={modal === 'add' ? null : modal} categories={categories} onClose={() => setModal(null)} onSave={() => { setModal(null); showToast(modal === 'add' ? 'Product added!' : 'Product updated!'); load(); }} />}

      <div className="page-header">
        <div><div className="page-title">📦 Inventory</div><div className="page-sub">{products.length} products · MySQL-persisted</div></div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {isOwner && <button className="btn btn-brand" id="add-product-btn" onClick={() => setModal('add')}>➕ Add Product</button>}
          <button className="btn btn-outline" onClick={load}>↺ Refresh</button>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-controls">
          <div className="table-controls-title">Products
            <span className="badge badge-brand" style={{ marginLeft: 10 }}>{filtered.length}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input className="search-input" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-select" style={{ width: 140 }} value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">All Stock</option>
              <option value="low">Low Stock</option>
              <option value="critical">Critical Only</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><div className="spin" style={{ fontSize: 28 }}>⟳</div><div className="empty-sub" style={{ marginTop: 12 }}>Loading products…</div></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <div className="empty-title">No products found</div>
            <div className="empty-sub">{search ? 'Try a different search term.' : 'Add your first product to get started.'}</div>
            {isOwner && !search && <button className="btn btn-brand" onClick={() => setModal('add')}>➕ Add Product</button>}
          </div>
        ) : (
          <table className="data-table">
            <thead><tr>
              <th>SKU</th><th>Product</th><th>Category</th>
              <th>Stock</th><th>Threshold</th><th>Price</th><th>Cost</th>
              <th>Supplier</th><th>Status</th>
              {isOwner && <th>Actions</th>}
            </tr></thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td><span className="mono">{p.sku}</span></td>
                  <td style={{ fontWeight: 600, maxWidth: 200 }}>{p.product}</td>
                  <td><span className="badge badge-neutral">{p.category || '—'}</span></td>
                  <td style={{ fontWeight: 700, color: p.status === 'critical' ? 'var(--danger)' : p.status === 'low' ? 'var(--warning)' : 'var(--success)' }}>{p.stock}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{p.reorder_threshold}</td>
                  <td>₹{Number(p.price).toLocaleString('en-IN')}</td>
                  <td style={{ color: 'var(--text-muted)' }}>₹{Number(p.cost_price || 0).toLocaleString('en-IN')}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.supplier_name || '—'}</td>
                  <td>{statusBadge(p.status)}</td>
                  {isOwner && (
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => setModal(p)}>✏️</button>
                        <button className="btn btn-outline btn-sm" onClick={() => handleReorder(p)} title="Reorder 50 units">🔄</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)} disabled={deleting === p.id}>🗑</button>
                      </div>
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
