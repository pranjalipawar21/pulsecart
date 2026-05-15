/**
 * PulseCart AI Reports Tab
 * Fetches real metrics from /api/ai/health-report (SQL-driven).
 * Falls back gracefully if backend or Gemini is unavailable.
 */
import React, { useState } from 'react';

export default function AIReportsTab({ apiFetch, T }) {
  const [report,  setReport]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const generate = async () => {
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const res  = await apiFetch('/api/ai/health-report');
      const data = await res.json();
      if (data.success && data.report) {
        setReport(data.report);
      } else {
        setError(data.error || 'Failed to generate report. Ensure MySQL is running.');
      }
    } catch (err) {
      setError(`Network error: ${err.message}. Is the backend server running on port 5001?`);
    }
    setLoading(false);
  };

  const scoreColor = report
    ? (report.healthScore >= 80 ? T.success : report.healthScore >= 60 ? T.brandAlt : T.danger)
    : T.muted;

  return (
    <div style={{ padding: '0', width: '100%', margin: '0' }}>
      <div style={{ background: T.panel, padding: '24px', borderRadius: '15px', border: `1px solid ${T.border}` }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 6 }}>AI Business Health Report</h2>
            <p style={{ color: T.muted, fontSize: 12 }}>
              Metrics sourced from MySQL · AI summary via Gemini 2.0 Flash
            </p>
            <span style={{
              fontSize: 10, background: T.success + '22', color: T.success,
              padding: '2px 8px', borderRadius: 10, fontWeight: 700,
            }}>SQL DRIVEN</span>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            style={{
              background: loading ? T.dimmed : T.brand, color: loading ? T.muted : '#fff',
              border: 'none', padding: '12px 24px', borderRadius: 10,
              cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13,
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Analyzing...' : 'Generate Live Report'}
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div style={{
            background: T.danger + '12', border: `1px solid ${T.danger}33`,
            borderRadius: 10, padding: '16px 20px', marginBottom: 20,
            fontSize: 13, color: T.danger,
          }}>
            Error: {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
            {[100, 60, 80].map((w, i) => (
              <div key={i} style={{
                height: 16, width: `${w}%`, background: T.dimmed,
                borderRadius: 8, animation: 'shimmer 1.4s infinite',
              }} />
            ))}
          </div>
        )}

        {/* Report output */}
        {report && !loading && (
          <div style={{ marginTop: 20, animation: 'fadeSlide 0.4s' }}>

            {/* Score + Status row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, marginBottom: 24 }}>
              <div style={{
                textAlign: 'center', padding: 24, background: T.dimmed,
                borderRadius: 14, border: `2px solid ${scoreColor}33`,
              }}>
                <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Health Score</div>
                <div style={{ fontSize: 52, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
                  {report.healthScore}
                </div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>/100</div>
                <span style={{
                  display: 'inline-block', marginTop: 10, fontSize: 11, padding: '3px 10px',
                  borderRadius: 20, background: `${scoreColor}18`, color: scoreColor, fontWeight: 700,
                }}>{report.status}</span>
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8 }}>Executive Summary</div>
                <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.7, marginBottom: 16 }}>
                  {report.summary}
                </p>
                <div style={{ fontSize: 10, color: T.muted, fontStyle: 'italic' }}>
                  Data Source: {report.dataSource} · Generated: {new Date(report.generatedAt).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Risks + Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div style={{ background: T.danger + '08', border: `1px solid ${T.danger}22`, borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.danger, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                  Risk Areas
                </div>
                {(report.riskAreas || []).length === 0
                  ? <div style={{ fontSize: 12, color: T.muted }}>No critical risks detected</div>
                  : (report.riskAreas || []).map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 12, color: T.text }}>
                      <span style={{ color: T.danger, flexShrink: 0, marginTop: 1 }}>•</span>
                      <span>{r}</span>
                    </div>
                  ))
                }
              </div>
              <div style={{ background: T.success + '08', border: `1px solid ${T.success}22`, borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.success, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                  ✓ Recommended Actions
                </div>
                {(report.recommendations || []).length === 0
                  ? <div style={{ fontSize: 12, color: T.muted }}>All metrics are healthy</div>
                  : (report.recommendations || []).map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 12, color: T.text }}>
                      <span style={{ color: T.success, flexShrink: 0, marginTop: 1 }}>→</span>
                      <span>{r}</span>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Metrics Used */}
            {report.metricsUsed && (
              <div style={{ background: T.dimmed, borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                  📊 Metrics Used (from MySQL)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {Object.entries(report.metricsUsed)
                    .filter(([k]) => k !== 'dataSource')
                    .map(([k, v]) => (
                      <div key={k} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>
                          {typeof v === 'number' && v > 1000
                            ? `₹${(v / 1e5).toFixed(1)}L`
                            : String(v)}
                        </div>
                        <div style={{ fontSize: 10, color: T.muted, marginTop: 3, textTransform: 'capitalize' }}>
                          {k.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!report && !loading && !error && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: T.muted }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 8 }}>
              Generate your AI Business Health Report
            </div>
            <div style={{ fontSize: 12, maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
              Analyzes real MySQL metrics: revenue, return rate, stock health, supplier risk, and price intelligence.
              Gemini AI summarizes the findings in plain English.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
