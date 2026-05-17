import { useState } from 'react';
import api from '../services/api';

function ReportCard({ title, desc, icon, color, onDownload, id }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);

  const handle = async () => {
    setLoading(true);
    try { onDownload(); setDone(true); setTimeout(() => setDone(false), 2000); }
    catch (e) { alert('Download failed: ' + e.message); }
    setLoading(false);
  };

  return (
    <div className="card" style={{ borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ fontSize: 36 }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{title}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>{desc}</div>
          <button
            id={id}
            className="btn btn-brand"
            onClick={handle}
            disabled={loading}
            style={{ background: done ? 'var(--success)' : color }}
          >
            {loading ? '⟳ Preparing…' : done ? '✓ Downloaded!' : '⬇ Download CSV'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Reports() {
  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">📄 Reports & Exports</div>
          <div className="page-sub">Download CSV reports from live database data</div>
        </div>
      </div>

      <div style={{ background: 'var(--info-bg)', border: '1px solid rgba(2,132,199,.2)', borderRadius: 12, padding: '14px 20px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 20 }}>ℹ️</span>
        <div style={{ fontSize: 13, color: 'var(--info)' }}>
          All reports are generated in real-time from your MySQL database. CSV files open directly in Excel or Google Sheets.
        </div>
      </div>

      <div className="grid-3">
        <ReportCard
          id="download-inventory"
          title="Inventory Report"
          icon="📦"
          color="#E8620A"
          desc="Full product catalog with SKU, price, cost, stock levels, supplier, and profit margin for every item."
          onDownload={api.downloadInventory}
        />
        <ReportCard
          id="download-sales"
          title="Sales Report"
          icon="💰"
          color="#059669"
          desc="Complete sales history with product, quantity, revenue, staff name, and sale timestamps for the last 30 days."
          onDownload={api.downloadSales}
        />
        <ReportCard
          id="download-lowstock"
          title="Low Stock Report"
          icon="⚠️"
          color="#DC2626"
          desc="All products at or below their reorder threshold, with urgency level, supplier, and stock percentage."
          onDownload={api.downloadLowStock}
        />
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-title">📋 What's in each report?</div>
        <table className="data-table">
          <thead><tr><th>Report</th><th>Columns Included</th><th>Format</th></tr></thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 600 }}>Inventory</td>
              <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>SKU, Product Name, Category, Price, Cost Price, Stock, Threshold, Stock Value, Profit Margin, Supplier, Location, Status</td>
              <td><span className="badge badge-brand">CSV</span></td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600 }}>Sales</td>
              <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sale ID, SKU, Product Name, Category, Qty Sold, Selling Price, Total Amount, Staff, Sale Date, Notes</td>
              <td><span className="badge badge-success">CSV</span></td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600 }}>Low Stock</td>
              <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>SKU, Product Name, Category, Current Stock, Threshold, Stock %, Urgency, Supplier, Price, Location</td>
              <td><span className="badge badge-danger">CSV</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
