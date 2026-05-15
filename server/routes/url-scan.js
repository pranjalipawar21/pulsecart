/**
 * PulseCart URL Scan Route
 * POST /api/url-scan
 *
 * Extracts platform/product metadata from a product URL (URL parsing only —
 * no live scraping to avoid ToS violations). Matches against inventory if
 * possible and calculates a data-driven score. Never shows fake percentages.
 */
const router = require('express').Router();
const { requireAuth }          = require('../middleware/auth');
const { isAvailable, getPool } = require('../db');

// ─── Platform URL patterns ────────────────────────────────────────────────────
const PLATFORM_PATTERNS = [
  {
    platform: 'Flipkart',
    pattern:  /flipkart\.com/i,
    // e.g. /snuzspace-leatherette.../p/itm6abd5c652e6b9?pid=RECHK8K97M6FGAGS
    extractSlug: (url) => {
      try {
        const u    = new URL(url);
        const path = u.pathname; // /product-name/p/itemId
        const parts = path.split('/').filter(Boolean);
        const pIdx  = parts.indexOf('p');
        const slug  = pIdx > 0 ? parts[pIdx - 1] : parts[0] || '';
        const pid   = u.searchParams.get('pid') || (parts[pIdx + 1] || '');
        return { slug, pid, lid: u.searchParams.get('lid') || '' };
      } catch { return { slug: '', pid: '', lid: '' }; }
    },
  },
  {
    platform: 'Amazon',
    pattern:  /amazon\.in|amazon\.com/i,
    // e.g. /dp/B08J5F3G18 or /product/ASIN
    extractSlug: (url) => {
      try {
        const u    = new URL(url);
        const path = u.pathname;
        const dpIdx = path.indexOf('/dp/');
        const pid   = dpIdx !== -1 ? path.slice(dpIdx + 4, dpIdx + 14) : '';
        const parts = path.split('/').filter(Boolean);
        const slug  = parts[0] || '';
        return { slug, pid, lid: '' };
      } catch { return { slug: '', pid: '', lid: '' }; }
    },
  },
  {
    platform: 'Croma',
    pattern:  /croma\.com/i,
    extractSlug: (url) => {
      try {
        const u    = new URL(url);
        const parts = u.pathname.split('/').filter(Boolean);
        const slug  = parts[parts.length - 1] || '';
        const pid   = slug.replace(/[^0-9]/g, '') || '';
        return { slug, pid, lid: '' };
      } catch { return { slug: '', pid: '', lid: '' }; }
    },
  },
  {
    platform: 'Myntra',
    pattern:  /myntra\.com/i,
    extractSlug: (url) => {
      try {
        const u    = new URL(url);
        const parts = u.pathname.split('/').filter(Boolean);
        // Myntra: /brand/product-name/pid/styles
        const pid   = parts[2] || parts[parts.length - 1] || '';
        const slug  = parts.slice(0, 2).join('-');
        return { slug, pid, lid: '' };
      } catch { return { slug: '', pid: '', lid: '' }; }
    },
  },
  {
    platform: 'Meesho',
    pattern:  /meesho\.com/i,
    extractSlug: (url) => {
      try {
        const u    = new URL(url);
        const parts = u.pathname.split('/').filter(Boolean);
        return { slug: parts[0] || '', pid: parts[1] || '', lid: '' };
      } catch { return { slug: '', pid: '', lid: '' }; }
    },
  },
];

function detectPlatform(url) {
  for (const p of PLATFORM_PATTERNS) {
    if (p.pattern.test(url)) {
      return { ...p.extractSlug(url), platform: p.platform };
    }
  }
  // Generic URL
  try {
    const u    = new URL(url);
    const slug = u.pathname.split('/').filter(Boolean).join('-');
    return { platform: u.hostname.replace('www.', ''), slug, pid: '', lid: '' };
  } catch {
    return { platform: 'Unknown', slug: '', pid: '', lid: '' };
  }
}

