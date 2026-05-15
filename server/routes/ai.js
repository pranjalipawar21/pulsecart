/**
 * PulseCart AI Routes
 * - GET  /api/ai/health-report  — DB-driven business health with optional Gemini summary
 * - POST /api/ai/chat           — Context-aware chatbot (Gemini)
 * - POST /api/ai/query          — General LLM query proxy
 */
const router    = require('express').Router();
const { requireAuth, requireOwner } = require('../middleware/auth');
const { isAvailable, getPool }      = require('../db');
const rateLimit = require('express-rate-limit');

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { success: false, error: 'Too many AI requests. Please wait 15 minutes.' },
});
router.use(aiLimiter);

// ─── Gemini helper ────────────────────────────────────────────────────────────
async function callGemini(prompt, temperature = 0.2) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not configured');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature },
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ─── GET /api/ai/health-report ────────────────────────────────────────────────
router.get('/health-report', requireAuth, requireOwner, async (req, res) => {
  if (!isAvailable()) {
    return res.status(503).json({ success: false, error: 'Database offline' });
  }

  try {
    const pool = getPool();

    // 1. Revenue & order metrics
    const [orders] = await pool.execute(`
      SELECT
        SUM(amount)                                      AS revenue,
        COUNT(*)                                         AS total_orders,
        COUNT(CASE WHEN status = 'returned' THEN 1 END) AS returns,
        AVG(amount)                                      AS aov
      FROM orders
    `);

    // 2. Inventory health
    const [inv] = await pool.execute(`
      SELECT
        COUNT(CASE WHEN status = 'critical' THEN 1 END)              AS critical_count,
        COUNT(CASE WHEN status = 'low'      THEN 1 END)              AS low_count,
        COUNT(CASE WHEN stock > 100 AND reorder_threshold < 20
                   THEN 1 END)                                       AS dead_stock,
        COUNT(*)                                                     AS total_skus
      FROM inventory
    `);

    // 3. Anomaly log (safe query — table guaranteed by seed)
    let activeAnomalies = 0;
    try {
      const [anom] = await pool.execute(
        "SELECT COUNT(*) AS count FROM anomaly_log WHERE resolved = 0"
      );
      activeAnomalies = anom[0].count || 0;
    } catch (_) { /* anomaly_log may not exist in older installs */ }

    // 4. Supplier risk
    const [suppRisk] = await pool.execute(
      "SELECT COUNT(*) AS risky FROM suppliers WHERE reliability_score < 80 AND is_active = 1"
    );

    // 5. Price intelligence status
    const [priceAlerts] = await pool.execute(`
      SELECT COUNT(*) AS alerts
      FROM (
        SELECT ph.product_id
        FROM price_history ph
        JOIN inventory i ON i.id = ph.product_id
        WHERE ph.platform != 'PulseCart'
          AND ph.current_price < i.price
        GROUP BY ph.product_id
      ) t
    `);

    // ── Build metrics object ──────────────────────────────────────────────────
    const revenue    = Number(orders[0].revenue    || 0);
    const totalOrds  = Number(orders[0].total_orders || 0);
    const returns    = Number(orders[0].returns    || 0);
    const returnRate = totalOrds > 0 ? ((returns / totalOrds) * 100) : 0;

    const metrics = {
      revenue:          revenue,
      orderCount:       totalOrds,
      returnRate:       `${returnRate.toFixed(1)}%`,
      aov:              Number(orders[0].aov || 0).toFixed(0),
      criticalStock:    inv[0].critical_count || 0,
      lowStock:         inv[0].low_count      || 0,
      deadStock:        inv[0].dead_stock     || 0,
      totalSKUs:        inv[0].total_skus     || 0,
      activeAnomalies,
      riskySuppliers:   suppRisk[0].risky    || 0,
      priceAlerts:      priceAlerts[0].alerts || 0,
      dataSource:       'MySQL Live',
    };

    // ── Rule-based health score (no AI needed) ────────────────────────────────
    let score = 100;
    if (metrics.criticalStock > 3)     score -= 15;
    if (metrics.criticalStock > 0)     score -= 5;
    if (returnRate > 10)               score -= 15;
    if (returnRate > 5)                score -= 5;
    if (metrics.riskySuppliers > 2)    score -= 10;
    if (metrics.activeAnomalies > 3)   score -= 10;
    if (metrics.priceAlerts > 5)       score -= 5;
    score = Math.max(0, Math.min(100, score));

    const ruleRisks = [];
    const ruleRecs  = [];
    if (metrics.criticalStock > 0) {
      ruleRisks.push(`${metrics.criticalStock} SKU(s) at critical stock level (< 20 units)`);
      ruleRecs.push('Trigger emergency reorder for critical SKUs immediately');
    }
    if (returnRate > 8) {
      ruleRisks.push(`Return rate ${returnRate.toFixed(1)}% above 8% threshold`);
      ruleRecs.push('Audit top-returned products for quality and description accuracy');
    }
    if (metrics.riskySuppliers > 0) {
      ruleRisks.push(`${metrics.riskySuppliers} supplier(s) with reliability score < 80`);
      ruleRecs.push('Review low-reliability suppliers and consider backup vendors');
    }
    if (metrics.priceAlerts > 0) {
      ruleRisks.push(`${metrics.priceAlerts} product(s) priced above competitor market price`);
      ruleRecs.push('Run AI repricing on overpriced SKUs in Price Intelligence tab');
    }

    const baseReport = {
      healthScore:  score,
      status:       score >= 80 ? 'Healthy' : score >= 60 ? 'Attention Needed' : 'Critical',
      riskAreas:    ruleRisks,
      recommendations: ruleRecs,
      metricsUsed:  metrics,
      generatedAt:  new Date().toISOString(),
      dataSource:   'MySQL + Rule Engine',
    };

    // ── Try Gemini for executive summary ─────────────────────────────────────
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) {
      return res.json({
        success: true,
        report: {
          ...baseReport,
          summary: `AI summary unavailable — GEMINI_API_KEY not configured. Database metrics calculated successfully. Health score: ${score}/100. ${metrics.criticalStock} critical SKU(s), return rate ${returnRate.toFixed(1)}%, ${metrics.activeAnomalies} active anomalies.`,
          dataSource: 'MySQL Only (no AI key)',
        },
      });
    }

    try {
      const prompt = `You are a Chief Retail Analyst for an Indian e-commerce company.
These are REAL database metrics from PulseCart retail platform:
${JSON.stringify(metrics, null, 2)}

Health Score (rule-calculated): ${score}/100

Write a 3-4 sentence executive summary in plain English for the store owner.
Be specific — mention actual numbers. Focus on the most critical insight first.
Do NOT wrap in JSON. Just the paragraph text.`;

      const summary = await callGemini(prompt, 0.3);

      return res.json({
        success: true,
        report: {
          ...baseReport,
          summary: summary.trim() || baseReport.summary,
          dataSource: 'MySQL + Gemini 2.0 Flash',
        },
      });
    } catch (aiErr) {
      console.warn('Gemini summary failed, returning rule-based report:', aiErr.message);
      return res.json({
        success: true,
        report: {
          ...baseReport,
          summary: `Database analysis complete. Health score: ${score}/100. ${metrics.criticalStock} critical SKU(s), return rate ${returnRate.toFixed(1)}%, ${metrics.riskySuppliers} risky supplier(s). (AI summary unavailable: ${aiErr.message})`,
          dataSource: 'MySQL Only (AI error)',
        },
      });
    }

  } catch (err) {
    console.error('Health Report Error:', err.message);
    res.status(500).json({ success: false, error: `Health report failed: ${err.message}` });
  }
});

