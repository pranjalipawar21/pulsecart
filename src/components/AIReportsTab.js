import React, { useState } from 'react';

export default function AIReportsTab({ apiFetch, T }) {
  const [reportType, setReportType] = useState('weekly executive summary');
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const prompt = `You are PulseCart's retail analytics AI. Generate a ${reportType} for an Indian retail store.
Context: Revenue ₹18.4L (+12.3%), 1284 SKUs, 47 low stock, 118 out of stock.
Issues: boAt Rockerz stockout, Realme Watch defect returns (18%), Syska price undercut.
Suppliers: boAt 94/100, Anker 88/100, Realme 67/100.
Write a concise professional report with section headings. Plain text, max 300 words.`;
    
    const res = await apiFetch('/api/ai/query', {
      method: 'POST',
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    setReport(data.result);
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ background: T.panel, padding: '30px', borderRadius: '15px', border: `1px solid ${T.border}` }}>
        <h2>AI Report Generator</h2>
        <p style={{ color: T.muted, marginBottom: '25px' }}>Generate professional executive summaries using live store data.</p>
        
        <div style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
          <select value={reportType} onChange={e => setReportType(e.target.value)} style={{ flex: 1, padding: '10px' }}>
            <option value="weekly executive summary">Weekly Executive Summary</option>
            <option value="inventory health audit">Inventory Health Audit</option>
            <option value="supplier performance review">Supplier Performance Review</option>
            <option value="competitor pricing strategy">Competitor Pricing Strategy</option>
          </select>
          <button onClick={generate} disabled={loading} style={{ padding: '10px 25px', background: T.brand, color: '#fff', border: 'none', borderRadius: '8px' }}>
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>

        {report && (
          <div style={{ 
            background: T.bg, 
            padding: '40px', 
            borderRadius: '12px', 
            whiteSpace: 'pre-wrap', 
            fontFamily: 'serif', 
            fontSize: '15px', 
            lineHeight: '1.6', 
            color: T.text,
            boxShadow: `0 4px 20px ${T.shadow}`,
            border: `1px solid ${T.border}`
          }}>
            {report}
          </div>
        )}
      </div>
    </div>
  );
}
