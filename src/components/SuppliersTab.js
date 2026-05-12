import React, { useState, useEffect } from 'react';

export default function SuppliersTab({ apiFetch, T }) {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', category: '', city: '', phone: '' });
  const [aiReview, setAiReview] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await apiFetch('/api/suppliers');
      const data = await res.json();
      setSuppliers(data);
    } catch (err) { console.error(err); }
  };

  const saveSupplier = async (e) => {
    e.preventDefault();
    await apiFetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setForm({ name: '', email: '', category: '', city: '', phone: '' });
    fetchSuppliers();
  };

  const getAIReview = async () => {
    setLoading(true);
    const prompt = `You are a procurement AI. Based on REAL supplier performance from MySQL:
${suppliers.map(s => `- ${s.name}: Reliability ${s.reliability_score}, Quality ${s.quality_score}/10, Defect Rate ${s.defect_rate}%`).join('\n')}
Give 3-4 specific actionable procurement strategy recommendations. Plain text, max 100 words.`;
    
    try {
      const res = await apiFetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      setAiReview(data.result);
    } catch (err) { setAiReview("AI Analysis currently unavailable."); }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
      <div style={{ background: T.panel, padding: '24px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Supplier Performance Scorecards</h3>
          <span style={{ fontSize: 10, background: T.success+'22', color: T.success, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>LIVE MYSQL</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}`, textAlign: 'left', fontSize: 11, color: T.muted }}>
              <th style={{ padding: 10 }}>Supplier</th>
              <th style={{ padding: 10 }}>Reliability</th>
              <th style={{ padding: 10 }}>Quality</th>
              <th style={{ padding: 10 }}>Defect Rate</th>
              <th style={{ padding: 10 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map(s => (
              <tr key={s.id} style={{ borderBottom: `1px solid ${T.dimmed}`, fontSize: 13 }}>
                <td style={{ padding: 12 }}>
                  <div style={{ fontWeight: 600 }}>{s.name}</div>
                  <div style={{ fontSize: 10, color: T.muted }}>{s.category} · {s.city}</div>
                </td>
                <td style={{ padding: 12 }}>
                  <div style={{ fontWeight: 700, color: s.reliability_score > 85 ? T.success : T.brandAlt }}>{s.reliability_score}%</div>
                  <div style={{ fontSize: 9, color: T.muted }}>{s.avg_delivery_days}d avg</div>
                </td>
                <td style={{ padding: 12 }}>{s.quality_score}/10 ★</td>
                <td style={{ padding: 12, color: s.defect_rate > 2 ? T.danger : T.text }}>{s.defect_rate}%</td>
                <td style={{ padding: 12 }}>
                   <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: s.reliability_score > 80 ? T.success+'15' : T.danger+'15', color: s.reliability_score > 80 ? T.success : T.danger }}>
                     {s.reliability_score > 80 ? 'Verified' : 'Review Needed'}
                   </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <button 
          onClick={getAIReview} 
          disabled={loading || suppliers.length === 0} 
          style={{ marginTop: '25px', background: T.brand, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
        >
          {loading ? 'Analyzing...' : 'Analyze Procurement Strategy'}
        </button>
        {aiReview && (
          <div style={{ marginTop: '20px', padding: '20px', background: T.dimmed, borderRadius: '12px', fontSize: '12.5px', borderLeft: `4px solid ${T.brand}`, lineHeight: 1.6 }}>
            <strong>Strategic Review:</strong> <br/> {aiReview}
          </div>
        )}
      </div>

      <div style={{ background: T.panel, padding: '24px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Onboard Supplier</h3>
        <form onSubmit={saveSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: T.muted }}>SUPPLIER NAME</label>
            <input style={{ background: T.dimmed, border: `1px solid ${T.border}`, padding: 10, borderRadius: 8, color: T.text }} value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: T.muted }}>EMAIL</label>
            <input style={{ background: T.dimmed, border: `1px solid ${T.border}`, padding: 10, borderRadius: 8, color: T.text }} type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: T.muted }}>CATEGORY</label>
            <input style={{ background: T.dimmed, border: `1px solid ${T.border}`, padding: 10, borderRadius: 8, color: T.text }} value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: T.muted }}>CITY</label>
            <input style={{ background: T.dimmed, border: `1px solid ${T.border}`, padding: 10, borderRadius: 8, color: T.text }} value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
          </div>
          <button type="submit" style={{ background: T.brand, color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 700, marginTop: 10, cursor: 'pointer' }}>Add to System</button>
        </form>
      </div>
    </div>
  );
}
