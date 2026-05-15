import React, { useState } from 'react';

export default function SettingsTab({ T, setThemeName, themeName }) {
  const [toggles, setToggles] = useState({
    demandForecast: true,
    autoPO: true,
    anomalyDetection: true,
    repricing: true,
    returnClassifier: true,
    nlQuery: true,
  });

  const flipToggle = (key) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div style={{ padding: '0', width: '100%', margin: '0' }}>
      <div style={{ background: T.panel, padding: '10px 0', borderRadius: '15px' }}>
        <h3>System Settings</h3>
        
        <div style={{ marginTop: '30px' }}>
          <h4>Theme Configuration</h4>
          <div style={{ marginTop: '15px', display: 'flex', gap: '15px' }}>
            <button onClick={() => setThemeName("light")} style={{ background: themeName === "light" ? T.brand : T.dimmed, color: themeName === "light" ? "#fff" : T.text }}>Light Mode</button>
            <button onClick={() => setThemeName("dark")} style={{ background: themeName === "dark" ? T.brand : T.dimmed, color: themeName === "dark" ? "#fff" : T.text }}>Dark Mode</button>
          </div>
        </div>

        <div style={{ marginTop: '40px' }}>
          <h4>AI Feature Toggles</h4>
          <p style={{ fontSize: '12px', color: T.muted, marginBottom: '20px' }}>Enable or disable advanced intelligence modules.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {Object.entries(toggles).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${T.dimmed}` }}>
                <span style={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</span>
                <button 
                  onClick={() => flipToggle(key)}
                  style={{ 
                    width: '50px', 
                    height: '24px', 
                    borderRadius: '12px', 
                    background: val ? T.success : T.muted, 
                    border: 'none', 
                    position: 'relative', 
                    cursor: 'pointer',
                    transition: 'background 0.3s'
                  }}
                >
                  <div style={{ 
                    width: '18px', 
                    height: '18px', 
                    borderRadius: '50%', 
                    background: '#fff', 
                    position: 'absolute', 
                    top: '3px', 
                    left: val ? '29px' : '3px',
                    transition: 'left 0.3s'
                  }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '40px' }}>
          <h4>API Usage Tracker</h4>
          <div style={{ background: T.dimmed, padding: '15px', borderRadius: '8px', marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span>Claude API (Current Month)</span>
              <span>1.2k / 10k requests</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: T.border, borderRadius: '3px', marginTop: '8px' }}>
              <div style={{ width: '12%', height: '100%', background: T.brand, borderRadius: '3px' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
