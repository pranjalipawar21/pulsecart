import React, { useState, useEffect } from 'react';

export default function PriceIntelTab({ apiFetch, T }) {
  const [analysis, setAnalysis] = useState([]);
  const [selectedSku, setSelectedSku] = useState('');
  const [strategy, setStrategy] = useState('Maximise margin');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAnalysis();
  }, []);

  const fetchAnalysis = async () => {
    try {
      const res = await apiFetch('/api/pricing/analysis');
      const data = await res.json();
      setAnalysis(data);
      if (data.length > 0) setSelectedSku(data[0].sku);
    } catch (err) { console.error(err); }
  };

  const runRepricing = async () => {
    setLoading(true);
    const item = analysis.find(p => p.sku === selectedSku);
    const prompt = `Retail pricing AI for Indian store.
    Product: ${item.product_name}
    Our price: ₹${item.our_price}
    Market Reference: ₹${item.market_price} (${item.platform})
    MRP: ₹${item.mrp}
    Strategy: ${strategy}
    Suggest specific INR price. Respond ONLY with JSON: {"suggested_price": number, "rationale": "..."}`;
    
    try {
      const res = await apiFetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      // Handle the text response which might contain JSON
      const cleaned = data.result.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      setResult(`Suggested price: ₹${parsed.suggested_price.toLocaleString('en-IN')} — ${parsed.rationale}`);
    } catch (err) { setResult("AI Price Recommendation failed."); }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ background: T.panel, padding: '24px', borderRadius: '12px', border: `1px solid ${T.border}`, marginBottom: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Competitor Price Intelligence</h3>
          <span style={{ fontSize: 10, background: T.info+'22', color: T.info, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>MARKET TRACKER</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}`, textAlign: 'left', fontSize: 11, color: T.muted }}>
              <th style={{ padding: 10 }}>Product</th>
              <th style={{ padding: 10 }}>MRP</th>
              <th style={{ padding: 10 }}>Our Price</th>
              <th style={{ padding: 10 }}>Market Price</th>
              <th style={{ padding: 10 }}>Platform</th>
              <th style={{ padding: 10 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {analysis.map(p => (
              <tr key={p.sku} style={{ borderBottom: `1px solid ${T.dimmed}`, fontSize: 13 }}>
                <td style={{ padding: 12, fontWeight: 600 }}>{p.product_name}</td>
                <td style={{ padding: 12, color: T.muted }}>₹{p.mrp.toLocaleString('en-IN')}</td>
                <td style={{ padding: 12, fontWeight: 700 }}>₹{p.our_price.toLocaleString('en-IN')}</td>
                <td style={{ padding: 12 }}>₹{p.market_price.toLocaleString('en-IN')}</td>
                <td style={{ padding: 12, fontSize: 10, fontWeight: 700, color: T.brand }}>{p.platform}</td>
                <td style={{ padding: 12 }}>
                  <span style={{ 
                    fontSize: 10, padding: '2px 6px', borderRadius: 4, 
                    background: p.status === 'Competitive' ? T.success+'15' : T.danger+'15', 
                    color: p.status === 'Competitive' ? T.success : T.danger,
                    fontWeight: 600
                  }}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ background: T.panel, padding: '24px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 15 }}>AI Dynamic Repricing</h3>
        <p style={{ fontSize: 12, color: T.muted, marginBottom: 20 }}>Simulate price adjustments based on competitor movement and target margins.</p>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: T.muted }}>SELECT PRODUCT</label>
            <select value={selectedSku} onChange={e => setSelectedSku(e.target.value)} style={{ padding: 10, borderRadius: 8, background: T.dimmed, border: `1px solid ${T.border}`, color: T.text }}>
              {analysis.map(p => <option key={p.sku} value={p.sku}>{p.product_name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: T.muted }}>PRICING STRATEGY</label>
            <select value={strategy} onChange={e => setStrategy(e.target.value)} style={{ padding: 10, borderRadius: 8, background: T.dimmed, border: `1px solid ${T.border}`, color: T.text }}>
              <option>Maximise margin</option>
              <option>Aggressive volume</option>
              <option>Follow market leader</option>
            </select>
          </div>
          <button 
            onClick={runRepricing} 
            disabled={loading || analysis.length === 0}
            style={{ 
              background: T.brand, color: '#fff', border: 'none', padding: '12px 20px', 
              borderRadius: 8, cursor: 'pointer', fontWeight: 600 
            }}
          >
            {loading ? 'Analyzing...' : 'Generate Recommendation'}
          </button>
        </div>
        {result && (
          <div style={{ 
            marginTop: '25px', padding: '20px', background: T.dimmed, borderRadius: '12px', 
            borderLeft: `4px solid ${T.brand}`, fontSize: '13px', lineHeight: 1.6 
          }}>
            {result}
          </div>
        )}
      </div>
    </div>
  );
}
