// src/data/feedbackData.js
// ─────────────────────────────────────────────────────────────────────────────
// Structured customer feedback dataset — NPS, CSAT, CES scores
// Used by Sentiment tab and ChatBot for feedback-based insights
// Benchmarks: Bain & Company NPS 2024, Gartner CSAT 2024
// ─────────────────────────────────────────────────────────────────────────────

// ── NPS Categories ────────────────────────────────────────────────────────────
// Promoters:  9–10
// Passives:   7–8
// Detractors: 0–6

export const NPS_RESPONSES = [
  // Promoters (score 9-10)
  { id: 1,  score: 10, category: "Electronics",   channel: "App",          region: "Bangalore", feedback: "Delivery in 6 hours. Packaging was perfect. Will recommend to everyone.", date: "2024-04-20" },
  { id: 2,  score: 10, category: "Fashion",        channel: "Organic",      region: "Mumbai",    feedback: "Size guide was accurate. Returns process took only 2 days. Excellent.", date: "2024-04-19" },
  { id: 3,  score: 9,  category: "Health/Beauty",  channel: "Email",        region: "Delhi NCR", feedback: "Product quality is consistent. Customer support resolved my issue in 10 mins.", date: "2024-04-18" },
  { id: 4,  score: 10, category: "Home/Kitchen",   channel: "Paid Search",  region: "Hyderabad", feedback: "Same day delivery is a game changer. Price was best on the internet.", date: "2024-04-17" },
  { id: 5,  score: 9,  category: "Sports",         channel: "Social",       region: "Chennai",   feedback: "Authentic Nike product. Fast shipping. Excellent after-sale support.", date: "2024-04-16" },
  { id: 6,  score: 10, category: "Books",          channel: "Direct",       region: "Pune",      feedback: "Got the book in original sealed condition. Way cheaper than Amazon.", date: "2024-04-15" },
  { id: 7,  score: 9,  category: "Electronics",    channel: "App",          region: "Kolkata",   feedback: "boAt earbuds arrived in 1 day. Legit product. Will buy more electronics here.", date: "2024-04-14" },
  { id: 8,  score: 10, category: "Fashion",        channel: "Affiliate",    region: "Jaipur",    feedback: "Libas kurta fits perfectly. Stitching is premium. Repeat customer for 2 years.", date: "2024-04-13" },
  { id: 9,  score: 9,  category: "Health/Beauty",  channel: "Organic",      region: "Ahmedabad", feedback: "Mamaearth products always authentic here. Never had a fake issue unlike Flipkart.", date: "2024-04-12" },
  { id: 10, score: 10, category: "Home/Kitchen",   channel: "App",          region: "Surat",     feedback: "Prestige cooker delivered in original box with all accessories. 10/10.", date: "2024-04-11" },
  // Passives (score 7-8)
  { id: 11, score: 8,  category: "Electronics",    channel: "Paid Search",  region: "Mumbai",    feedback: "Good product but delivery took 3 days instead of promised 2.", date: "2024-04-20" },
  { id: 12, score: 7,  category: "Fashion",        channel: "Social",       region: "Delhi NCR", feedback: "Product is fine but packaging was slightly damaged. Didn't affect item though.", date: "2024-04-19" },
  { id: 13, score: 8,  category: "Sports",         channel: "Email",        region: "Bangalore", feedback: "Shoes are good. Sizing chart could be better. Had to exchange once.", date: "2024-04-18" },
  { id: 14, score: 7,  category: "Home/Kitchen",   channel: "Organic",      region: "Hyderabad", feedback: "Product quality okay. Customer support chat was slow to respond.", date: "2024-04-17" },
  { id: 15, score: 8,  category: "Health/Beauty",  channel: "Direct",       region: "Chennai",   feedback: "Product is genuine. Wish they had more variety in this brand.", date: "2024-04-16" },
  { id: 16, score: 7,  category: "Books",          channel: "App",          region: "Pune",      feedback: "Book arrived in good condition. Price was slightly higher than expected.", date: "2024-04-15" },
  { id: 17, score: 8,  category: "Electronics",    channel: "Affiliate",    region: "Kolkata",   feedback: "Laptop was genuine. Setup guide missing from box. Otherwise good.", date: "2024-04-14" },
  { id: 18, score: 7,  category: "Fashion",        channel: "Organic",      region: "Jaipur",    feedback: "Kurta quality is nice but color was slightly different from photo.", date: "2024-04-13" },
  // Detractors (score 0-6)
  { id: 19, score: 4,  category: "Electronics",    channel: "Paid Search",  region: "Mumbai",    feedback: "Phone delivered with scratched screen. Return process took 8 days. Very frustrating.", date: "2024-04-20" },
  { id: 20, score: 3,  category: "Fashion",        channel: "Social",       region: "Delhi NCR", feedback: "Wrong size delivered. Support took 4 days to respond. Will not buy again.", date: "2024-04-19" },
  { id: 21, score: 2,  category: "Home/Kitchen",   channel: "Direct",       region: "Bangalore", feedback: "Mixer stopped working after 2 uses. Refund denied saying it's 'user damage'. Disgusting.", date: "2024-04-18" },
  { id: 22, score: 5,  category: "Health/Beauty",  channel: "Email",        region: "Hyderabad", feedback: "Received product 6 days late. No proactive communication. Just bad service.", date: "2024-04-17" },
  { id: 23, score: 1,  category: "Electronics",    channel: "App",          region: "Chennai",   feedback: "Counterfeit boAt earbuds delivered. Reported to consumer forum. Terrible experience.", date: "2024-04-16" },
  { id: 24, score: 6,  category: "Sports",         channel: "Organic",      region: "Pune",      feedback: "Shoes were genuine but right shoe had a minor stitching defect. Exchange was okay.", date: "2024-04-15" },
  { id: 25, score: 4,  category: "Books",          channel: "Affiliate",    region: "Kolkata",   feedback: "Book arrived with torn cover. Replacement sent but took 10 days. Not acceptable.", date: "2024-04-14" },
];

