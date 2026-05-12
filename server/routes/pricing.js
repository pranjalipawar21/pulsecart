const router = require('express').Router();
const { getPool } = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /api/competitor-prices
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await getPool().execute('SELECT * FROM competitor_prices ORDER BY last_updated DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/competitor-prices/:sku
router.put('/:sku', requireAuth, async (req, res) => {
  const { amazon, flipkart, croma, reliance } = req.body;
  try {
    await getPool().execute(
      'UPDATE competitor_prices SET amazon=?, flipkart=?, croma=?, reliance=?, last_updated=NOW() WHERE sku=?',
      [amazon, flipkart, croma, reliance, req.params.sku]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