// ─── POST /api/url-scan ───────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string' || url.trim().length < 10) {
    return res.status(400).json({ success: false, error: 'A valid product URL is required' });
  }

  const cleanUrl = url.trim();

  // 1. Detect platform and extract metadata
  const { platform, slug, pid, lid } = detectPlatform(cleanUrl);

  // 2. Try to match against inventory
  let matchedProduct   = null;
  let priceHistory     = [];
  let supplierData     = null;
  let missingData      = [];
  let scanStatus       = 'partial';

  if (isAvailable()) {
    const pool = getPool();
    try {
      // Fuzzy match slug against product names
      if (slug.length > 3) {
        const searchTerms = slug.replace(/-/g, ' ').split(' ').filter(w => w.length > 3);
        const searchLike  = searchTerms.slice(0, 2).map(t => `%${t}%`);

        let matched = null;
        for (const term of searchLike) {
          const [rows] = await pool.execute(
            'SELECT * FROM inventory WHERE product LIKE ? OR sku LIKE ? LIMIT 1',
            [term, `%${pid}%`]
          );
          if (rows.length > 0) { matched = rows[0]; break; }
        }

        // Also try PID match in SKU
        if (!matched && pid) {
          const [rows] = await pool.execute(
            'SELECT * FROM inventory WHERE sku LIKE ? LIMIT 1',
            [`%${pid}%`]
          );
          matched = rows[0] || null;
        }

        matchedProduct = matched;
      }

      // Price intelligence for matched product
      if (matchedProduct) {
        const [ph] = await pool.execute(
          'SELECT * FROM price_history WHERE product_id = ? ORDER BY recorded_at DESC',
          [matchedProduct.id]
        );
        priceHistory = ph;

        // Supplier data
        const [sp] = await pool.execute(`
          SELECT s.name, s.reliability_score, s.defect_rate, s.avg_delivery_days
          FROM supplier_products sp
          JOIN suppliers s ON s.id = sp.supplier_id
          WHERE sp.product_id = ? AND s.is_active = 1
          LIMIT 1
        `, [matchedProduct.id]);
        supplierData = sp[0] || null;
      }
    } catch (err) {
      console.warn('URL scan DB query failed:', err.message);
    }
  }

  // 3. Calculate real score from available data
  const scoreFactors = {};
  let   totalScore   = 0;
  let   maxScore     = 0;

  if (matchedProduct) {
    scanStatus = 'success';

    // Price competitiveness (30 pts)
    maxScore += 30;
    const ourPrice = Number(matchedProduct.price);
    const competitorPrices = priceHistory
      .filter(ph => ph.platform !== 'PulseCart')
      .map(ph => Number(ph.current_price));

    if (competitorPrices.length > 0) {
      const avgComp = competitorPrices.reduce((s, p) => s + p, 0) / competitorPrices.length;
      const priceDiff = ((ourPrice - avgComp) / avgComp) * 100;
      const priceScore = priceDiff <= -5 ? 30 : priceDiff <= 0 ? 25 : priceDiff <= 5 ? 18 : 10;
      scoreFactors.price = {
        score: priceScore,
        max: 30,
        detail: `Our price ₹${ourPrice.toLocaleString('en-IN')} vs avg competitor ₹${Math.round(avgComp).toLocaleString('en-IN')} (${priceDiff > 0 ? '+' : ''}${priceDiff.toFixed(1)}%)`,
        status: priceDiff <= 0 ? 'Competitive' : priceDiff <= 5 ? 'Slightly Overpriced' : 'Overpriced',
      };
      totalScore += priceScore;
    } else {
      missingData.push('Competitor price data missing — add price_history records for this product');
      scoreFactors.price = { score: 0, max: 30, detail: 'No competitor price data available', status: 'Unknown' };
    }

    // Stock availability (20 pts)
    maxScore += 20;
    const stockScore = matchedProduct.status === 'healthy' ? 20
                     : matchedProduct.status === 'low'     ? 12 : 5;
    scoreFactors.stock = {
      score: stockScore,
      max: 20,
      detail: `Stock: ${matchedProduct.stock} units (${matchedProduct.status})`,
      status: matchedProduct.status,
    };
    totalScore += stockScore;

    // Supplier reliability (25 pts)
    maxScore += 25;
    if (supplierData) {
      const rel = supplierData.reliability_score || 80;
      const suppScore = rel >= 90 ? 25 : rel >= 80 ? 18 : rel >= 70 ? 12 : 5;
      scoreFactors.supplier = {
        score: suppScore,
        max: 25,
        detail: `${supplierData.name} — Reliability ${rel}%, Defect Rate ${supplierData.defect_rate}%, Avg Delivery ${supplierData.avg_delivery_days}d`,
        status: rel >= 80 ? 'Reliable' : 'Review Needed',
      };
      totalScore += suppScore;
    } else {
      missingData.push('Supplier data missing — no supplier mapped to this product');
      scoreFactors.supplier = { score: 0, max: 25, detail: 'No supplier linked to this product', status: 'Unknown' };
    }

    // Platform match bonus (25 pts)
    maxScore += 25;
    const platformScore = platform !== 'Unknown' ? 25 : 10;
    scoreFactors.platform = {
      score: platformScore,
      max: 25,
      detail: `Platform identified: ${platform}. Product slug: ${slug || 'n/a'}. PID: ${pid || 'n/a'}`,
      status: 'Matched',
    };
    totalScore += platformScore;

  } else {
    // No inventory match
    scanStatus = 'partial';
    missingData = [
      'Product not matched in PulseCart inventory — add this product to track it',
      'Competitor price missing — no price_history records for this URL',
      'Supplier data missing — product not in system',
      'Review/demand data missing — product not tracked',
    ];
  }

  // 4. Calculate final percentage (only if we have enough data)
  const hasEnoughData = maxScore >= 50;
  const finalScore    = hasEnoughData
    ? Math.round((totalScore / maxScore) * 100)
    : null;

  const recommendation = matchedProduct
    ? (finalScore >= 75 ? 'Strong position — monitor competitor prices weekly'
      : finalScore >= 50 ? 'Review pricing strategy and ensure supplier reliability'
      : 'Immediate action needed — price or stock issue detected')
    : 'Add this product to PulseCart inventory to enable full analysis';

  // 5. Store scan record in DB
  if (isAvailable()) {
    try {
      await getPool().execute(
        `INSERT INTO product_url_scans
         (url, platform, product_slug, product_id_extracted, scan_status, matched_product_id, data_source, result_json)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          cleanUrl.slice(0, 2000), // TEXT column
          platform,
          slug || null,
          pid  || null,
          scanStatus,
          matchedProduct?.id || null,
          'url-parse',
          JSON.stringify({ scoreFactors, finalScore, missingData }),
        ]
      );
    } catch (err) {
      console.warn('Could not save scan record:', err.message);
    }
  }

  // 6. Return structured analysis
  res.json({
    success: true,
    analysis: {
      url:            cleanUrl,
      platform,
      productSlug:    slug    || null,
      productId:      pid     || null,
      listingId:      lid     || null,
      scanStatus,
      matchedProduct: matchedProduct
        ? {
            id:       matchedProduct.id,
            sku:      matchedProduct.sku,
            name:     matchedProduct.product,
            category: matchedProduct.category,
            price:    matchedProduct.price,
            stock:    matchedProduct.stock,
            status:   matchedProduct.status,
          }
        : null,
      scoreFactors,
      overallScore:   hasEnoughData ? finalScore : null,
      scoreLabel:     hasEnoughData
        ? (finalScore >= 75 ? 'Strong' : finalScore >= 50 ? 'Average' : 'Weak')
        : 'Insufficient Data',
      missingData,
      recommendation,
      dataSource:     isAvailable() ? 'MySQL + URL Parse' : 'URL Parse Only',
      scannedAt:      new Date().toISOString(),
    },
  });
});

// ─── GET /api/url-scan/history ────────────────────────────────────────────────
router.get('/history', requireAuth, async (req, res) => {
  if (!isAvailable()) return res.json({ success: true, data: [] });
  try {
    const [rows] = await getPool().execute(
      'SELECT id, url, platform, product_slug, scan_status, matched_product_id, created_at FROM product_url_scans ORDER BY created_at DESC LIMIT 20'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.json({ success: true, data: [], error: err.message });
  }
});

module.exports = router;
