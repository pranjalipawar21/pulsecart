import React, { useState, useEffect } from 'react';

export default function NotificationsTab({ apiFetch, T, setCount }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchNotifs();
  }, []);

  const fetchNotifs = async () => {
    const res = await apiFetch('/api/notifications');
    const data = await res.json();
    setItems(data);
    if (setCount) setCount(data.length);
  };

  const dismiss = async (id) => {
    await apiFetch(`/api/notifications/${id}/dismiss`, { method: 'PATCH' });
    setItems(prev => prev.filter(n => n.id !== id));
    if (setCount) setCount(prev => Math.max(0, prev - 1));
  };

  const getSeverityStyle = (sev) => {
    switch(sev) {
      case 'danger': return { borderLeft: `5px solid ${T.danger}`, background: `${T.danger}11` };
      case 'warning': return { borderLeft: `5px solid ${T.brandAlt}`, background: `${T.brandAlt}11` };
      case 'success': return { borderLeft: `5px solid ${T.success}`, background: `${T.success}11` };
      default: return { borderLeft: `5px solid ${T.info}`, background: `${T.info}11` };
    }
  };

  return (
    <div style={{ width: '100%', margin: '0' }}>
      <h3>Smart Notification Centre</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
        {items.length === 0 && <p style={{ color: T.muted }}>No active notifications.</p>}
        {items.map(n => (
          <div key={n.id} style={{ 
            ...getSeverityStyle(n.severity),
            padding: '15px 20px',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: T.panel,
            border: `1px solid ${T.border}`,
            animation: 'fadeSlide 0.3s'
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: T.text }}>{n.title}</div>
              <div style={{ fontSize: '12px', color: T.muted, marginTop: '4px' }}>{n.body}</div>
              <div style={{ fontSize: '10px', color: T.muted, marginTop: '8px', textTransform: 'uppercase' }}>{new Date(n.created_at).toLocaleTimeString()}</div>
            </div>
            <button onClick={() => dismiss(n.id)} style={{ padding: '5px 12px', fontSize: '11px', background: T.dimmed, border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Dismiss</button>
          </div>
        ))}
      </div>
    </div>
  );
}
