import React, { useState, useEffect } from 'react';

const CustomerManager = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [history, setHistory] = useState([]);
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const res = await fetch('/api/customers', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('pc_token')}` }
    });
    const data = await res.json();
    setCustomers(data);
  };

  const viewHistory = async (c) => {
    setSelectedCustomer(c);
    setSuggestion('');
    const res = await fetch(`/api/customers/${c.id}/history`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('pc_token')}` }
    });
    const data = await res.json();
    setHistory(data);
  };

  const getAiSuggestion = async () => {
    setLoading(true);
    const res = await fetch(`/api/customers/${selectedCustomer.id}/re-engage`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('pc_token')}` }
    });
    const data = await res.json();
    setSuggestion(data.suggestion);
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', display: 'flex', gap: '20px' }}>
      <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '15px', padding: '20px' }}>
        <h3>Buyer Profiles</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Segment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td><span className={`badge ${c.segment}`}>{c.segment}</span></td>
                <td><button onClick={() => viewHistory(c)}>View Details</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedCustomer && (
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '15px', padding: '20px' }}>
          <h3>Details: {selectedCustomer.name}</h3>
          <p>Email: {selectedCustomer.email}</p>
          <h4>Purchase History</h4>
          <ul>
            {history.map(o => (
              <li key={o.id}>{o.order_id} - ₹{o.amount} ({o.status})</li>
            ))}
          </ul>
          
          <button onClick={getAiSuggestion} disabled={loading}>
            {loading ? 'Thinking...' : 'Get AI Re-engagement Suggestion'}
          </button>
          
          {suggestion && (
            <div style={{ marginTop: '15px', padding: '15px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
              <strong>AI Advice:</strong>
              <p style={{ fontStyle: 'italic' }}>{suggestion}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerManager;
