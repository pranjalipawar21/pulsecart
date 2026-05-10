const router = require('express').Router();
const { isAvailable, getPool, FALLBACK } = require('../db');
const { requireAuth, requireOwner } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// ─── GET /api/inventory ───────────────────────────────────────────────────────
// Returns all SKUs sorted by stock level (critical first)
router.get('/', requireAuth, async (req, res) => {
  try {
    if (isAvailable()) {
      const [rows] = await getPool().execute(
        `SELECT id, sku, product, category, stock, reorder_threshold, turnover, price, status
         FROM inventory
         ORDER BY FIELD(status,'critical','low','healthy'), stock ASC`
      );
      return res.json(rows);
    }
    const sorted = [...FALLBACK.inventory].sort((a, b) => {
      const rank = { critical: 0, low: 1, healthy: 2 };
      return rank[a.status] - rank[b.status] || a.stock - b.stock;
    });
    res.json(sorted);
  } catch (err) {
    console.error('GET /inventory error:', err.message);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// ─── GET /api/inventory/alerts ────────────────────────────────────────────────
// Returns SKUs where stock < reorder_threshold (critical + low only)
router.get('/alerts', requireAuth, async (req, res) => {
  try {
    if (isAvailable()) {
      const [rows] = await getPool().execute(
        `SELECT id, sku, product, category, stock, reorder_threshold, status
         FROM inventory WHERE stock < reorder_threshold ORDER BY stock ASC`
      );
      return res.json(rows);
    }
    const alerts = FALLBACK.inventory.filter(i => i.stock < i.reorder_threshold);
    res.json(alerts);
  } catch (err) {
    console.error('GET /inventory/alerts error:', err.message);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// ─── PUT /api/inventory/:id/reorder ──────────────────────────────────────────
// Owner-only: triggers automated reorder for a SKU, logs the event
router.put('/:id/reorder', requireAuth, requireOwner, async (req, res) => {
  const { id }       = req.params;
  const { quantity = 100, note = '' } = req.body;

  try {
    if (isAvailable()) {
      const [item] = await getPool().execute(
        'SELECT id, product, stock FROM inventory WHERE id = ?', [id]
      );
      if (!item[0]) return res.status(404).json({ error: 'SKU not found' });

      // Bump stock & log the reorder
      await getPool().execute(
        'UPDATE inventory SET stock = stock + ? WHERE id = ?', [quantity, id]
      );
      await getPool().execute(
        'INSERT INTO reorder_log (inventory_id, triggered_by, quantity, note) VALUES (?,?,?,?)',
        [id, req.user.id, quantity, note]
      );
      const [updated] = await getPool().execute(
        'SELECT id, product, stock, status FROM inventory WHERE id = ?', [id]
      );
      return res.json({
        message: `Reorder triggered for ${item[0].product}`,
        sku:     updated[0],
        reorder: { quantity, triggered_by: req.user.username, at: new Date().toISOString() },
      });
    }

    // In-memory fallback
    const item = FALLBACK.inventory.find(i => i.id === parseInt(id));
    if (!item) return res.status(404).json({ error: 'SKU not found' });
    item.stock += quantity;
    item.status = item.stock < 20 ? 'critical' : item.stock < item.reorder_threshold ? 'low' : 'healthy';
    res.json({
      message: `Reorder triggered for ${item.product}`,
      sku:     item,
      reorder: { quantity, triggered_by: req.user.username, at: new Date().toISOString() },
    });
  } catch (err) {
    console.error('PUT /inventory/:id/reorder error:', err.message);
    res.status(500).json({ error: 'Reorder failed' });
  }
});

module.exports = router;
