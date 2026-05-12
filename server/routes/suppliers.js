const router = require('express').Router();
const { getPool, isAvailable } = require('../db');
const { requireAuth, requireOwner } = require('../middleware/auth');

// GET /api/suppliers
router.get('/', requireAuth, async (req, res) => {
  if (!isAvailable()) return res.json([]);
  try {
    const [rows] = await getPool().execute(`
      SELECT *, 
      ((on_time_pct * 0.4) + (quality_score * 10) - (defect_rate * 5)) as calc_score 
      FROM suppliers 
      WHERE is_active = 1 
      ORDER BY calc_score DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/suppliers/performance
router.get('/performance', requireAuth, requireOwner, async (req, res) => {
  if (!isAvailable()) return res.json({ error: "DB Offline" });
  try {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT name, city, rating, reliability_score, defect_rate, avg_delivery_days
      FROM suppliers
      ORDER BY reliability_score DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/suppliers
router.post('/', requireAuth, requireOwner, async (req, res) => {
  const { name, email, phone, city, category } = req.body;
  try {
    const [result] = await getPool().execute(
      'INSERT INTO suppliers (name, contact_email, phone, city, category) VALUES (?,?,?,?,?)',
      [name, email, phone, city, category]
    );
    res.status(201).json({ id: result.insertId, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/suppliers/:id
router.delete('/:id', requireAuth, requireOwner, async (req, res) => {
  try {
    await getPool().execute('UPDATE suppliers SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
