import React, { useState, useEffect } from 'react';

export default function SuppliersTab({ apiFetch, T }) {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', category: '', lead_days: 5, gst_number: '', payment_terms: 'Net-30' });
  const [aiReview, setAiReview] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    const res = await apiFetch('/api/suppliers');
    const data = await res.json();
    setSuppliers(data);
  };

  const saveSupplier = async (e) => {
    e.preventDefault();
    await apiFetch('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify(form)
    });
    setForm({ name: '', email: '', category: '', lead_days: 5, gst_number: '', payment_terms: 'Net-30' });
    fetchSuppliers();
  };

  const getAIReview = async () => {
    setLoading(true);
    const prompt = `You are a procurement AI. Based on supplier scores:
${suppliers.map(s => `- ${s.name}: ${s.overall_score}/100, ${s.on_time_pct}% on-time, ${s.quality_score}★`).join('\n')}
Give 3-4 specific actionable recommendations for the store owner. Plain text, max 100 words.`;
    
    const res = await apiFetch('/api/ai/query', {
      method: 'POST',
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    setAiReview(data.result);
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      <div style={{ background: T.panel, padding: '20px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
        <h3>Supplier Scorecards</h3>
        <table style={{ width: '100%', marginTop: '15px' }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Score</th>
              <th>Performance</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map(s => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.category}</td>
                <td><b style={{ color: s.overall_score > 80 ? T.success : T.brandAlt }}>{s.overall_score}</b></td>
                <td>{s.on_time_pct}% On-time</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <button onClick={getAIReview} disabled={loading} style={{ marginTop: '20px' }}>
          {loading ? 'Analyzing...' : 'Generate AI Procurement Review'}
        </button>
        {aiReview && (
          <div style={{ marginTop: '15px', padding: '15px', background: T.dimmed, borderRadius: '8px', fontSize: '12px' }}>
            <strong>AI Insights:</strong> {aiReview}
          </div>
        )}
      </div>

      <div style={{ background: T.panel, padding: '20px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
        <h3>Add New Supplier</h3>
        <form onSubmit={saveSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
          <input placeholder="Supplier Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          <input placeholder="Contact Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          <input placeholder="Category (e.g. Electronics)" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
          <input placeholder="Lead Days" type="number" value={form.lead_days} onChange={e => setForm({...form, lead_days: e.target.value})} />
          <input placeholder="GST Number" value={form.gst_number} onChange={e => setForm({...form, gst_number: e.target.value})} />
          <button type="submit" style={{ background: T.brand, color: '#fff', border: 'none', padding: '10px', borderRadius: '8px' }}>Save Supplier</button>
        </form>
      </div>
    </div>
  );
}
