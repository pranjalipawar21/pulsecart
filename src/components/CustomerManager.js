import React, { useState, useEffect } from 'react';

const CustomerManager = ({ T, apiFetch }) => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [history, setHistory] = useState([]);
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await apiFetch('/api/customers');
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error(err);
      setCustomers([]);
    }
  };

  const viewHistory = async (c) => {
    setSelectedCustomer(c);
    setSuggestion('');
    try {
      const res = await apiFetch(`/api/customers/${c.id}/history`);
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      setHistory([]);
    }
  };

  const getAiSuggestion = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/customers/${selectedCustomer.id}/re-engage`, {
        method: 'POST'
      });
      const data = await res.json();
      setSuggestion(data.suggestion);
    } catch (err) {
      setSuggestion('Failed to get suggestion.');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '0', display: 'flex', gap: '20px' }}>
      <div style={{ flex: 1, background: T.panel, border: `1px solid ${T.border}`, borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Buyer Profiles</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}`, textAlign: 'left', fontSize: 11, color: T.muted }}>
              <th style={{ padding: 10 }}>Name</th>
              <th style={{ padding: 10 }}>Segment</th>
              <th style={{ padding: 10 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr><td colSpan="3" style={{ padding: 20, textAlign: 'center', color: T.muted }}>No customers found.</td></tr>
            )}
            {customers.map(c => (
              <tr key={c.id} style={{ borderBottom: `1px solid ${T.dimmed}`, fontSize: 13 }}>
                <td style={{ padding: 12, fontWeight: 600 }}>{c.name}</td>
                <td style={{ padding: 12 }}>
                  <span style={{ 
                    fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                    background: c.segment === 'high-value' ? `${T.success}18` : c.segment === 'regular' ? `${T.info}18` : `${T.muted}18`,
                    color:      c.segment === 'high-value' ? T.success      : c.segment === 'regular' ? T.info       : T.muted,
                  }}>{c.segment}</span>
                </td>
                <td style={{ padding: 12 }}>
                  <button onClick={() => viewHistory(c)} style={{ background: 'none', border: `1px solid ${T.border}`, color: T.text, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>View Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedCustomer && (
        <div style={{ flex: 1, background: T.panel, border: `1px solid ${T.border}`, borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Details: {selectedCustomer.name}</h3>
          <p style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>Email: {selectedCustomer.email}</p>
          
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Purchase History</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {history.length === 0 && <div style={{ fontSize: 12, color: T.muted }}>No history found.</div>}
            {history.map(o => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: T.dimmed, borderRadius: 8, fontSize: 12 }}>
                <span style={{ fontFamily: 'monospace', color: T.brand }}>{o.order_id}</span>
                <span style={{ fontWeight: 600 }}>₹{Number(o.amount).toLocaleString('en-IN')}</span>
                <span style={{ fontSize: 10, opacity: 0.7 }}>{o.status}</span>
              </div>
            ))}
          </div>
          
          <button 
            onClick={getAiSuggestion} 
            disabled={loading}
            style={{ width: '100%', background: T.brand, color: '#fff', border: 'none', padding: '12px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}
          >
            {loading ? 'Analyzing...' : 'Get AI Re-engagement Suggestion'}
          </button>
          
          {suggestion && (
            <div style={{ marginTop: '20px', padding: '20px', background: T.dimmed, borderRadius: '12px', borderLeft: `4px solid ${T.brand}`, fontSize: 13, lineHeight: 1.6 }}>
              <strong>AI Advice:</strong>
              <p style={{ marginTop: 8 }}>{suggestion}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerManager;
