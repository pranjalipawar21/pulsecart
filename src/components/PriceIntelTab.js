import React, { useState, useEffect } from 'react';

export default function PriceIntelTab({ apiFetch, T }) {
  const [analysis, setAnalysis] = useState([]);
  const [selectedSku, setSelectedSku] = useState('');
  const [strategy, setStrategy] = useState('Maximise margin');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchAnalysis();
  }, []);

  const fetchAnalysis = async () => {
    setFetching(true);
    try {
      const res = await apiFetch('/api/pricing/analysis');
      const result = await res.json();
      const list = Array.isArray(result) ? result : result.data || [];
      setAnalysis(list);
      if (list.length > 0) setSelectedSku(list[0].sku);
    } catch (err) { 
      console.error(err);
      setAnalysis([]);
    }
    setFetching(false);
  };

  const analysisList = Array.isArray(analysis) ? analysis : [];

  const runRepricing = async () => {
    setLoading(true);
    const item = analysisList.find(p => p.sku === selectedSku);
    if (!item) {
        setResult("Select a valid product first.");
        setLoading(false);
        return;
    }
    
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
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Market Price Intelligence</h3>
          <span style={{ fontSize: 10, background: T.info+'22', color: T.info, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>SQL DRIVEN</span>
        </div>

        {fetching ? (
          <div style={{ padding: 40, textAlign: 'center', color: T.muted }}>Loading market analysis...</div>
        ) : (
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
              {analysisList.length === 0 && (
                <tr><td colSpan="6" style={{ padding: 20, textAlign: 'center', color: T.muted }}>No pricing data available.</td></tr>
              )}
              {analysisList.map(p => (
                <tr key={p.sku} style={{ borderBottom: `1px solid ${T.dimmed}`, fontSize: 13 }}>
                  <td style={{ padding: 12, fontWeight: 600 }}>{p.product_name}</td>
                  <td style={{ padding: 12, color: T.muted }}>₹{(p.mrp || 0).toLocaleString('en-IN')}</td>
                  <td style={{ padding: 12, fontWeight: 700 }}>₹{(p.our_price || 0).toLocaleString('en-IN')}</td>
                  <td style={{ padding: 12 }}>₹{(p.market_price || 0).toLocaleString('en-IN')}</td>
                  <td style={{ padding: 12, fontSize: 10, fontWeight: 700, color: T.brand }}>{p.platform || 'General'}</td>
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
        )}
      </div>

      <div style={{ background: T.panel, padding: '24px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 15 }}>AI Dynamic Repricing</h3>
        <p style={{ fontSize: 12, color: T.muted, marginBottom: 20 }}>Generate intelligent price adjustments based on real competitor benchmarks.</p>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: T.muted }}>SELECT PRODUCT</label>
            <select value={selectedSku} onChange={e => setSelectedSku(e.target.value)} style={{ padding: 10, borderRadius: 8, background: T.dimmed, border: `1px solid ${T.border}`, color: T.text }}>
              <option value="">Select a product...</option>
              {analysisList.map(p => <option key={p.sku} value={p.sku}>{p.product_name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: T.muted }}>STRATEGY</label>
            <select value={strategy} onChange={e => setStrategy(e.target.value)} style={{ padding: 10, borderRadius: 8, background: T.dimmed, border: `1px solid ${T.border}`, color: T.text }}>
              <option>Maximise margin</option>
              <option>Aggressive volume</option>
              <option>Follow market leader</option>
            </select>
          </div>
          <button 
            onClick={runRepricing} 
            disabled={loading || analysisList.length === 0 || !selectedSku}
            style={{ 
              background: T.brand, color: '#fff', border: 'none', padding: '12px 20px', 
              borderRadius: 8, cursor: 'pointer', fontWeight: 600 
            }}
          >
            {loading ? 'Analyzing...' : 'Get Suggestion'}
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
