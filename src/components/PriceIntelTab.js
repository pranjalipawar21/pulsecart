import React, { useState, useEffect } from 'react';

export default function PriceIntelTab({ apiFetch, T }) {
  const [prices, setPrices] = useState([]);
  const [selectedSku, setSelectedSku] = useState('');
  const [strategy, setStrategy] = useState('Maximise margin');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    const res = await apiFetch('/api/pricing');
    const data = await res.json();
    setPrices(data);
    if (data.length > 0) setSelectedSku(data[0].sku);
  };

  const runRepricing = async () => {
    setLoading(true);
    const product = prices.find(p => p.sku === selectedSku);
    const prompt = `Retail pricing AI for Indian store.
Product: ${product.product_name}
Our price: ₹${product.our_price}
Amazon: ₹${product.amazon}, Flipkart: ₹${product.flipkart}, Croma: ₹${product.croma}
Strategy: ${strategy}, Margin target: 25-30%
Suggest specific INR price. Format: "Suggested price: ₹X,XXX — [2 sentence rationale]". Plain text only.`;
    
    const res = await apiFetch('/api/ai/query', {
      method: 'POST',
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    setResult(data.result);
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ background: T.panel, padding: '20px', borderRadius: '12px', border: `1px solid ${T.border}`, marginBottom: '20px' }}>
        <h3>Market Price Intelligence</h3>
        <table style={{ width: '100%', marginTop: '15px' }}>
          <thead>
            <tr>
              <th>Product</th>
              <th>Our Price</th>
              <th>Amazon</th>
              <th>Flipkart</th>
              <th>Croma</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {prices.map(p => {
              const lowestComp = Math.min(p.amazon || 999999, p.flipkart || 999999, p.croma || 999999);
              const isUndercut = p.our_price > lowestComp;
              return (
                <tr key={p.sku}>
                  <td>{p.product_name}</td>
                  <td><b>₹{p.our_price}</b></td>
                  <td>₹{p.amazon}</td>
                  <td>₹{p.flipkart}</td>
                  <td>₹{p.croma}</td>
                  <td>
                    <span style={{ color: isUndercut ? T.danger : T.success, fontWeight: 600 }}>
                      {isUndercut ? '⚠ Undercut' : '✓ Competitive'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ background: T.panel, padding: '20px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
        <h3>AI Repricing Engine</h3>
        <div style={{ display: 'flex', gap: '20px', marginTop: '15px' }}>
          <select value={selectedSku} onChange={e => setSelectedSku(e.target.value)}>
            {prices.map(p => <option key={p.sku} value={p.sku}>{p.product_name}</option>)}
          </select>
          <select value={strategy} onChange={e => setStrategy(e.target.value)}>
            <option>Maximise margin</option>
            <option>Aggressive volume</option>
            <option>Follow market leader</option>
          </select>
          <button onClick={runRepricing} disabled={loading}>{loading ? 'Thinking...' : 'Generate AI Price Recommendation'}</button>
        </div>
        {result && (
          <div style={{ marginTop: '20px', padding: '15px', background: T.dimmed, borderRadius: '8px', borderLeft: `4px solid ${T.brand}` }}>
            {result}
          </div>
        )}
      </div>
    </div>
  );
}
