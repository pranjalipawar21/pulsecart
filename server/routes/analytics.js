const router = require('express').Router();
const { requireAuth, requireOwner } = require('../middleware/auth');
const { getPool, isAvailable } = require('../db');

// ─── GET /api/analytics/kpis ─────────────────────────────────────────────────
router.get('/kpis', requireAuth, requireOwner, async (req, res) => {
  if (!isAvailable()) return res.json({ error: "Database offline" });

  try {
    const pool = getPool();
    
    // 1. GMV & Orders
    const [orders] = await pool.execute("SELECT SUM(amount) as gmv, COUNT(*) as count FROM orders WHERE status != 'returned'");
    const gmv = Number(orders[0].gmv || 0);
    const orderCount = orders[0].count || 1;

    // 2. Returns
    const [returns] = await pool.execute("SELECT COUNT(*) as count FROM orders WHERE status = 'returned'");
    const returnRate = (returns[0].count / (orderCount + returns[0].count) * 100) || 0;

    // 3. Conversion Rate (Orders / Visits)
    const [visits] = await pool.execute("SELECT SUM(visit_count) as total FROM visits");
    const totalVisits = visits[0].total || 1;
    const convRate = (orderCount / totalVisits * 100) || 0;

    // 4. Inventory Turnover (COGS / Avg Inventory)
    // COGS = quantity * cost_price
    const [cogsRow] = await pool.execute(`
      SELECT SUM(oi.quantity * i.cost_price) as cogs 
      FROM order_items oi 
      JOIN inventory i ON oi.product_id = i.id
    `);
    const [invValueRow] = await pool.execute("SELECT SUM(stock * cost_price) as val FROM inventory");
    const cogs = Number(cogsRow[0].cogs || 0);
    const invValue = Number(invValueRow[0].val || 1);
    const invTurnover = (cogs / invValue) || 0;

    res.json({
      gmv,
      netRevenue: gmv * 0.7, // Simplified for demo
      aov: Math.round(gmv / orderCount),
      convRate: Number(convRate.toFixed(2)),
      cartAbandRate: 68.4, // Static placeholder
      returnRate: Number(returnRate.toFixed(2)),
      ltv: 8500, // Static placeholder
      invTurnover: Number(invTurnover.toFixed(1)),
      source: 'MySQL Live'
    });
  } catch (err) {
    console.error('Analytics Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/analytics/gmv-series ───────────────────────────────────────────
router.get('/gmv-series', requireAuth, requireOwner, async (req, res) => {
  if (!isAvailable()) return res.json([]);

  try {
    const pool = getPool();
    // Aggregate orders by day for the last 30 days
    const [rows] = await pool.execute(`
      SELECT DATE_FORMAT(created_at, '%b %d') as date, SUM(amount) as gmv, COUNT(*) as orders 
      FROM orders 
      GROUP BY date 
      ORDER BY MIN(created_at) ASC 
      LIMIT 30
    `);
    res.json(rows.map(r => ({ date: r.date, gmv: Number(r.gmv), orders: Number(r.orders) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Categories (Calculated from Orders) ───────────────────────────
router.get('/categories', requireAuth, requireOwner, async (req, res) => {
  if (!isAvailable()) return res.json([]);
  try {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT category as cat, SUM(amount) as revenue, COUNT(*) as units 
      FROM orders 
      GROUP BY category 
      ORDER BY revenue DESC
    `);
    res.json(rows);
  } catch (err) { res.json([]); }
});

// ─── Channels (Calculated from Orders) ───────────────────────────
router.get('/channels', requireAuth, requireOwner, async (req, res) => {
  if (!isAvailable()) return res.json([]);
  try {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT channel, SUM(amount) as revenue, COUNT(*) as orders 
      FROM orders 
      GROUP BY channel 
      ORDER BY revenue DESC
    `);
    res.json(rows);
  } catch (err) { res.json([]); }
});

// ─── Regions (Calculated from Orders) ───────────────────────────
router.get('/regions', requireAuth, requireOwner, async (req, res) => {
  if (!isAvailable()) return res.json([]);
  try {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT city as r, SUM(amount) as revenue, COUNT(*) as orders, AVG(amount) as aov, 5.2 as growth
      FROM orders 
      GROUP BY city 
      ORDER BY revenue DESC
    `);
    res.json(rows);
  } catch (err) { res.json([]); }
});

module.exports = router;
