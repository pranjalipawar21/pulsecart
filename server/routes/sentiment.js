const axios = require('axios');
const cheerio = require('cheerio');

// ─── Scraper ──────────────────────────────────────────────────────────────────
async function scrapeUrl(url) {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 10000
    });
    const $ = cheerio.load(data);
    
    // Extract Product Title
    const title = $('#productTitle, .B_NuCI, h1.yh-title').first().text().trim();
    
    // Extract Reviews/Description
    const reviews = [];
    $('[data-hook="review-body"], ._27M-N_, .review-text').each((i, el) => {
      if (i < 8) reviews.push($(el).text().trim());
    });
    
    // Fallback: If no reviews found, get product description or bullet points
    const fallbackText = $('#feature-bullets, #productDescription, ._2K67mX').text().trim();

    return { 
      title, 
      scrapedText: reviews.join('\n') || fallbackText, 
      success: !!title 
    };
  } catch (err) {
    console.error('Scraping failed:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── URL product identifier extraction ────────────────────────────────────────
function extractProductInfo(url) {
  const u = url.trim();
  const asinMatch = u.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
  if (asinMatch) return { platform: 'Amazon', identifier: asinMatch[1], type: 'ASIN' };
  const fkMatch = u.match(/flipkart\.com\/([^/]+)\/p\/(itm[a-z0-9]+)/i);
  if (fkMatch) return { platform: 'Flipkart', identifier: fkMatch[2], type: 'FSN', slug: fkMatch[1].replace(/-/g, ' ') };
  return { platform: 'Other', identifier: 'product', type: 'url' };
}

// ─── POST /api/sentiment/analyze-url ──────────────────────────────────────────
router.post('/analyze-url', requireAuth, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const productInfo = extractProductInfo(url);
  
  // REAL SCRAPING STEP
  const scraped = await scrapeUrl(url);
  
  const prompt = `You are a product sentiment analyst.
URL: ${url}
Scraped Title: ${scraped.title || 'Unknown'}
Scraped Content/Reviews: 
${scraped.scrapedText || 'No content found via scraper.'}

Task:
${scraped.success 
  ? "The scraper successfully found data. Use this live data to provide a precise sentiment analysis." 
  : "The scraper was blocked or failed. Use your internal knowledge of this product (if known) or similar products in the Indian market to provide a highly realistic simulation."}

Respond ONLY with valid JSON:
{
  "product": "${scraped.title || 'Product name'}",
  "isLiveScraped": ${scraped.success},
  "sentimentScore": 0, 
  "overallSentiment": "Positive/Neutral/Negative",
  "aspects": [
    {"name": "...", "score": 0, "sentiment": "..."}
  ],
  "topPositive": "...",
  "topNegative": "...",
  "recommendation": "..."
}

Fill in all values realistically. Max 10 aspects.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2 },
        }),
      }
    );

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const result = JSON.parse(raw.replace(/```json|```/g, '').trim());
    
    res.json({ ...result, url, analyzedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Analysis failed', detail: err.message });
  }
});
// ─── POST /api/sentiment/analyze-text ─────────────────────────────────────────
// LLM Second pass for individual reviews
router.post('/analyze-text', requireAuth, async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Text required' });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) return res.status(503).json({ error: 'Gemini API key not configured on server' });

  const prompt = `You are a sentiment analysis engine for Indian e-commerce product reviews.

Analyse this review and respond ONLY with valid JSON (no markdown, no extra text):
{
  "sentiment": "positive" | "neutral" | "negative",
  "score": <number -1.0 to 1.0>,
  "confidence": <number 0.0 to 1.0>,
  "aspects": [{ "aspect": "<aspect name>", "sentiment": "positive"|"neutral"|"negative", "phrase": "<supporting phrase>" }],
  "summary": "<one sentence explanation>",
  "recommended_action": "<brief CX/product action recommendation>"
}

Review: "${text.replace(/"/g, "'")}"`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 600, temperature: 0.1 },
        }),
      }
    );
    if (!response.ok) throw new Error(`Gemini API returned ${response.status}`);
    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('').trim() || '{}';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(cleaned));
  } catch (err) {
    res.status(500).json({ error: 'Analysis failed', detail: err.message });
  }
});

// ─── POST /api/sentiment/analyze-category ─────────────────────────────────────
// Category-level insights
router.post('/analyze-category', requireAuth, async (req, res) => {
  const { category, stats } = req.body;
  
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) return res.status(503).json({ error: 'Gemini API key not configured on server' });

  const prompt = `You are a category manager AI for an Indian e-commerce platform.

Category: ${category}
Sentiment Stats: ${JSON.stringify(stats)}

Provide a strategic analysis. Respond ONLY with valid JSON (no markdown):
{
  "summary": "<2 sentence summary of overall sentiment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "topConcern": "<single biggest customer pain point>",
  "recommendation": "<specific actionable recommendation for the product/CX team>",
  "npsEstimate": <number -100 to 100>,
  "priority": "high" | "medium" | "low"
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 800, temperature: 0.2 },
        }),
      }
    );
    if (!response.ok) throw new Error(`Gemini API returned ${response.status}`);
    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('').trim() || '{}';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(cleaned));
  } catch (err) {
    res.status(500).json({ error: 'Category analysis failed', detail: err.message });
  }
});

module.exports = router;
