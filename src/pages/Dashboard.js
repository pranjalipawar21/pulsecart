import { useState, useEffect, useRef } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import api from '../services/api';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

const fmt = (n) => {
  n = Number(n) || 0;
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
};

function KPI({ label, value, sub, color, icon }) {
  return (
    <div className="kpi-card">
      <div className="kpi-accent" style={{ background: `linear-gradient(90deg,${color},${color}55)` }} />
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color }}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [charts, setCharts]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    Promise.all([api.getSummary(), api.getCharts(30)])
      .then(([s, c]) => { setSummary(s.data); setCharts(c.data); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="spin" style={{ fontSize: 32 }}>⟳</div>
        <p style={{ marginTop: 12 }}>Loading dashboard data…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="page-content">
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <p style={{ color: 'var(--danger)', fontWeight: 600 }}>{error}</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>Make sure the backend server is running on port 5000.</p>
      </div>
    </div>
  );

  const s = summary || {};
  const c = charts || {};
  const COLORS = ['#E8620A','#F59E0B','#059669','#0284C7','#8B5CF6','#EC4899'];

  const catChart = {
    labels: (c.categoryRevenue || []).map(r => r.category),
    datasets: [{ data: (c.categoryRevenue || []).map(r => Number(r.revenue)), backgroundColor: COLORS, borderWidth: 0 }],
  };

  const monthChart = {
    labels: (c.monthlyTrend || []).map(r => r.month),
    datasets: [{
      label: 'Revenue (₹)',
      data: (c.monthlyTrend || []).map(r => Number(r.revenue)),
      borderColor: '#E8620A', backgroundColor: 'rgba(232,98,10,.12)',
      borderWidth: 2, tension: .4, fill: true, pointRadius: 4,
    }],
  };

  const bestChart = {
    labels: (c.bestSellers || []).slice(0, 8).map(r => r.product.length > 18 ? r.product.slice(0, 18) + '…' : r.product),
    datasets: [{
      label: 'Units Sold',
      data: (c.bestSellers || []).slice(0, 8).map(r => Number(r.units_sold)),
      backgroundColor: '#E8620A', borderRadius: 6, borderSkipped: false,
    }],
  };

  const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(0,0,0,.06)' } } } };
  const donutOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12, padding: 12 } } }, cutout: '65%' };
  const lineOpts  = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(0,0,0,.06)' } } } };

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">📊 Dashboard</div>
          <div className="page-sub">Real-time data from MySQL</div>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
          Last updated: {new Date().toLocaleTimeString('en-IN')}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KPI label="Total Products"   value={s.total_products || 0}            sub="SKUs in catalog"   color="#E8620A" icon="📦" />
        <KPI label="Stock Value"      value={fmt(s.inventory_value)}            sub="quantity × price"  color="#0284C7" icon="💎" />
        <KPI label="Low Stock"        value={s.low_stock_count || 0}            sub={`${s.critical_count || 0} critical`} color="#DC2626" icon="⚠️" />
        <KPI label="Today's Revenue"  value={fmt(s.today_revenue)}              sub={`${s.today_transactions || 0} transactions`} color="#059669" icon="💰" />
        <KPI label="Monthly Revenue"  value={fmt(s.monthly_revenue)}            sub={`${s.monthly_units || 0} units sold`} color="#8B5CF6" icon="📈" />
        <KPI label="Pending Alerts"   value={s.pending_alerts || 0}             sub="Reorder needed"    color="#D97706" icon="🔔" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">📈 Monthly Revenue Trend</div>
          {(c.monthlyTrend || []).length === 0
            ? <div className="empty-state" style={{ padding: 30 }}><div className="empty-icon">📭</div><div className="empty-sub">No sales data yet</div></div>
            : <div className="chart-wrap" style={{ height: 220 }}><Line data={monthChart} options={lineOpts} /></div>
          }
        </div>
        <div className="card">
          <div className="card-title">🍕 Category Revenue</div>
          {(c.categoryRevenue || []).length === 0
            ? <div className="empty-state" style={{ padding: 30 }}><div className="empty-icon">📭</div><div className="empty-sub">No sales data yet</div></div>
            : <div className="chart-wrap" style={{ height: 220 }}><Doughnut data={catChart} options={donutOpts} /></div>
          }
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">🏆 Best-Selling Products (Last 30 days)</div>
        {(c.bestSellers || []).length === 0
          ? <div className="empty-state" style={{ padding: 30 }}><div className="empty-icon">📭</div><div className="empty-sub">No sales recorded yet. Create a sale to see data here.</div></div>
          : <div className="chart-wrap" style={{ height: 240 }}><Bar data={bestChart} options={chartOpts} /></div>
        }
      </div>

      {/* Low Stock Table */}
      {s.low_stock_count > 0 && (
        <div className="table-wrap">
          <div className="table-controls">
            <div className="table-controls-title">⚠️ Low Stock Products</div>
            <span className="badge badge-danger">{s.low_stock_count} items need attention</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th><th>Product</th><th>Category</th>
                <th>Current Stock</th><th>Threshold</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(c.lowPerformers || []).filter(p => p.current_stock !== undefined).slice(0, 6).map(p => (
                <tr key={p.sku}>
                  <td><span className="mono">{p.sku}</span></td>
                  <td style={{ fontWeight: 600 }}>{p.product}</td>
                  <td><span className="badge badge-neutral">{p.category || '—'}</span></td>
                  <td style={{ fontWeight: 700 }}>{p.current_stock}</td>
                  <td style={{ color: 'var(--text-muted)' }}>—</td>
                  <td><span className="badge badge-danger">LOW</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
