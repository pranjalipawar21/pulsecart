const router = require('express').Router();
const { requireAuth, requireOwner } = require('../middleware/auth');
const { getPool, isAvailable } = require('../db');

// ─── Fallback data (used if MySQL is unavailable) ─────────────────────────────
const KPI_FALLBACK = {
  gmv: 83500000, netRevenue: 58450000, aov: 1847,
  convRate: 3.24, cartAbandRate: 71.4, returnRate: 8.6,
  ltv: 6840, invTurnover: 8.2,
};

const CATEGORY_DATA = [
  { cat: 'Electronics',   revenue: 28400000, units: 4200, growth_wow:  3.2, margin: 14.8 },
  { cat: 'Fashion',       revenue: 21800000, units: 8100, growth_wow:  5.1, margin: 41.2 },
  { cat: 'Health/Beauty', revenue: 11600000, units: 5600, growth_wow:  7.4, margin: 38.6 },
  { cat: 'Home/Kitchen',  revenue: 10800000, units: 3800, growth_wow:  2.8, margin: 22.4 },
  { cat: 'Sports',        revenue:  6700000, units: 2900, growth_wow: -1.2, margin: 28.9 },
  { cat: 'Books',         revenue:  4200000, units: 1700, growth_wow:  1.9, margin: 32.1 },
];

const CHANNEL_DATA = [
  { ch: 'Organic Search', sessions: 184000, conv: 3.42, revenue: 28900000, cac:   0, roas: 99.9 },
  { ch: 'Paid Search',    sessions: 126000, conv: 3.18, revenue: 18200000, cac: 482, roas:  4.82 },
  { ch: 'Email',          sessions:  42000, conv: 4.76, revenue:  9080000, cac:  42, roas: 21.6  },
  { ch: 'App Push',       sessions:  28000, conv: 4.29, revenue:  5580000, cac:  28, roas: 19.9  },
  { ch: 'Social Media',   sessions:  98000, conv: 2.14, revenue: 12100000, cac: 318, roas:  3.81 },
  { ch: 'Affiliate',      sessions:  31000, conv: 2.84, revenue:  4200000, cac: 126, roas:  3.33 },
  { ch: 'Direct',         sessions:  63000, conv: 2.38, revenue:  6740000, cac:   0, roas: 99.9  },
];

// ─── GET /api/analytics/kpis ─────────────────────────────────────────────────
router.get('/kpis', requireAuth, requireOwner, async (req, res) => {
  if (isAvailable()) {
    try {
      const pool = getPool();
      const [rows] = await pool.execute('SELECT * FROM kpis ORDER BY id DESC LIMIT 1');
      if (rows.length > 0) {
        const k = rows[0];
        return res.json({
          gmv: Number(k.gmv), netRevenue: Number(k.net_revenue), aov: Number(k.aov),
          convRate: Number(k.conv_rate), cartAbandRate: Number(k.cart_aband_rate),
          returnRate: Number(k.return_rate), ltv: Number(k.ltv), invTurnover: Number(k.inv_turnover),
        });
      }
    } catch (err) {
      console.warn('KPIs MySQL error, using fallback:', err.message);
    }
  }
  res.json(KPI_FALLBACK);
});

// ─── GET /api/analytics/gmv-series ───────────────────────────────────────────
router.get('/gmv-series', requireAuth, requireOwner, async (req, res) => {
  if (isAvailable()) {
    try {
      const pool = getPool();
      const [rows] = await pool.execute('SELECT date_label AS date, gmv, orders_count AS orders FROM gmv_series ORDER BY id ASC');
      if (rows.length > 0) {
        return res.json(rows.map(r => ({ date: r.date, gmv: Number(r.gmv), orders: Number(r.orders) })));
      }
    } catch (err) {
      console.warn('GMV series MySQL error, using fallback:', err.message);
    }
  }
  res.json([]);
});

// ─── GET /api/analytics/categories ───────────────────────────────────────────
router.get('/categories', requireAuth, requireOwner, (req, res) => {
  res.json(CATEGORY_DATA);
});

// ─── GET /api/analytics/channels ─────────────────────────────────────────────
router.get('/channels', requireAuth, requireOwner, (req, res) => {
  res.json(CHANNEL_DATA);
});

module.exports = router;
