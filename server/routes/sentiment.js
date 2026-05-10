const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');

// ─── URL product identifier extraction ────────────────────────────────────────
function extractProductInfo(url) {
  const u = url.trim();
  // Amazon ASIN
  const asinMatch = u.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
  if (asinMatch) return { platform: 'Amazon', identifier: asinMatch[1], type: 'ASIN' };
  // Flipkart FSN
  const fkMatch = u.match(/flipkart\.com\/([^/]+)\/p\/(itm[a-z0-9]+)/i);
  if (fkMatch) return { platform: 'Flipkart', identifier: fkMatch[2], type: 'FSN', slug: fkMatch[1].replace(/-/g, ' ') };
  // Flipkart slug
  const fkSlug = u.match(/flipkart\.com\/([^/?#]+)/i);
  if (fkSlug) return { platform: 'Flipkart', identifier: fkSlug[1], type: 'slug', slug: fkSlug[1].replace(/-/g, ' ') };
  // Meesho
  const meeshoMatch = u.match(/meesho\.com\/([^/?#]+)/i);
  if (meeshoMatch) return { platform: 'Meesho', identifier: meeshoMatch[1], type: 'slug', slug: meeshoMatch[1].replace(/-/g, ' ') };
  // Myntra
  const myntraMatch = u.match(/myntra\.com\/([^/?#]+)/i);
  if (myntraMatch) return { platform: 'Myntra', identifier: myntraMatch[1], type: 'slug', slug: myntraMatch[1].replace(/-/g, ' ') };
  // Generic
  const parts = u.split('/').filter(s => s.length > 5 && !s.startsWith('http') && !s.includes('.'));
  if (parts.length > 0) return { platform: 'Other', identifier: parts[0], type: 'slug', slug: parts[0].replace(/-/g, ' ') };
  return { platform: 'Unknown', identifier: 'product', type: 'url', slug: 'product' };
}

// ─── POST /api/sentiment/analyze-url ──────────────────────────────────────────
// Server-side sentiment analysis — keeps API key secure
router.post('/analyze-url', requireAuth, async (req, res) => {
  const { url } = req.body;
  if (!url || !url.trim()) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    return res.status(503).json({ error: 'Gemini API key not configured on server. Add GEMINI_API_KEY to server/.env' });
  }

  const productInfo = extractProductInfo(url);

  const prompt = `You are a product review sentiment analysis engine for Indian e-commerce.

I have a product URL from ${productInfo.platform}: ${url}
Product identifier: ${productInfo.identifier}
${productInfo.slug ? `Product slug: ${productInfo.slug}` : ''}

Based on your knowledge of this actual product, analyze what real customer reviews typically say about it.

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "product": "<actual full product name>",
  "brand": "<brand name>",
  "category": "<product category>",
  "priceRange": "<typical price range in INR>",
  "total": <estimated number of reviews, realistic 50-500>,
  "positive": <count>,
  "neutral": <count>,
  "negative": <count>,
  "avgRating": <1.0-5.0>,
  "avgScore": <-1.0 to 1.0>,
  "aspects": [
    { "aspect": "<aspect>", "sentiment": "positive"|"neutral"|"negative", "count": <n>, "phrase": "<typical phrases>" }
  ],
  "topPositive": "<representative positive review>",
  "topNegative": "<representative negative review>",
  "recommendation": "<actionable recommendation>",
  "competitorComparison": "<brief competitor comparison>"
}

Use real product knowledge. Do NOT generate generic/placeholder data.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1200, temperature: 0.3 },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API returned ${response.status}`);
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('').trim() || '{}';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);

    res.json({
      ...result,
      url,
      platform: productInfo.platform,
      identifier: productInfo.identifier,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Sentiment analysis error:', err.message);
    res.status(500).json({ error: 'Sentiment analysis failed', detail: err.message });
  }
});

module.exports = router;
