const router = require('express').Router();
const { getPool, isAvailable } = require('../db');
const { requireAuth, requireOwner } = require('../middleware/auth');

// GET /api/pricing/analysis
router.get('/analysis', requireAuth, requireOwner, async (req, res) => {
  if (!isAvailable()) {
    return res.json({ success: false, data: [], error: 'Database unavailable' });
  }
  
  try {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT 
        i.sku, 
        i.product as product_name, 
        i.price as our_price, 
        ph.mrp, 
        ph.platform,
        ph.current_price as market_price,
        ((ph.mrp - i.price) / ph.mrp * 100) as our_discount,
        CASE 
          WHEN i.price > ph.current_price THEN 'Overpriced'
          WHEN i.price < ph.current_price * 0.9 THEN 'Underpriced'
          ELSE 'Competitive'
        END as status
      FROM inventory i
      LEFT JOIN price_history ph ON i.id = ph.product_id
      ORDER BY status DESC
    `);
    
    const data = rows.map(r => ({
      ...r,
      suggested_action: r.status === 'Overpriced' ? 'Reduce price by 5%' : 
                        r.status === 'Underpriced' ? 'Maintain or slightly increase' : 'Monitor trends'
    }));
    
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, data: [], error: err.message });
  }
});

module.exports = router;
