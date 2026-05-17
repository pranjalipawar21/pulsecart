import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AnalyticsTab({ T, apiFetch }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Analytics State
  const [skuTrends, setSkuTrends] = useState([]);
  const [categories, setCategories] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [movements, setMovements] = useState([]);
  const [days, setDays] = useState(30);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError('');
    try {
      const [trendsRes, catRes, lsRes, mvRes] = await Promise.all([
        apiFetch(`/api/analytics/sku-trends?days=${days}`),
        apiFetch('/api/analytics/categories'),
        apiFetch('/api/analytics/low-stock'),
        apiFetch(`/api/analytics/movements?limit=15`),
      ]);

      if (!trendsRes.ok || !catRes.ok || !lsRes.ok || !mvRes.ok) {
        throw new Error('Failed to retrieve analytics data from backend.');
      }

      const trendsData = await trendsRes.json();
      const catData = await catRes.json();
      const lsData = await lsRes.json();
      const mvData = await mvRes.json();

      if (trendsData.success) setSkuTrends(trendsData.data || []);
      if (catData.success) setCategories(catData.data || []);
      if (lsData.success) setLowStock(lsData.data || []);
      if (mvData.success) setMovements(mvData.data || []);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Error communicating with full-stack analytics engine.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: T.muted }}>
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>📊</div>
        <div>Querying SQL databases & aggregating SKU performance metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', background: `${T.danger}12`, border: `1px solid ${T.danger}33`, borderRadius: '12px', color: T.danger }}>
        <h4>Analytics Engine Unreachable</h4>
        <p style={{ marginTop: '8px', fontSize: '13px' }}>{error}</p>
        <button onClick={fetchAnalyticsData} style={{ marginTop: '14px', background: T.brand, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>Retry Connection</button>
      </div>
    );
  }

  // ─── Chart 1: Category Performance Bar Chart ───────────────────────────
  const barChartData = {
    labels: categories.map(c => c.category),
    datasets: [
      {
        label: 'Inventory Value (₹)',
        data: categories.map(c => Number(c.total_value || 0)),
        backgroundColor: `${T.brand}CC`,
        borderColor: T.brand,
        borderWidth: 1,
        borderRadius: 4,
        yAxisID: 'y',
      },
      {
        label: 'Stock Quantity (Units)',
        data: categories.map(c => Number(c.total_units || 0)),
        backgroundColor: `${T.info}CC`,
        borderColor: T.info,
        borderWidth: 1,
        borderRadius: 4,
        yAxisID: 'y1',
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: T.text, font: { family: "'IBM Plex Sans', sans-serif", size: 11, weight: 600 } },
      },
      tooltip: {
        titleFont: { family: "'IBM Plex Sans', sans-serif" },
        bodyFont: { family: "'IBM Plex Sans', sans-serif" },
      }
    },
    scales: {
      x: {
        grid: { color: `${T.border}33` },
        ticks: { color: T.muted, font: { family: "'IBM Plex Sans', sans-serif", size: 10 } }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: { color: `${T.border}33` },
        ticks: { 
          color: T.muted, 
          font: { family: "'IBM Plex Sans', sans-serif", size: 10 },
          callback: (value) => '₹' + value.toLocaleString('en-IN')
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: { 
          color: T.muted, 
          font: { family: "'IBM Plex Sans', sans-serif", size: 10 },
          callback: (value) => value + ' units'
        }
      }
    }
  };

  // ─── Chart 2: SKU Trend Line Chart ─────────────────────────────────────
  // Transform DB rows to a nice day-by-day accumulation or timeline of changes.
  const dateLabels = Array.from(new Set(skuTrends.map(t => {
    if (!t.date) return '';
    const dateObj = new Date(t.date);
    return dateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  }))).filter(Boolean).sort();

  // Find unique SKUs
  const skus = Array.from(new Set(skuTrends.map(t => t.sku)));
  const colors = [T.brand, T.info, T.success, T.brandAlt, T.danger];

  const lineChartDatasets = skus.slice(0, 5).map((sku, index) => {
    // Collect changes for each unique date
    const skuData = dateLabels.map(label => {
      const match = skuTrends.find(t => {
        if (!t.date) return false;
        const formattedDate = new Date(t.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        return t.sku === sku && formattedDate === label;
      });
      return match ? Number(match.net_change) : 0;
    });

    // Create a running cumulative total for a visual stock level line
    let currentTotal = 0;
    const cumulativeSkuData = skuData.map(val => {
      currentTotal += val;
      return currentTotal;
    });

    return {
      label: sku,
      data: cumulativeSkuData,
      borderColor: colors[index % colors.length],
      backgroundColor: `${colors[index % colors.length]}18`,
      borderWidth: 2,
      tension: 0.3,
      fill: true,
      pointRadius: 3,
      pointHoverRadius: 5,
    };
  });

  const lineChartData = {
    labels: dateLabels.length ? dateLabels : ['No movement'],
    datasets: lineChartDatasets.length ? lineChartDatasets : [
      {
        label: 'No SKU movement in database',
        data: [0],
        borderColor: T.muted,
      }
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: T.text, font: { family: "'IBM Plex Sans', sans-serif", size: 11, weight: 600 } },
      },
      tooltip: {
        titleFont: { family: "'IBM Plex Sans', sans-serif" },
        bodyFont: { family: "'IBM Plex Sans', sans-serif" },
      }
    },
    scales: {
      x: {
        grid: { color: `${T.border}33` },
        ticks: { color: T.muted, font: { family: "'IBM Plex Sans', sans-serif", size: 10 } }
      },
      y: {
        grid: { color: `${T.border}33` },
        ticks: { 
          color: T.muted, 
          font: { family: "'IBM Plex Sans', sans-serif", size: 10 },
          callback: (value) => value + ' units'
        }
      }
    }
  };

  return (
    <div style={{ animation: 'fadeSlide 0.3s ease both' }}>
      {/* Tab Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: T.text }}>Owner Intelligence & Analytics</h2>
          <p style={{ fontSize: '12px', color: T.muted, marginTop: '3px' }}>SKU-level trend logging & category financial valuations</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[7, 15, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                background: days === d ? T.brand : T.dimmed,
                color: days === d ? '#fff' : T.text,
                border: `1px solid ${T.border}`,
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* Visual Graphs Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* SKU Trend Line Chart */}
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '16px' }}>📈</span>
            <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.text }}>SKU Cumulative Stock Levels</h4>
          </div>
          <div style={{ height: '300px', position: 'relative' }}>
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>

        {/* Category Value & Units Bar Chart */}
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '16px' }}>📊</span>
            <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.text }}>Category Valuations vs. Volume</h4>
          </div>
          <div style={{ height: '300px', position: 'relative' }}>
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>
      </div>

      {/* Table Section: Low Stock & Audit Log */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
        {/* Left Side: Low Stock Table */}
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>⚠️</span>
              <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.text }}>Reorder & Low Stock Alerts</h4>
            </div>
            <span style={{ background: `${T.danger}18`, color: T.danger, padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>{lowStock.length} Low items</span>
          </div>
          
          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.dimmed, color: T.muted }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>SKU</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>Product</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>Current Stock</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>Threshold</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>Stock %</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: T.muted }}>No low stock alerts detected. All levels healthy.</td>
                  </tr>
                )}
                {lowStock.map(item => (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${T.dimmed}` }}>
                    <td style={{ padding: '10px 10px', fontFamily: 'monospace', color: T.brand, fontWeight: 500 }}>{item.sku}</td>
                    <td style={{ padding: '10px 10px', fontWeight: 600, color: T.text }}>{item.product}</td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: item.status === 'critical' ? T.danger : T.brandAlt }}>{item.stock} units</td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', color: T.muted }}>{item.reorder_threshold}</td>
                    <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '4px', background: T.border, borderRadius: '2px', width: '60px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(item.stock_pct, 100)}%`, background: item.status === 'critical' ? T.danger : T.brandAlt }} />
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '10px', color: T.text }}>{item.stock_pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Inventory Audit Log */}
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '16px' }}>📜</span>
            <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.text }}>Recent Audit Trail (Movements)</h4>
          </div>

          <div style={{ overflowY: 'auto', maxHeight: '350px', flex: 1 }}>
            {movements.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: T.muted }}>No recent stock movements recorded in the system logs.</div>
            )}
            {movements.map(mv => {
              const dateObj = new Date(mv.created_at);
              const fmtDate = dateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) + ' ' + dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
              const isPositive = Number(mv.change_amount) > 0;
              return (
                <div key={mv.id} style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: `1px solid ${T.dimmed}`, fontSize: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isPositive ? `${T.success}15` : `${T.danger}15`,
                    color: isPositive ? T.success : T.danger,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '11px',
                    flexShrink: 0
                  }}>
                    {isPositive ? '+' : ''}{mv.change_amount}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, color: T.text }}>{mv.product}</span>
                      <span style={{ fontSize: '10px', color: T.muted }}>{fmtDate}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: T.muted, marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>SKU: {mv.sku} · {mv.movement_type.toUpperCase()}</span>
                      <span style={{ color: T.brand, fontWeight: 500 }}>by {mv.performed_by || 'system'}</span>
                    </div>
                    {mv.notes && (
                      <div style={{ fontSize: '10px', color: T.muted, background: T.dimmed, padding: '4px 8px', borderRadius: '4px', marginTop: '4px', fontStyle: 'italic' }}>
                        "{mv.notes}"
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
