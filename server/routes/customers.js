const router = require('express').Router();
const { requireAuth, requireOwner } = require('../middleware/auth');
const { isAvailable, getPool, FALLBACK } = require('../db');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── GET /api/customers ──────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    if (isAvailable()) {
      const [rows] = await getPool().execute('SELECT * FROM customers ORDER BY created_at DESC');
      res.json(rows);
    } else {
      res.json(FALLBACK.customers || []);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// ─── GET /api/customers/:id/history ──────────────────────────────────────────
router.get('/:id/history', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    if (isAvailable()) {
      const [rows] = await getPool().execute(
        'SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC',
        [id]
      );
      res.json(rows);
    } else {
      res.json([]);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ─── POST /api/customers/segmentation ────────────────────────────────────────
// Recalculates segments based on purchase history
router.post('/segmentation', requireAuth, requireOwner, async (req, res) => {
  if (!isAvailable()) return res.status(503).json({ error: 'Database unavailable' });

  try {
    // High-value: > 2 orders OR > ₹50,000 total spend
    await getPool().execute(`
      UPDATE customers c
      SET segment = CASE 
        WHEN (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) > 2 THEN 'high-value'
        WHEN (SELECT SUM(amount) FROM orders o WHERE o.customer_id = c.id) > 50000 THEN 'high-value'
        WHEN (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) > 0 THEN 'regular'
        ELSE 'one-time'
      END
    `);
    res.json({ message: 'Segmentation updated' });
  } catch (err) {
    res.status(500).json({ error: 'Segmentation failed' });
  }
});

// ─── POST /api/customers/:id/re-engage ───────────────────────────────────────
// AI-generated re-engagement suggestion
router.post('/:id/re-engage', requireAuth, requireOwner, async (req, res) => {
  const { id } = req.params;
  try {
    let customer = null;
    let history = [];

    if (isAvailable()) {
      const [cRows] = await getPool().execute('SELECT * FROM customers WHERE id = ?', [id]);
      customer = cRows[0];
      const [hRows] = await getPool().execute('SELECT * FROM orders WHERE customer_id = ?', [id]);
      history = hRows;
    }

    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const prompt = `Suggest a personalized re-engagement strategy for this customer:
    Name: ${customer.name}
    Segment: ${customer.segment}
    Purchase History: ${JSON.stringify(history)}
    
    Context: PulseCart (Indian E-commerce).
    Respond with a 2-sentence marketing strategy and a sample WhatsApp message.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    });

    res.json({ suggestion: response.content[0].text });
  } catch (err) {
    res.status(500).json({ error: 'Re-engagement failed' });
  }
});

module.exports = router;
