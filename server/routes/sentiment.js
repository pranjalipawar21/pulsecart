const router = require('express').Router();
const { getPool, isAvailable } = require('../db');
const { requireAuth } = require('../middleware/auth');
const axios = require('axios');
const cheerio = require('cheerio');

// ─── Scraper ──────────────────────────────────────────────────────────────────
async function scrapeUrl(url) {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
      timeout: 10000
    });
    const $ = cheerio.load(data);
    const title = $('#productTitle, .B_NuCI, h1.yh-title').first().text().trim();
    const reviews = [];
    $('[data-hook="review-body"], ._27M-N_, .review-text').each((i, el) => {
      if (i < 5) reviews.push($(el).text().trim());
    });
    return { title, scrapedText: reviews.join('\n'), success: !!title };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── POST /api/sentiment/analyze-url ──────────────────────────────────────────
router.post('/analyze-url', requireAuth, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const pool = getPool();
    const scraped = await scrapeUrl(url);
    
    // Store scan request
    if (isAvailable()) {
      await pool.execute(
        'INSERT INTO product_url_scans (url, platform, result_json) VALUES (?, ?, ?)',
        [url, url.includes('amazon') ? 'Amazon' : url.includes('flipkart') ? 'Flipkart' : 'Other', JSON.stringify(scraped)]
      );
    }

    if (!scraped.success) {
      return res.json({
        product: "Unknown Product",
        insufficientData: true,
        message: "Insufficient real data to calculate score. Scraper was restricted by the platform.",
        missing: ["Live reviews", "Product pricing", "Sentiment score"]
      });
    }

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const prompt = `Analyze this product data from an Indian e-commerce site.
    Title: ${scraped.title}
    Data: ${scraped.scrapedText || 'No review text found'}
    
    Respond in JSON:
    {
      "product": "...",
      "sentimentScore": 0-100,
      "overallSentiment": "...",
      "aspects": [{"name": "...", "score": 0, "sentiment": "..."}],
      "topPositive": "...",
      "topNegative": "...",
      "recommendation": "..."
    }`;

    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 },
        }),
      }
    );

    const data = await aiRes.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const result = JSON.parse(raw.replace(/```json|```/g, '').trim());

    res.json({ ...result, isLiveScraped: true, dataSource: 'Web Scraper' });
  } catch (err) {
    res.status(500).json({ error: 'Analysis failed' });
  }
});

module.exports = router;
