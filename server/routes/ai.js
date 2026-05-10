const router = require('express').Router();
const { requireAuth, requireOwner } = require('../middleware/auth');
const { isAvailable, getPool, FALLBACK } = require('../db');

// ─── POST /api/ai/demand-forecast ────────────────────────────────────────────
// Uses Gemini to predict next-week reorder quantities based on sales velocity
router.post('/demand-forecast', requireAuth, requireOwner, async (req, res) => {
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    return res.status(503).json({ error: 'Add GEMINI_API_KEY to server/.env' });
  }

  // Get inventory data
  let inventory = [];
  if (isAvailable()) {
    const [rows] = await getPool().execute(
      'SELECT product, category, stock, reorder_threshold, turnover, price FROM inventory ORDER BY stock ASC'
    );
    inventory = rows;
  } else {
    inventory = FALLBACK.inventory.map(i => ({
      product: i.product, category: i.category, stock: i.stock,
      reorder_threshold: i.reorder_threshold, turnover: i.turnover, price: i.price,
    }));
  }

  const prompt = `You are a demand planning AI for an Indian e-commerce platform (PulseCart).

Here is the current inventory data:
${JSON.stringify(inventory, null, 2)}

Turnover = annual inventory turns. Higher turnover means faster selling.

Analyse each SKU and respond ONLY with valid JSON (no markdown):
{
  "forecasts": [
    {
      "product": "<product name>",
      "currentStock": <current stock>,
      "weeklyVelocity": <estimated units sold per week based on turnover and stock>,
      "daysOfStock": <estimated days until stockout>,
      "reorderQty": <recommended reorder quantity for next 4 weeks>,
      "urgency": "critical"|"high"|"medium"|"low",
      "rationale": "<one sentence explanation>"
    }
  ],
  "summary": "<2 sentence overall summary>",
  "topPriority": "<which SKU needs immediate attention and why>"
}

Use realistic Indian retail demand patterns. Factor in category seasonality.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1500, temperature: 0.2 },
        }),
      }
    );
    if (!response.ok) throw new Error(`Gemini API ${response.status}`);
    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('').trim() || '{}';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(cleaned));
  } catch (err) {
    console.error('Demand forecast error:', err.message);
    res.status(500).json({ error: 'Demand forecast failed', detail: err.message });
  }
});

// ─── POST /api/ai/natural-query ──────────────────────────────────────────────
// Natural language inventory queries — "show me everything under ₹500 with low stock"
router.post('/natural-query', requireAuth, async (req, res) => {
  const { query } = req.body;
  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    return res.status(503).json({ error: 'Add GEMINI_API_KEY to server/.env' });
  }

  let inventory = [];
  if (isAvailable()) {
    const [rows] = await getPool().execute(
      'SELECT id, sku, product, category, stock, reorder_threshold, turnover, price, status FROM inventory'
    );
    inventory = rows;
  } else {
    inventory = FALLBACK.inventory;
  }

  const prompt = `You are an inventory query assistant for PulseCart (Indian e-commerce).

Current inventory:
${JSON.stringify(inventory, null, 2)}

User query: "${query}"

Respond ONLY with valid JSON (no markdown):
{
  "interpretation": "<what the user is asking for in plain English>",
  "matchingProducts": [
    {
      "product": "<name>",
      "sku": "<sku>",
      "stock": <stock>,
      "price": <price>,
      "status": "<status>",
      "reason": "<why this matches the query>"
    }
  ],
  "count": <number of matching products>,
  "suggestion": "<helpful follow-up suggestion based on the results>"
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1000, temperature: 0.1 },
        }),
      }
    );
    if (!response.ok) throw new Error(`Gemini API ${response.status}`);
    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('').trim() || '{}';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(cleaned));
  } catch (err) {
    console.error('Natural query error:', err.message);
    res.status(500).json({ error: 'Query failed', detail: err.message });
  }
});

// ─── POST /api/ai/anomaly-explain ────────────────────────────────────────────
// Explains detected GMV anomalies with contextual reasoning
router.post('/anomaly-explain', requireAuth, requireOwner, async (req, res) => {
  const { date, gmv, zScore, avgGmv } = req.body;
  if (!date || !gmv) {
    return res.status(400).json({ error: 'date and gmv are required' });
  }

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    return res.status(503).json({ error: 'Add GEMINI_API_KEY to server/.env' });
  }

  const prompt = `You are an analytics AI for PulseCart (Indian e-commerce platform).

A GMV anomaly was detected:
- Date: ${date}
- GMV: ₹${Number(gmv).toLocaleString('en-IN')}
- Average GMV: ₹${Number(avgGmv || 6000000).toLocaleString('en-IN')}
- Z-score: ${zScore || 'above 2.0'}
- Direction: ${gmv > (avgGmv || 6000000) ? 'spike (above average)' : 'dip (below average)'}

Respond ONLY with valid JSON (no markdown):
{
  "explanation": "<one-line explanation of what likely caused this anomaly>",
  "likelyCause": "<specific cause: festival sale / flash deal / system outage / seasonal pattern / etc>",
  "confidence": "<high|medium|low>",
  "recommendation": "<what the team should do about it>"
}

Consider Indian e-commerce calendar: Diwali, Valentine's, Holi, Eid, Independence Day, Republic Day sales, pay-day effects (1st/15th), IPL season impact, etc.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 400, temperature: 0.2 },
        }),
      }
    );
    if (!response.ok) throw new Error(`Gemini API ${response.status}`);
    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('').trim() || '{}';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(cleaned));
  } catch (err) {
    console.error('Anomaly explain error:', err.message);
    res.status(500).json({ error: 'Explanation failed', detail: err.message });
  }
});

module.exports = router;
