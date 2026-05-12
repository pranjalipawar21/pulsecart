const router = require('express').Router();
const { requireAuth, requireOwner } = require('../middleware/auth');
const { isAvailable, getPool, FALLBACK } = require('../db');
const Anthropic = require('@anthropic-ai/sdk');
const rateLimit = require('express-rate-limit');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── Rate Limiter for AI ─────────────────────────────────────────────────────
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: { error: 'Too many requests to AI endpoints. Please try again later.' }
});

router.use(aiLimiter);

// ─── Caching Helpers ────────────────────────────────────────────────────────
const getCached = async (key) => {
  if (!isAvailable()) return null;
  try {
    const [rows] = await getPool().execute(
      'SELECT response FROM ai_cache WHERE cache_key = ? AND expires_at > NOW()',
      [key]
    );
    return rows[0]?.response || null;
  } catch (err) {
    return null;
  }
};

const setCache = async (key, response, ttlHours = 24) => {
  if (!isAvailable()) return;
  try {
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    await getPool().execute(
      'INSERT INTO ai_cache (cache_key, response, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE response = VALUES(response), expires_at = VALUES(expires_at)',
      [key, JSON.stringify(response), expiresAt]
    );
  } catch (err) {
    console.error('Cache set error:', err.message);
  }
};

// ─── POST /api/ai/query ──────────────────────────────────────────────────────
// Shared Anthropic endpoint
router.post('/query', requireAuth, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'Anthropic API key missing' });
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });
    res.json({ result: response.content[0].text });
  } catch (err) {
    console.error('Anthropic query error:', err.message);
    res.status(500).json({ error: 'AI Query failed', detail: err.message });
  }
});

// ─── POST /api/ai/demand-forecast ────────────────────────────────────────────
// Uses Gemini/Claude to predict next-week reorder quantities with seasonality
router.post('/demand-forecast', requireAuth, requireOwner, async (req, res) => {
  const cacheKey = 'demand_forecast_v2';
  const cached = await getCached(cacheKey);
  if (cached) return res.json(cached);

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    return res.status(503).json({ error: 'Add GEMINI_API_KEY to server/.env' });
  }

  let inventory = [];
  if (isAvailable()) {
    const [rows] = await getPool().execute(
      'SELECT product, category, stock, reorder_threshold, turnover, price FROM inventory ORDER BY stock ASC'
    );
    inventory = rows;
  } else {
    inventory = FALLBACK.inventory;
  }

  const prompt = `You are a demand planning AI for PulseCart (Indian e-commerce).
Current inventory data: ${JSON.stringify(inventory)}

Consider seasonality: Diwali, Big Billion Days, Holi, and regular weekend spikes.
Analyse each SKU and respond ONLY with valid JSON:
{
  "forecasts": [
    { "product": "...", "reorderQty": 0, "urgency": "...", "rationale": "..." }
  ],
  "summary": "...",
  "seasonalityFactor": "..."
}`;

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
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const cleaned = JSON.parse(raw.replace(/```json|```/g, '').trim());
    
    await setCache(cacheKey, cleaned, 12); // Cache for 12 hours
    res.json(cleaned);
  } catch (err) {
    res.status(500).json({ error: 'Forecast failed', detail: err.message });
  }
});

// ─── POST /api/ai/product-description ────────────────────────────────────────
// AI-generated SEO-optimised product descriptions
router.post('/product-description', requireAuth, async (req, res) => {
  const { sku } = req.body;
  if (!sku) return res.status(400).json({ error: 'SKU is required' });

  try {
    let productData = null;
    if (isAvailable()) {
      const [rows] = await getPool().execute('SELECT * FROM inventory WHERE sku = ?', [sku]);
      productData = rows[0];
    } else {
      productData = FALLBACK.inventory.find(i => i.sku === sku);
    }

    if (!productData) return res.status(404).json({ error: 'Product not found' });

    const prompt = `Write an SEO-optimised product description for an Indian e-commerce site for this product:
    Name: ${productData.product}
    Category: ${productData.category}
    Price: ₹${productData.price}
    
    Include:
    1. Catchy title
    2. 3 key features
    3. Target audience
    4. Call to action.
    Respond in plain text.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    const description = response.content[0].text;
    res.json({ description });
  } catch (err) {
    res.status(500).json({ error: 'Description generation failed' });
  }
});

// ─── POST /api/ai/chat ────────────────────────────────────────────────────────
// Chatbot handler using live inventory context
router.post('/chat', requireAuth, async (req, res) => {
  const { query, history } = req.body;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  try {
    let inventory = [];
    if (isAvailable()) {
      const [rows] = await getPool().execute('SELECT product, category, stock, price, status FROM inventory');
      inventory = rows;
    } else {
      inventory = FALLBACK.inventory;
    }

    const systemText = `You are PulseCart AI, helping a store owner.
    Live Inventory Snapshot: ${JSON.stringify(inventory.slice(0, 50))}
    Answer concisely. Reference real data. If asked about reorders, look for 'critical' or 'low' status.`;

    const contents = [...(history || []), { role: 'user', content: query }];
    
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 500,
      system: systemText,
      messages: contents
    });

    res.json({ answer: response.content[0].text });
  } catch (err) {
    res.status(500).json({ error: 'Chat failed' });
  }
});

module.exports = router;