// ── CSAT Scores (1–5 scale) ───────────────────────────────────────────────────
export const CSAT_RESPONSES = [
  { id: 1,  touchpoint: "Checkout Experience",  score: 4.2, responses: 1840, benchmark: 4.1 },
  { id: 2,  touchpoint: "Delivery Speed",        score: 4.5, responses: 2210, benchmark: 3.9 },
  { id: 3,  touchpoint: "Product Quality",       score: 4.1, responses: 1930, benchmark: 4.0 },
  { id: 4,  touchpoint: "Customer Support",      score: 3.7, responses: 1120, benchmark: 3.8 },
  { id: 5,  touchpoint: "Returns & Refunds",     score: 3.4, responses:  890, benchmark: 3.5 },
  { id: 6,  touchpoint: "App Experience",        score: 4.3, responses: 2840, benchmark: 4.0 },
  { id: 7,  touchpoint: "Payment Process",       score: 4.6, responses: 3120, benchmark: 4.2 },
  { id: 8,  touchpoint: "Search & Discovery",    score: 3.9, responses: 1670, benchmark: 3.7 },
  { id: 9,  touchpoint: "Packaging",             score: 4.4, responses: 2090, benchmark: 4.1 },
  { id: 10, touchpoint: "Price Competitiveness", score: 3.8, responses: 1480, benchmark: 3.9 },
];

// ── CES — Customer Effort Score (1–7, lower = better) ────────────────────────
export const CES_RESPONSES = [
  { id: 1, task: "Find the right product",       score: 2.8, benchmark: 3.1 },
  { id: 2, task: "Complete checkout",            score: 2.2, benchmark: 2.5 },
  { id: 3, task: "Track my order",              score: 2.4, benchmark: 2.8 },
  { id: 4, task: "Initiate a return",            score: 3.9, benchmark: 3.5 },
  { id: 5, task: "Reach customer support",       score: 4.1, benchmark: 3.8 },
  { id: 6, task: "Apply coupon code",            score: 2.1, benchmark: 2.3 },
  { id: 7, task: "Change delivery address",      score: 3.6, benchmark: 3.4 },
  { id: 8, task: "Cancel an order",              score: 3.2, benchmark: 3.6 },
];

// ── Computed NPS ──────────────────────────────────────────────────────────────
export const computeNPS = (responses = NPS_RESPONSES) => {
  const total      = responses.length;
  const promoters  = responses.filter(r => r.score >= 9).length;
  const detractors = responses.filter(r => r.score <= 6).length;
  const nps        = Math.round(((promoters - detractors) / total) * 100);
  return {
    nps,
    promoters,
    passives:   total - promoters - detractors,
    detractors,
    total,
    promoterPct:  Math.round((promoters  / total) * 100),
    passivePct:   Math.round(((total - promoters - detractors) / total) * 100),
    detractorPct: Math.round((detractors / total) * 100),
    // Industry benchmark: Bain & Company Indian E-commerce NPS 2024 avg = 42
    benchmark: 42,
    aboveBenchmark: nps > 42,
  };
};

// ── Computed avg CSAT ─────────────────────────────────────────────────────────
export const computeCSAT = (responses = CSAT_RESPONSES) => {
  const avg = responses.reduce((s, r) => s + r.score, 0) / responses.length;
  return parseFloat(avg.toFixed(2));
};

// ── NPS by category ───────────────────────────────────────────────────────────
export const npsByCategory = (responses = NPS_RESPONSES) => {
  const cats = [...new Set(responses.map(r => r.category))];
  return cats.map(cat => {
    const catR       = responses.filter(r => r.category === cat);
    const promoters  = catR.filter(r => r.score >= 9).length;
    const detractors = catR.filter(r => r.score <= 6).length;
    return {
      category: cat,
      nps:      Math.round(((promoters - detractors) / catR.length) * 100),
      count:    catR.length,
    };
  }).sort((a, b) => b.nps - a.nps);
};

// ── NPS by channel ────────────────────────────────────────────────────────────
export const npsByChannel = (responses = NPS_RESPONSES) => {
  const channels = [...new Set(responses.map(r => r.channel))];
  return channels.map(ch => {
    const chR        = responses.filter(r => r.channel === ch);
    const promoters  = chR.filter(r => r.score >= 9).length;
    const detractors = chR.filter(r => r.score <= 6).length;
    return {
      channel:  ch,
      nps:      Math.round(((promoters - detractors) / chR.length) * 100),
      count:    chR.length,
    };
  }).sort((a, b) => b.nps - a.nps);
};