// ─── POST /api/ai/chat — Context-aware chatbot (Gemini) ──────────────────────
router.post('/chat', requireAuth, async (req, res) => {
  const { query, history, contextData } = req.body;
  if (!query) return res.status(400).json({ success: false, error: 'query is required' });

  try {
    // Pull fresh DB context
    let dbContext = {};
    if (isAvailable()) {
      try {
        const pool = getPool();
        const [invRows] = await pool.execute(
          'SELECT product, category, stock, price, status FROM inventory ORDER BY status ASC LIMIT 30'
        );
        const [orderStats] = await pool.execute(`
          SELECT SUM(amount) AS gmv, COUNT(*) AS orders,
                 COUNT(CASE WHEN status='returned' THEN 1 END) AS returns
          FROM orders
        `);
        const [critRows] = await pool.execute(
          "SELECT product, stock, reorder_threshold FROM inventory WHERE status='critical'"
        );
        dbContext = {
          inventory:    invRows,
          criticalItems: critRows,
          orderStats:   orderStats[0],
        };
      } catch (_) {}
    }

    const systemPrompt = `You are PulseCart AI Assistant — an intelligent retail analytics chatbot for an Indian e-commerce store.
You have access to REAL database metrics below. Always base your answers on this data.
Be concise (max 150 words). Use ₹ for Indian Rupees. Be actionable and specific.

Store Data:
${JSON.stringify({ ...dbContext, ...(contextData || {}) }, null, 2)}`;

    // Build conversation history for Gemini
    const geminiHistory = (history || []).slice(-8).map(m => ({
      role:  m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text || m.content || '' }],
    }));

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      // Rule-based fallback when no Gemini key
      return res.json({
        success: true,
        answer: `I can see ${dbContext.criticalItems?.length || 0} critical stock items and ${dbContext.orderStats?.orders || 0} total orders in the database. For full AI analysis, please configure the GEMINI_API_KEY in your .env file.`,
        source: 'rule-based',
      });
    }

    const payload = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [
        ...geminiHistory,
        { role: 'user', parts: [{ text: query }] },
      ],
      generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
    };

    const apiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      throw new Error(`Gemini ${apiRes.status}: ${errText.slice(0, 200)}`);
    }

    const data   = await apiRes.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!answer) throw new Error('Empty response from Gemini');

    res.json({ success: true, answer, source: 'gemini' });

  } catch (err) {
    console.error('Chat Error:', err.message);
    res.json({
      success: true,
      answer: `I encountered an error processing your request: ${err.message}. Please check that your GEMINI_API_KEY is configured correctly in the server .env file.`,
      source: 'fallback',
    });
  }
});

// ─── POST /api/ai/query — General prompt proxy ───────────────────────────────
router.post('/query', requireAuth, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ success: false, error: 'prompt required' });

  try {
    const text = await callGemini(prompt, 0.3);
    res.json({ success: true, result: text });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      result: 'AI query failed. Ensure GEMINI_API_KEY is set in server/.env',
    });
  }
});

module.exports = router;
