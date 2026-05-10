const router = require('express').Router();
const { requireAuth, requireOwner } = require('../middleware/auth');

// ─── Static analytics data (anchored to Redseer India 2024 benchmarks) ────────
const KPI_DATA = {
  gmv:           83500000,
  netRevenue:    58450000,
  aov:           1847,
  convRate:      3.24,
  cartAbandRate: 71.4,
  returnRate:    8.6,
  ltv:           6840,
  invTurnover:   8.2,
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

// SKU-level sales trend (new endpoint — not in old frontend)
const SKU_TRENDS = [
  { sku: 'Redmi Note 13 Pro',        cat: 'Electronics',  last30: 1840, last60: 3420, trend: +12.4, revenue: 45979200 },
  { sku: 'Nike Air Max 270',         cat: 'Sports',       last30:  620, last60: 1180, trend:  +8.1, revenue:  7436900 },
  { sku: 'Mamaearth Ubtan FW',       cat: 'Health/Beauty',last30: 2900, last60: 5310, trend: +14.2, revenue:   867100 },
  { sku: 'ASUS VivoBook 15',         cat: 'Electronics',  last30:  340, last60:  670, trend:  +3.6, revenue: 14616600 },
  { sku: 'Libas Printed Kurti',      cat: 'Fashion',      last30: 3120, last60: 5840, trend: +18.1, revenue:  2804880 },
  { sku: 'boAt Airdopes 141',        cat: 'Electronics',  last30: 1980, last60: 3710, trend:  +9.7, revenue:  2572020 },
  { sku: 'Atomic Habits (Book)',     cat: 'Books',        last30: 1640, last60: 3010, trend:  +6.3, revenue:   654360 },
  { sku: 'Prestige Pressure Cooker', cat: 'Home/Kitchen', last30:  880, last60: 1620, trend:  -2.1, revenue:  2199120 },
];

// ─── GET /api/analytics/kpis ─────────────────────────────────────────────────
router.get('/kpis', requireAuth, requireOwner, (req, res) => {
  res.json(KPI_DATA);
});

// ─── GET /api/analytics/categories ───────────────────────────────────────────
router.get('/categories', requireAuth, requireOwner, (req, res) => {
  res.json(CATEGORY_DATA);
});

// ─── GET /api/analytics/channels ─────────────────────────────────────────────
router.get('/channels', requireAuth, requireOwner, (req, res) => {
  res.json(CHANNEL_DATA);
});

// ─── GET /api/analytics/sku-trends ───────────────────────────────────────────
router.get('/sku-trends', requireAuth, requireOwner, (req, res) => {
  res.json(SKU_TRENDS);
});

module.exports = router;
