const router = require('express').Router();
const { getPool } = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /api/suppliers
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await getPool().execute('SELECT * FROM suppliers WHERE is_active = 1 ORDER BY overall_score DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/suppliers
router.post('/', requireAuth, async (req, res) => {
  const { name, email, category, lead_days, gst_number, payment_terms } = req.body;
  try {
    const [result] = await getPool().execute(
      'INSERT INTO suppliers (name, email, category, lead_days, gst_number, payment_terms) VALUES (?,?,?,?,?,?)',
      [name, email, category, lead_days || 5, gst_number, payment_terms || 'Net-30']
    );
    res.status(201).json({ id: result.insertId, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
