import { useState, useEffect, useCallback } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip
} from "recharts";

// ─── Sentiment badge ──────────────────────────────────────────────────────────
function Badge({ label, T }) {
  const cfg = {
    positive: { bg: `${T.success}18`, color: T.success, text: "Positive" },
    negative: { bg: `${T.danger}18`,  color: T.danger,  text: "Negative" },
    neutral:  { bg: `${T.muted}18`,   color: T.muted,   text: "Neutral"  },
  }[label] || { bg: `${T.muted}11`, color: T.muted, text: "Unknown" };
  
  return (
    <span style={{ background: cfg.bg, color: cfg.color, fontSize: 10, padding: "2px 9px", borderRadius: 20, fontWeight: 600, textTransform: 'uppercase' }}>
      {cfg.text}
    </span>
  );
}

export default function Sentiment({ T, apiFetch }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [liveResult, setLiveResult] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiFetch('/api/sentiment/stats');
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (err) {
      console.error("Stats fetch failed:", err);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleLiveAnalyze = async () => {
    if (!liveText.trim()) return;
    setLoading(true);
    try {
      const res = await apiFetch('/api/sentiment/live', {
        method: 'POST',
        body: JSON.stringify({ text: liveText })
      });
      const data = await res.json();
      if (data.success) setLiveResult(data.data);
      else alert(data.message);
    } catch (err) {
      alert("ML Service unavailable. Ensure python app.py is running.");
    }
    setLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiFetch('/api/sentiment/upload', {
        method: 'POST',
        body: formData,
        // FormData handles content-type automatically
        headers: {} 
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchStats();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert("Upload failed: " + err.message);
    }
    setUploading(false);
  };

  const pieData = stats ? [
    { name: 'Positive', value: stats.labels.positive || 0, color: T.success },
    { name: 'Neutral',  value: stats.labels.neutral  || 0, color: T.muted   },
    { name: 'Negative', value: stats.labels.negative || 0, color: T.danger  },
  ].filter(d => d.value > 0) : [];

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: '-0.02em' }}>Bulk Review Intelligence</h2>
          <p style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Neural Sentiment Analysis via Python FastAPI & VADER</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <label style={{ 
            background: T.brand, color: '#fff', padding: '10px 20px', borderRadius: 10, 
            cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s' 
          }}>
            {uploading ? 'Processing...' : '↑ Upload Review CSV'}
            <input type="file" hidden accept=".csv" onChange={handleFileUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Analyzed", value: stats?.total || 0, color: T.info },
          { label: "Positive Rate",  value: stats?.total ? `${Math.round(((stats.labels.positive || 0) / stats.total) * 100)}%` : '0%', color: T.success },
          { label: "Avg Sentiment",  value: stats?.avgScore?.toFixed(2) || '0.00', color: T.brandAlt },
          { label: "Negative Alerts", value: stats?.labels.negative || 0, color: T.danger },
        ].map(k => (
          <div key={k.label} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16, marginBottom: 24 }}>
        {/* Charts Section */}
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 4, height: 14, background: T.brand, borderRadius: 2 }}></span>
            Sentiment Distribution Matrix
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', height: 280 }}>
            <ResponsiveContainer width="50%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RTooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ width: '50%', paddingLeft: 20 }}>
              {pieData.map(d => (
                <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }}></div>
                    <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{d.name}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Analysis Section */}
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 20 }}>Live Neural Sandbox</h3>
          <textarea 
            value={liveText}
            onChange={(e) => setLiveText(e.target.value)}
            placeholder="Paste a customer review here for instant AI analysis..."
            style={{ 
              width: '100%', height: 110, padding: 16, borderRadius: 12, border: `1px solid ${T.border}`, 
              background: T.panelAlt, color: T.text, fontSize: 13, resize: 'none', marginBottom: 16, outline: 'none'
            }}
          />
          <button 
            onClick={handleLiveAnalyze}
            disabled={loading || !liveText.trim()}
            style={{ 
              width: '100%', background: T.brand, color: '#fff', border: 'none', padding: '12px', 
              borderRadius: 10, fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.2s'
            }}
          >
            {loading ? 'Analyzing Neural Patterns...' : 'Run Single-Pass Analysis'}
          </button>

          {liveResult && (
            <div style={{ marginTop: 20, padding: 16, background: T.dimmed, borderRadius: 12, border: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <Badge label={liveResult.label} T={T} />
                <span style={{ fontSize: 12, fontWeight: 700, color: T.info }}>{Math.round(liveResult.confidence * 100)}% Confidence</span>
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 8, textTransform: 'uppercase', fontWeight: 700 }}>Key Descriptors:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {liveResult.keywords.map(kw => (
                  <span key={kw} style={{ fontSize: 10, padding: '3px 8px', background: T.panel, border: `1px solid ${T.border}`, borderRadius: 6, color: T.text }}>{kw}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Reviews Table */}
      <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 20 }}>Historical Analysis Logs</h3>
        {!stats || stats.recent.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: T.muted }}>No reviews available for analysis.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}`, textAlign: 'left' }}>
                <th style={{ padding: '12px', fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>Product</th>
                <th style={{ padding: '12px', fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>Review Snippet</th>
                <th style={{ padding: '12px', fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>Sentiment</th>
                <th style={{ padding: '12px', fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>ML Score</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${T.dimmed}` }}>
                  <td style={{ padding: '14px 12px', fontSize: 13, fontWeight: 600, color: T.text }}>{r.product_name}</td>
                  <td style={{ padding: '14px 12px', fontSize: 12, color: T.muted, maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.review_text}</td>
                  <td style={{ padding: '14px 12px' }}><Badge label={r.label} T={T} /></td>
                  <td style={{ padding: '14px 12px', fontSize: 13, fontWeight: 700, color: r.score > 0 ? T.success : r.score < 0 ? T.danger : T.muted }}>
                    {r.score > 0 ? '+' : ''}{r.score.toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
