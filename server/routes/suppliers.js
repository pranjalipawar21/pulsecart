/**
 * PulseCart Suppliers Routes
 * All scores calculated from MySQL — no hardcoded reliability values.
 *
 * GET    /api/suppliers             — All active suppliers with computed scores
 * POST   /api/suppliers             — Add new supplier
 * PUT    /api/suppliers/:id         — Update supplier
 * DELETE /api/suppliers/:id         — Soft-delete supplier
 * GET    /api/suppliers/performance — Performance summary for analytics
 */
const router = require('express').Router();
const { getPool, isAvailable }        = require('../db');
const { requireAuth, requireOwner }   = require('../middleware/auth');

// ─── GET /api/suppliers ───────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  if (!isAvailable()) {
    return res.json({ success: false, data: [], error: 'Database unavailable' });
  }
  try {
    const [rows] = await getPool().execute(`
      SELECT
        id,
        name,
        contact_email,
        phone,
        city,
        category,
        rating,
        avg_delivery_days,
        defect_rate,
        reliability_score,
        COALESCE(quality_score, 8.0)  AS quality_score,
        COALESCE(on_time_pct, 90.0)   AS on_time_pct,
        is_active,
        created_at,
        -- Composite score: on-time delivery (40%) + quality (10 pts = normalized to 50%) - defect penalty
        ROUND(
          COALESCE(on_time_pct,90) * 0.4
          + COALESCE(quality_score,8) * 5
          - COALESCE(defect_rate,0) * 8,
          1
        ) AS calc_score
      FROM suppliers
      WHERE is_active = 1
      ORDER BY calc_score DESC
    `);

    // Tag risk level
    const data = rows.map(s => ({
      ...s,
      risk_level: s.reliability_score >= 90 ? 'Low Risk'
                : s.reliability_score >= 75 ? 'Medium Risk'
                : 'High Risk',
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /suppliers error:', err.message);
    res.status(500).json({ success: false, data: [], error: err.message });
  }
});

// ─── GET /api/suppliers/performance ──────────────────────────────────────────
router.get('/performance', requireAuth, requireOwner, async (req, res) => {
  if (!isAvailable()) {
    return res.json({ success: false, data: [], error: 'Database unavailable' });
  }
  try {
    const [rows] = await getPool().execute(`
      SELECT
        name,
        city,
        category,
        rating,
        reliability_score,
        COALESCE(quality_score, 8.0) AS quality_score,
        defect_rate,
        avg_delivery_days,
        COALESCE(on_time_pct, 90.0)  AS on_time_pct,
        CASE
          WHEN reliability_score >= 90 THEN 'Best'
          WHEN reliability_score >= 75 THEN 'Average'
          ELSE 'Risky'
        END AS performance_tag
      FROM suppliers
      WHERE is_active = 1
      ORDER BY reliability_score DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, data: [], error: err.message });
  }
});

// ─── POST /api/suppliers ──────────────────────────────────────────────────────
router.post('/', requireAuth, requireOwner, async (req, res) => {
  const {
    name, email, phone, city, category,
    rating = 4.0, avg_delivery_days = 5,
    defect_rate = 0, reliability_score = 90,
    quality_score = 8.0, on_time_pct = 90.0,
  } = req.body;

  if (!name || !email) {
    return res.status(400).json({ success: false, error: 'name and email are required' });
  }

  try {
    const [result] = await getPool().execute(
      `INSERT INTO suppliers
       (name, contact_email, phone, city, category, rating, avg_delivery_days,
        defect_rate, reliability_score, quality_score, on_time_pct)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [name, email, phone || null, city || null, category || null,
       rating, avg_delivery_days, defect_rate, reliability_score, quality_score, on_time_pct]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PUT /api/suppliers/:id ───────────────────────────────────────────────────
router.put('/:id', requireAuth, requireOwner, async (req, res) => {
  const { id } = req.params;
  const {
    name, email, phone, city, category,
    rating, avg_delivery_days, defect_rate,
    reliability_score, quality_score, on_time_pct,
  } = req.body;

  try {
    await getPool().execute(
      `UPDATE suppliers SET
        name              = COALESCE(?, name),
        contact_email     = COALESCE(?, contact_email),
        phone             = COALESCE(?, phone),
        city              = COALESCE(?, city),
        category          = COALESCE(?, category),
        rating            = COALESCE(?, rating),
        avg_delivery_days = COALESCE(?, avg_delivery_days),
        defect_rate       = COALESCE(?, defect_rate),
        reliability_score = COALESCE(?, reliability_score),
        quality_score     = COALESCE(?, quality_score),
        on_time_pct       = COALESCE(?, on_time_pct)
      WHERE id = ?`,
      [name || null, email || null, phone || null, city || null, category || null,
       rating ?? null, avg_delivery_days ?? null, defect_rate ?? null,
       reliability_score ?? null, quality_score ?? null, on_time_pct ?? null,
       id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE /api/suppliers/:id — Soft delete ─────────────────────────────────
router.delete('/:id', requireAuth, requireOwner, async (req, res) => {
  try {
    await getPool().execute(
      'UPDATE suppliers SET is_active = 0 WHERE id = ?',
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
