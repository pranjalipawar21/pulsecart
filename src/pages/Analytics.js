import { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import api from '../services/api';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

const COLORS = ['#E8620A','#F59E0B','#059669','#0284C7','#8B5CF6','#EC4899','#14B8A6'];

const chartDefaults = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
const gridOpts = { x: { grid: { display: false } }, y: { grid: { color: 'rgba(128,128,128,.1)' } } };

export default function Analytics() {
  const [charts, setCharts]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [days, setDays]       = useState(30);

  useEffect(() => {
    setLoading(true);
    api.getCharts(days)
      .then(r => setCharts(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}><div style={{ textAlign: 'center', color: 'var(--text-muted)' }}><div className="spin" style={{ fontSize: 32 }}>⟳</div><p style={{ marginTop: 12 }}>Loading analytics…</p></div></div>;
  if (error)   return <div className="page-content"><div className="card" style={{ textAlign: 'center', padding: 40 }}><div style={{ fontSize: 36 }}>⚠️</div><p style={{ color: 'var(--danger)', marginTop: 12 }}>{error}</p></div></div>;

  const c = charts || {};

  const bestChart = {
    labels: (c.bestSellers||[]).map(r => r.product.length > 20 ? r.product.slice(0,20)+'…' : r.product),
    datasets: [{ label: 'Units Sold', data: (c.bestSellers||[]).map(r => Number(r.units_sold)), backgroundColor: COLORS[0], borderRadius: 6, borderSkipped: false }],
  };
  const revenueChart = {
    labels: (c.bestSellers||[]).map(r => r.product.length > 20 ? r.product.slice(0,20)+'…' : r.product),
    datasets: [{ label: 'Revenue (₹)', data: (c.bestSellers||[]).map(r => Number(r.revenue)), backgroundColor: COLORS[1], borderRadius: 6, borderSkipped: false }],
  };
  const catChart = {
    labels: (c.categoryRevenue||[]).map(r => r.category),
    datasets: [{ data: (c.categoryRevenue||[]).map(r => Number(r.revenue)), backgroundColor: COLORS, borderWidth: 0 }],
  };
  const monthChart = {
    labels: (c.monthlyTrend||[]).map(r => r.month),
    datasets: [{
      label: 'Monthly Revenue',
      data: (c.monthlyTrend||[]).map(r => Number(r.revenue)),
      borderColor: '#E8620A', backgroundColor: 'rgba(232,98,10,.12)',
      borderWidth: 2, tension: .4, fill: true, pointRadius: 5,
    }],
  };
  const profitChart = {
    labels: (c.profitByCategory||[]).map(r => r.category),
    datasets: [
      { label: 'Stock Value', data: (c.profitByCategory||[]).map(r => Number(r.stock_value)), backgroundColor: COLORS[3], borderRadius: 4, borderSkipped: false },
      { label: 'Est. Profit', data: (c.profitByCategory||[]).map(r => Number(r.estimated_profit)), backgroundColor: COLORS[2], borderRadius: 4, borderSkipped: false },
    ],
  };

  const noData = (arr) => !arr || arr.length === 0;
  const NoData = () => <div className="empty-state" style={{ padding: 30 }}><div className="empty-icon">📭</div><div className="empty-sub">No data available for this period.</div></div>;

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div><div className="page-title">📈 Analytics</div><div className="page-sub">Real SQL aggregations from sales & inventory</div></div>
        <select className="form-select" style={{ width: 150 }} value={days} onChange={e => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Best Sellers + Revenue */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">🏆 Best-Selling Products (Units)</div>
          {noData(c.bestSellers) ? <NoData /> : <div style={{ height: 240 }}><Bar data={bestChart} options={{ ...chartDefaults, scales: gridOpts }} /></div>}
        </div>
        <div className="card">
          <div className="card-title">💰 Top Products by Revenue</div>
          {noData(c.bestSellers) ? <NoData /> : <div style={{ height: 240 }}><Bar data={revenueChart} options={{ ...chartDefaults, scales: gridOpts }} /></div>}
        </div>
      </div>

      {/* Monthly Trend + Category Revenue */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">📅 Monthly Revenue Trend</div>
          {noData(c.monthlyTrend) ? <NoData /> : <div style={{ height: 240 }}><Line data={monthChart} options={{ ...chartDefaults, plugins: { legend: { display: false } }, scales: gridOpts }} /></div>}
        </div>
        <div className="card">
          <div className="card-title">🍕 Category Revenue Split</div>
          {noData(c.categoryRevenue) ? <NoData /> : (
            <div style={{ height: 240 }}>
              <Doughnut data={catChart} options={{ ...chartDefaults, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12, padding: 10 } } }, cutout: '60%' }} />
            </div>
          )}
        </div>
      </div>

      {/* Profit Estimate */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">💹 Profit Estimate by Category (price − cost_price) × stock</div>
        {noData(c.profitByCategory) ? <NoData /> : (
          <div style={{ height: 240 }}>
            <Bar data={profitChart} options={{ ...chartDefaults, plugins: { legend: { display: true, position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } } }, scales: gridOpts }} />
          </div>
        )}
      </div>

      {/* Low Performers Table */}
      <div className="table-wrap">
        <div className="table-controls"><div className="table-controls-title">📉 Low-Performing Products (Last {days} days)</div></div>
        {noData(c.lowPerformers) ? <div className="empty-state"><NoData /></div> : (
          <table className="data-table">
            <thead><tr><th>Product</th><th>SKU</th><th>Units Sold</th><th>Current Stock</th><th>Status</th></tr></thead>
            <tbody>
              {(c.lowPerformers||[]).map(p => (
                <tr key={p.sku}>
                  <td style={{ fontWeight: 600 }}>{p.product}</td>
                  <td><span className="mono">{p.sku}</span></td>
                  <td style={{ fontWeight: 700, color: Number(p.units_sold) === 0 ? 'var(--danger)' : 'var(--text)' }}>{p.units_sold}</td>
                  <td>{p.current_stock}</td>
                  <td>{Number(p.units_sold) === 0 ? <span className="badge badge-danger">NO SALES</span> : <span className="badge badge-warning">LOW</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
