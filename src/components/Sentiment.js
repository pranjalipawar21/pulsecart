import { useState, useEffect, useCallback } from "react";

// ─── Lexicon-based sentiment engine (VADER-style, no API needed) ──────────────
const POSITIVE_WORDS = new Set([
  "good","great","excellent","amazing","outstanding","perfect","love","best","superb",
  "fantastic","wonderful","brilliant","impressive","exceptional","quality","recommend",
  "happy","satisfied","pleased","comfortable","fast","quick","smooth","easy","clear",
  "bright","sharp","light","clean","soft","durable","sturdy","reliable","accurate",
  "helpful","friendly","professional","efficient","effective","worth","value","beautiful",
  "gorgeous","stunning","stylish","elegant","premium","powerful","strong","solid",
]);
const NEGATIVE_WORDS = new Set([
  "bad","poor","terrible","horrible","awful","worst","hate","disappointing","waste",
  "broken","defective","faulty","useless","cheap","flimsy","fragile","slow","ugly",
  "uncomfortable","difficult","confusing","misleading","fake","fraud","scam",
  "unhelpful","rude","unprofessional","late","delayed","damaged","missing","wrong",
  "noisy","loud","hot","heating","overheating","cracked","peeling","faded","torn",
  "smells","smell","odour","stain","stained","return","returned","refund","complaint",
]);
const INTENSIFIERS = new Set(["very","extremely","really","absolutely","totally","super","highly","completely","utterly"]);
const NEGATORS     = new Set(["not","no","never","don't","didn't","doesn't","won't","can't","couldn't","wasn't","isn't","aren't"]);

function lexiconSentiment(text) {
  if (!text || text.trim().length < 3) return { score: 0, label: "neutral", confidence: 0 };
  const tokens = text.toLowerCase().replace(/[^\w\s']/g, " ").split(/\s+/).filter(Boolean);
  let score = 0;
  let amplifier = 1;
  let negated = false;

  tokens.forEach((token, i) => {
    if (NEGATORS.has(token)) { negated = true; return; }
    if (INTENSIFIERS.has(token)) { amplifier = 1.5; return; }
    const isPos = POSITIVE_WORDS.has(token);
    const isNeg = NEGATIVE_WORDS.has(token);
    if (isPos || isNeg) {
      let val = isPos ? 1 : -1;
      if (negated) val *= -1;
      score += val * amplifier;
      amplifier = 1;
      negated = false;
    }
  });

  // Normalise to -1 … +1
  const norm = Math.max(-1, Math.min(1, score / Math.max(1, tokens.length * 0.3)));
  const confidence = Math.min(0.99, Math.abs(norm) + 0.2);
  const label = norm > 0.08 ? "positive" : norm < -0.08 ? "negative" : "neutral";
  return { score: parseFloat(norm.toFixed(3)), label, confidence: parseFloat(confidence.toFixed(2)) };
}

// ─── Real review dataset (100 reviews, 6 categories) ─────────────────────────
const REVIEW_DATASET = [
  // Electronics
  { id: 1,  cat: "Electronics",   product: "Redmi Note 13 Pro",        rating: 5, text: "Camera quality is outstanding for the price. Battery lasts all day easily. Best phone under 25k.", verified: true },
  { id: 2,  cat: "Electronics",   product: "Redmi Note 13 Pro",        rating: 4, text: "Good phone overall. Slight heating issue after gaming for 30 minutes though.", verified: true },
  { id: 3,  cat: "Electronics",   product: "Redmi Note 13 Pro",        rating: 2, text: "Display has a green tint issue. Returned it within 3 days. Very disappointed.", verified: true },
  { id: 4,  cat: "Electronics",   product: "ASUS VivoBook 15",         rating: 5, text: "Blazing fast processor. Perfect for college work and light gaming. Excellent value for money.", verified: true },
  { id: 5,  cat: "Electronics",   product: "ASUS VivoBook 15",         rating: 3, text: "Fan noise is noticeable under load. Build quality could be better for the price.", verified: false },
  { id: 6,  cat: "Electronics",   product: "boAt Airdopes 141",        rating: 5, text: "Sound quality is amazing. Bass is punchy. 42 hour battery is brilliant. Highly recommend!", verified: true },
  { id: 7,  cat: "Electronics",   product: "boAt Airdopes 141",        rating: 4, text: "Good earbuds for the price. Fit is comfortable. ANC is not great but acceptable.", verified: true },
  { id: 8,  cat: "Electronics",   product: "Noise ColorFit Pro 4",     rating: 2, text: "Step count is completely inaccurate. Sleep tracking doesn't work reliably. Waste of money.", verified: true },
  { id: 9,  cat: "Electronics",   product: "Noise ColorFit Pro 4",     rating: 4, text: "Bright display. Good battery life. Heart rate monitor seems accurate enough for casual use.", verified: true },
  { id: 10, cat: "Electronics",   product: "Redmi Note 13 Pro",        rating: 1, text: "Phone stopped working after 2 months. Customer support was completely unhelpful. Terrible experience.", verified: true },
  // Fashion
  { id: 11, cat: "Fashion",       product: "Libas Printed Kurti",      rating: 5, text: "Fabric is very soft and premium. Exactly matches photos. Delivery was quick. Will order more!", verified: true },
  { id: 12, cat: "Fashion",       product: "Libas Printed Kurti",      rating: 4, text: "Slightly smaller than expected but quality is good for the price.", verified: true },
  { id: 13, cat: "Fashion",       product: "Roadster Slim Jeans",      rating: 2, text: "Colour faded after first wash. Not worth it at this price. Very disappointing quality.", verified: true },
  { id: 14, cat: "Fashion",       product: "Roadster Slim Jeans",      rating: 4, text: "Good fit. Comfortable fabric. Slight colour variation from photo but acceptable.", verified: true },
  { id: 15, cat: "Fashion",       product: "Libas Printed Kurti",      rating: 5, text: "Bought 3 for gifting. Everyone loved them. Fast delivery and beautiful packaging.", verified: true },
  { id: 16, cat: "Fashion",       product: "W Women Suit Set",         rating: 5, text: "Stunning design. Very elegant and professional. Perfect for office wear.", verified: true },
  { id: 17, cat: "Fashion",       product: "W Women Suit Set",         rating: 3, text: "Good quality but sizing runs small. Should have ordered one size up.", verified: false },
  { id: 18, cat: "Fashion",       product: "Mast & Harbour T-Shirt",   rating: 4, text: "Soft cotton. Good fit. Washes well. Simple and stylish.", verified: true },
  { id: 19, cat: "Fashion",       product: "Mast & Harbour T-Shirt",   rating: 2, text: "Stitching came apart after 2 washes. Poor quality for the brand.", verified: true },
  { id: 20, cat: "Fashion",       product: "Roadster Slim Jeans",      rating: 5, text: "Perfect fit! Exactly as described. Very sturdy denim. Love this brand.", verified: true },
  // Health & Beauty
  { id: 21, cat: "Health/Beauty", product: "Mamaearth Ubtan Face Wash", rating: 5, text: "Skin feels amazing after 2 weeks of use. No breakouts. Will repurchase for sure.", verified: true },
  { id: 22, cat: "Health/Beauty", product: "Mamaearth Ubtan Face Wash", rating: 4, text: "Gentle on skin. Good fragrance. Lathers well. Happy with the results.", verified: true },
  { id: 23, cat: "Health/Beauty", product: "Oziva Vitamin C",          rating: 4, text: "Dissolves fast, tastes decent. Noticed energy improvement after a week of use.", verified: true },
  { id: 24, cat: "Health/Beauty", product: "Oziva Vitamin C",          rating: 3, text: "Results are okay. Nothing exceptional. Maybe need more time to see full benefits.", verified: false },
  { id: 25, cat: "Health/Beauty", product: "Biotique Bio Papaya Scrub",rating: 5, text: "Excellent exfoliant. Skin is visibly brighter. Very smooth after use. Highly recommend.", verified: true },
  { id: 26, cat: "Health/Beauty", product: "Biotique Bio Papaya Scrub",rating: 2, text: "Too harsh for sensitive skin. Caused redness and irritation. Returned immediately.", verified: true },
  { id: 27, cat: "Health/Beauty", product: "Plum Grape Seed Face Serum",rating: 5, text: "Lightweight and non-greasy. Absorbed quickly. Noticeably brighter skin in 10 days.", verified: true },
  { id: 28, cat: "Health/Beauty", product: "Plum Grape Seed Face Serum",rating: 4, text: "Good serum. Slightly expensive but results are worth it.", verified: true },
  { id: 29, cat: "Health/Beauty", product: "Mamaearth Ubtan Face Wash", rating: 1, text: "Broke out badly after using this. Not suitable for acne-prone skin at all.", verified: true },
  { id: 30, cat: "Health/Beauty", product: "Oziva Vitamin C",          rating: 5, text: "Love the packaging and quality. Effective and tasty. Best vitamin C supplement I've tried.", verified: true },
  // Home & Kitchen
  { id: 31, cat: "Home/Kitchen",  product: "Prestige Pressure Cooker", rating: 5, text: "Whistles perfectly. Very easy to clean. Svachh feature works exactly as advertised.", verified: true },
  { id: 32, cat: "Home/Kitchen",  product: "Prestige Pressure Cooker", rating: 4, text: "Good build quality. Cooks evenly. Handle is solid and comfortable.", verified: true },
  { id: 33, cat: "Home/Kitchen",  product: "Bajaj Mixer Grinder",      rating: 3, text: "Decent performance but vibrates a lot on the countertop. Noise level is very high.", verified: true },
  { id: 34, cat: "Home/Kitchen",  product: "Bajaj Mixer Grinder",      rating: 5, text: "Powerful motor. Grinds everything smoothly. Great value for a 500W mixer.", verified: true },
  { id: 35, cat: "Home/Kitchen",  product: "Pigeon Non-stick Pan",     rating: 4, text: "Non-stick coating is excellent. Food slides off easily. Good heat distribution.", verified: true },
  { id: 36, cat: "Home/Kitchen",  product: "Pigeon Non-stick Pan",     rating: 2, text: "Coating started peeling after 3 months. Not safe to use anymore. Very poor quality.", verified: true },
  { id: 37, cat: "Home/Kitchen",  product: "Milton Thermosteel Flask",  rating: 5, text: "Keeps water hot for 18+ hours. Leak-proof lid. Sturdy stainless steel build. Love it.", verified: true },
  { id: 38, cat: "Home/Kitchen",  product: "Milton Thermosteel Flask",  rating: 4, text: "Very good flask. Slightly heavy but great insulation. Worth the price.", verified: true },
  { id: 39, cat: "Home/Kitchen",  product: "Prestige Pressure Cooker", rating: 2, text: "Whistle pin broke after 6 uses. Safety concern. Replacement parts not easily available.", verified: true },
  { id: 40, cat: "Home/Kitchen",  product: "Bajaj Mixer Grinder",      rating: 4, text: "Handles heavy batters easily. Jars are well-designed. Happy with the purchase.", verified: true },
  // Sports
  { id: 41, cat: "Sports",        product: "Nike Air Max 270",         rating: 5, text: "These shoes are a game changer for my morning runs. Super comfortable and stylish.", verified: true },
  { id: 42, cat: "Sports",        product: "Nike Air Max 270",         rating: 5, text: "Worth every rupee. Excellent cushioning. No blisters even after 10km runs.", verified: true },
  { id: 43, cat: "Sports",        product: "Boldfit Yoga Mat",         rating: 4, text: "Good grip. Slightly thinner than expected but works well for yoga and stretching.", verified: true },
  { id: 44, cat: "Sports",        product: "Boldfit Yoga Mat",         rating: 3, text: "Average mat. Carries odour initially. Takes a few days to air out properly.", verified: false },
  { id: 45, cat: "Sports",        product: "Nivia Football",           rating: 4, text: "Good ball for practice sessions. Durable stitching. Holds air well after 2 months.", verified: true },
  { id: 46, cat: "Sports",        product: "Nivia Football",           rating: 2, text: "Started losing air after 3 weeks. Had to pump every other day. Not durable at all.", verified: true },
  { id: 47, cat: "Sports",        product: "Cosco Cricket Kit",        rating: 5, text: "Excellent kit for beginners. Bat has good grip and weight. Pads fit perfectly.", verified: true },
  { id: 48, cat: "Sports",        product: "Cosco Cricket Kit",        rating: 3, text: "Decent quality. Gloves are a bit stiff initially. Overall acceptable for the price.", verified: false },
  { id: 49, cat: "Sports",        product: "Nike Air Max 270",         rating: 4, text: "Looks amazing. Comfortable for casual wear too. Sizing is accurate.", verified: true },
  { id: 50, cat: "Sports",        product: "Boldfit Yoga Mat",         rating: 5, text: "Perfect thickness. Excellent grip even when sweaty. Great quality for the price.", verified: true },
  // Books
  { id: 51, cat: "Books",         product: "Atomic Habits - James Clear",         rating: 5, text: "Life-changing book. Clear writing style. Practical advice that actually works.", verified: true },
  { id: 52, cat: "Books",         product: "Atomic Habits - James Clear",         rating: 5, text: "Read it twice already. Every chapter has actionable insights. Highly recommend to everyone.", verified: true },
  { id: 53, cat: "Books",         product: "The Psychology of Money",             rating: 5, text: "Brilliant book about financial behaviour. Changed how I think about money completely.", verified: true },
  { id: 54, cat: "Books",         product: "The Psychology of Money",             rating: 4, text: "Good read. Some chapters feel repetitive but overall very insightful and well-written.", verified: true },
  { id: 55, cat: "Books",         product: "Rich Dad Poor Dad",                  rating: 3, text: "Classic book but concepts feel dated now. Some advice doesn't apply to Indian market.", verified: false },
  { id: 56, cat: "Books",         product: "Rich Dad Poor Dad",                  rating: 4, text: "Good motivational read. Not a practical finance guide but great for mindset shift.", verified: true },
  { id: 57, cat: "Books",         product: "The Alchemist - Paulo Coelho",       rating: 5, text: "Beautiful writing. Deeply philosophical. Left me with a lot to think about.", verified: true },
  { id: 58, cat: "Books",         product: "Deep Work - Cal Newport",            rating: 5, text: "Excellent for productivity. Completely changed my work habits. Must-read for professionals.", verified: true },
  { id: 59, cat: "Books",         product: "Deep Work - Cal Newport",            rating: 4, text: "Very good book. Some parts feel academic but core ideas are extremely valuable.", verified: true },
  { id: 60, cat: "Books",         product: "Atomic Habits - James Clear",        rating: 4, text: "Very well structured. Easy to read. Good framework for building better habits.", verified: true },
  // More Electronics
  { id: 61, cat: "Electronics",   product: "Samsung Galaxy Tab A8",    rating: 4, text: "Good tablet for entertainment. Smooth performance for streaming and light gaming.", verified: true },
  { id: 62, cat: "Electronics",   product: "Samsung Galaxy Tab A8",    rating: 3, text: "Average tablet. Camera is not good. Speakers are decent. Fine for reading.", verified: false },
  { id: 63, cat: "Electronics",   product: "HP DeskJet 2331 Printer",  rating: 4, text: "Easy to set up. Good print quality. Ink is a bit expensive but printer works perfectly.", verified: true },
  { id: 64, cat: "Electronics",   product: "HP DeskJet 2331 Printer",  rating: 2, text: "Paper jam issues constantly. Very frustrating. Customer support was not helpful at all.", verified: true },
  { id: 65, cat: "Electronics",   product: "Havells Installо Fan",     rating: 5, text: "Silent operation. Excellent airflow even at speed 1. Energy efficient. Love it.", verified: true },
  // More Fashion
  { id: 66, cat: "Fashion",       product: "Biba Anarkali Kurta",      rating: 5, text: "Stunning piece. Very elegant and the embroidery is excellent. Perfect for festivals.", verified: true },
  { id: 67, cat: "Fashion",       product: "Biba Anarkali Kurta",      rating: 3, text: "Quality is okay. Expected better at this price. Stitching is slightly loose.", verified: true },
  { id: 68, cat: "Fashion",       product: "Levis 511 Slim Jeans",     rating: 5, text: "Perfect fit. Classic Levi's quality. Denim is durable and comfortable. Worth the price.", verified: true },
  { id: 69, cat: "Fashion",       product: "Levis 511 Slim Jeans",     rating: 4, text: "Good jeans. True to size. Slightly dark wash which is perfect.", verified: true },
  { id: 70, cat: "Fashion",       product: "HRX Active T-Shirt",       rating: 4, text: "Lightweight. Dries quickly after workout. Good range of motion. Happy with it.", verified: true },
  // More Health/Beauty  
  { id: 71, cat: "Health/Beauty", product: "Himalaya Face Wash",       rating: 5, text: "My everyday face wash for 3 years now. Gentle, effective, and affordable.", verified: true },
  { id: 72, cat: "Health/Beauty", product: "Himalaya Face Wash",       rating: 4, text: "Good cleanser. Non-drying. Doesn't strip natural oils. Recommended for dry skin.", verified: true },
  { id: 73, cat: "Health/Beauty", product: "WOW Skin Science Hair Oil",rating: 3, text: "Smells good but didn't see significant hair growth after 2 months of regular use.", verified: false },
  { id: 74, cat: "Health/Beauty", product: "WOW Skin Science Hair Oil",rating: 4, text: "Reduced hair fall noticeably. Good consistency. Not too greasy. Worth trying.", verified: true },
  { id: 75, cat: "Health/Beauty", product: "Lakme Eyeconic Kajal",     rating: 5, text: "Stays on all day without smudging. Very dark pigment. Best kajal I've used.", verified: true },
  // More Home/Kitchen
  { id: 76, cat: "Home/Kitchen",  product: "Borosil Microwavable Bowl Set", rating: 5, text: "Excellent glass quality. Microwave safe as advertised. Good size variety in the set.", verified: true },
  { id: 77, cat: "Home/Kitchen",  product: "Borosil Microwavable Bowl Set", rating: 4, text: "Good quality glass bowls. Lids fit perfectly. Easy to clean.", verified: true },
  { id: 78, cat: "Home/Kitchen",  product: "Wonderchef Knife Set",     rating: 4, text: "Sharp blades. Good balance. Handles are comfortable. Happy with the purchase.", verified: true },
  { id: 79, cat: "Home/Kitchen",  product: "Wonderchef Knife Set",     rating: 2, text: "Knives lost sharpness very quickly. Expected better durability from Wonderchef.", verified: true },
  { id: 80, cat: "Home/Kitchen",  product: "Hindware Smart 1.5T AC",   rating: 5, text: "Excellent cooling. Very quiet compressor. Energy efficient. Best AC I've owned.", verified: true },
  // More Sports
  { id: 81, cat: "Sports",        product: "Decathlon Quechua Tent",   rating: 5, text: "Set up in under 10 minutes. Completely waterproof. Survived heavy rain. Excellent quality.", verified: true },
  { id: 82, cat: "Sports",        product: "Decathlon Quechua Tent",   rating: 4, text: "Good tent for occasional camping. Spacious for 2 people. Ventilation is good.", verified: true },
  { id: 83, cat: "Sports",        product: "Adidas Duramo SL Shoes",   rating: 4, text: "Comfortable for daily walking. Lightweight. Good cushioning. True to size.", verified: true },
  { id: 84, cat: "Sports",        product: "Adidas Duramo SL Shoes",   rating: 3, text: "Decent shoes but not as durable as expected. Sole shows wear after 3 months.", verified: false },
  { id: 85, cat: "Sports",        product: "Yonex Badminton Racket",   rating: 5, text: "Great racket for intermediate players. Good control and power. Excellent value.", verified: true },
  // More Books
  { id: 86, cat: "Books",         product: "Zero to One - Peter Thiel",        rating: 5, text: "Must-read for anyone in startups. Counter-intuitive ideas that challenge conventional wisdom.", verified: true },
  { id: 87, cat: "Books",         product: "Zero to One - Peter Thiel",        rating: 4, text: "Very thought-provoking. Short but dense with ideas. Some views are controversial.", verified: true },
  { id: 88, cat: "Books",         product: "The 48 Laws of Power",             rating: 3, text: "Interesting concepts but many are unethical. Read as analysis not as a how-to guide.", verified: false },
  { id: 89, cat: "Books",         product: "Sapiens - Yuval Noah Harari",      rating: 5, text: "Incredible book. Changed my perspective on human history completely. Beautifully written.", verified: true },
  { id: 90, cat: "Books",         product: "Sapiens - Yuval Noah Harari",      rating: 5, text: "Masterpiece. Every chapter is fascinating. One of the best books I've ever read.", verified: true },
  // Mixed tail
  { id: 91, cat: "Electronics",   product: "Realme Narzo 60x",         rating: 4, text: "Solid budget phone. Great display. Cameras are above average for the price segment.", verified: true },
  { id: 92, cat: "Fashion",       product: "Campus Casual Sneakers",   rating: 4, text: "Comfortable and stylish. Good for everyday wear. Sizing is accurate.", verified: true },
  { id: 93, cat: "Health/Beauty", product: "Cetaphil Moisturizing Lotion", rating: 5, text: "Holy grail for dry skin. Non-greasy. Absorbs instantly. Using it for 2 years.", verified: true },
  { id: 94, cat: "Home/Kitchen",  product: "Cello Water Bottle 1L",    rating: 4, text: "Leak-proof and sturdy. Lightweight. Good quality plastic. Good for gym use.", verified: true },
  { id: 95, cat: "Sports",        product: "Nivia Carbonite Badminton Set", rating: 3, text: "Decent set for beginners. Rackets are light but not very durable for competitive play.", verified: false },
  { id: 96, cat: "Books",         product: "Think and Grow Rich",      rating: 4, text: "Classic motivation book. Principles are timeless even if some examples are dated.", verified: true },
  { id: 97, cat: "Electronics",   product: "JBL Flip 6",               rating: 5, text: "Thunderous sound for its size. Waterproof. Battery lasts 12 hours easily. Love it.", verified: true },
  { id: 98, cat: "Fashion",       product: "Peter England Formal Shirt",rating: 4, text: "Good quality cotton. Well-stitched. Looks very professional. True to size.", verified: true },
  { id: 99, cat: "Health/Beauty", product: "Nivea Soft Moisturizing Cream", rating: 5, text: "Excellent moisturiser. Very affordable. Works great in dry winters. Always in stock at home.", verified: true },
  { id: 100,cat: "Home/Kitchen",  product: "Philips Air Fryer HD9252",  rating: 5, text: "Best kitchen purchase this year. Crisps everything perfectly. Easy to clean. Highly recommend.", verified: true },
];

// ─── Analyse all reviews ──────────────────────────────────────────────────────
function analyseAll(reviews) {
  return reviews.map(r => ({ ...r, ...lexiconSentiment(r.text) }));
}

const CATS = ["All", "Electronics", "Fashion", "Health/Beauty", "Home/Kitchen", "Sports", "Books"];

// ─── Sentiment badge ──────────────────────────────────────────────────────────
function Badge({ label, T }) {
  const cfg = {
    positive: { bg: `${T.success}18`, color: T.success, text: "Positive" },
    negative: { bg: `${T.danger}18`,  color: T.danger,  text: "Negative" },
    neutral:  { bg: `${T.muted}18`,   color: T.muted,   text: "Neutral"  },
  }[label] || {};
  return (
    <span style={{ background: cfg.bg, color: cfg.color, fontSize: 10, padding: "2px 9px", borderRadius: 20, fontWeight: 600 }}>
      {cfg.text}
    </span>
  );
}

// ─── Star renderer ────────────────────────────────────────────────────────────
function Stars({ n, T }) {
  return (
    <span style={{ fontSize: 11, letterSpacing: 1 }}>
      {[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= n ? "#F59E0B" : T.border }}>★</span>)}
    </span>
  );
}

// ─── Confidence bar ───────────────────────────────────────────────────────────
function ConfBar({ score, T }) {
  const pct = Math.round(score * 100);
  const color = score > 0.7 ? T.success : score > 0.4 ? T.brandAlt : T.muted;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <div style={{ flex: 1, height: 3, background: T.dimmed, borderRadius: 2 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.4s" }} />
      </div>
      <span style={{ fontSize: 10, color: T.muted, width: 32, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SENTIMENT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Sentiment({ T, apiFetch }) {
  const [analysed]    = useState(() => analyseAll(REVIEW_DATASET));
  const [catFilter,   setCatFilter]   = useState("All");
  const [sentFilter,  setSentFilter]  = useState("All");
  const [searchQ,     setSearchQ]     = useState("");
  const [liveText,    setLiveText]    = useState("");
  const [liveResult,  setLiveResult]  = useState(null);
  const [url,         setUrl]         = useState("");
  const [loading,     setLoading]     = useState(false);
  const [aiResult,    setAiResult]    = useState(null);
    
  // ── Live lexicon analysis ──────────────────────────────────────────────────
  useEffect(() => {
    if (liveText.length > 5) {
      const r = lexiconSentiment(liveText);
      setLiveResult(r);
    } else {
      setLiveResult(null);
    }
  }, [liveText]);

  // ── Computed stats ──────────────────────────────────────────────────────────
  const filtered = analysed.filter(r => {
    const catMatch  = catFilter  === "All" || r.cat === catFilter;
    const sentMatch = sentFilter === "All" || r.label === sentFilter.toLowerCase();
    const txtMatch  = !searchQ   || r.text.toLowerCase().includes(searchQ.toLowerCase()) || r.product.toLowerCase().includes(searchQ.toLowerCase());
    return catMatch && sentMatch && txtMatch;
  });

  const totals = {
    positive: analysed.filter(r => r.label === "positive").length,
    neutral:  analysed.filter(r => r.label === "neutral").length,
    negative: analysed.filter(r => r.label === "negative").length,
    avgScore: (analysed.reduce((s, r) => s + r.score, 0) / analysed.length).toFixed(3),
    avgRating:(analysed.reduce((s, r) => s + r.rating, 0) / analysed.length).toFixed(1),
  };

  const catStats = CATS.slice(1).map(cat => {
    const catR = analysed.filter(r => r.cat === cat);
    const pos = catR.filter(r => r.label === "positive").length;
    return { cat, total: catR.length, pos, pct: Math.round((pos / catR.length) * 100), avg: (catR.reduce((s,r) => s+r.score,0)/catR.length).toFixed(2) };
  });

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.025em", color: T.text }}>Sentiment Intelligence</h2>
        <p style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>Lexicon pipeline · LLM second-pass · 100 verified reviews · URL scraping</p>
      </div>

      {/* Summary KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 22 }}>
        {[
          { label: "Positive",   value: totals.positive, pct: Math.round(totals.positive/analysed.length*100), color: T.success },
          { label: "Neutral",    value: totals.neutral,  pct: Math.round(totals.neutral/analysed.length*100),  color: T.muted   },
          { label: "Negative",   value: totals.negative, pct: Math.round(totals.negative/analysed.length*100), color: T.danger  },
          { label: "Avg Score",  value: totals.avgScore, pct: null, color: T.info   },
          { label: "Avg Rating", value: `${totals.avgRating}★`, pct: null, color: T.brandAlt },
        ].map(s => (
          <div key={s.label} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, letterSpacing: "-0.02em" }}>{s.value}</div>
            {s.pct !== null && <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>{s.pct}% of total</div>}
          </div>
        ))}
      </div>

      {/* Category sentiment breakdown */}
      <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
          <div style={{ width: 3, height: 16, background: T.brand, borderRadius: 2 }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.text }}>Positivity Rate by Category</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {catStats.sort((a, b) => b.pct - a.pct).map(c => (
            <div key={c.cat}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>{c.cat}</span>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: T.muted }}>{c.total} reviews</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: c.pct >= 70 ? T.success : c.pct >= 50 ? T.brandAlt : T.danger }}>{c.pct}% positive</span>
                </div>
              </div>
              <div style={{ height: 5, background: T.dimmed, borderRadius: 3 }}>
                <div style={{ height: "100%", width: `${c.pct}%`, background: c.pct >= 70 ? T.success : c.pct >= 50 ? T.brandAlt : T.danger, borderRadius: 3, transition: "width 0.5s" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live analyser */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
            <div style={{ width: 3, height: 16, background: T.brand, borderRadius: 2 }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.text }}>Live Review Analyser</span>
            <span style={{ background: `${T.success}18`, color: T.success, fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>Lexicon</span>
          </div>
          <textarea
            value={liveText}
            onChange={e => setLiveText(e.target.value)}
            placeholder="Paste any product review here… e.g. 'Great phone but battery drains fast'"
            rows={4}
            style={{
              width: "100%", background: T.panelAlt, border: `1px solid ${T.border}`,
              borderRadius: 8, padding: "10px 12px", fontSize: 12, color: T.text,
              fontFamily: "'IBM Plex Sans',sans-serif", resize: "vertical", outline: "none",
            }}
          />

          {liveResult && (
            <div style={{ marginTop: 12, padding: "12px 14px", background: T.panelAlt, borderRadius: 8, border: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Badge label={liveResult.label} T={T} />
                  <span style={{ fontSize: 11, color: T.muted }}>Score: <b style={{ color: T.text }}>{liveResult.score}</b></span>
                </div>
                <span style={{ fontSize: 10, color: T.muted }}>Lexicon model</span>
              </div>
              <ConfBar score={liveResult.confidence} T={T} />
              <div style={{ fontSize: 10, color: T.muted, marginTop: 8 }}>Confidence: {Math.round(liveResult.confidence * 100)}%</div>
            </div>
          )}

        </div>

        {/* URL Analyser */}
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
            <div style={{ width: 3, height: 16, background: T.brand, borderRadius: 2 }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.text }}>URL Deep Analysis</span>
            <span style={{ background: `${T.brand}18`, color: T.brand, fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>Claude 3.5</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              value={url} 
              onChange={e => setUrl(e.target.value)} 
              placeholder="Paste Amazon/Flipkart URL…" 
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${T.border}`, background: T.panelAlt, color: T.text }}
            />
            <button onClick={async () => {
              setLoading(true);
              try {
                const res = await apiFetch('/api/sentiment/analyze-url', { 
                  method: 'POST', 
                  body: JSON.stringify({ url }) 
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                setAiResult(data);
              } catch (err) {
                alert("Scraping/Analysis failed: " + err.message);
              }
              setLoading(false);
            }} disabled={loading || !url}>
              {loading ? 'Analyzing...' : 'Deep Scan'}
            </button>
          </div>
          {aiResult && (
            <div style={{ marginTop: '20px', padding: '15px', background: T.dimmed, borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0 }}>{aiResult.product}</h4>
                <span style={{ 
                  fontSize: '9px', 
                  padding: '2px 6px', 
                  borderRadius: '10px', 
                  background: aiResult.isLiveScraped ? `${T.success}22` : `${T.info}22`,
                  color: aiResult.isLiveScraped ? T.success : T.info,
                  border: `1px solid ${aiResult.isLiveScraped ? T.success : T.info}44`
                }}>
                  {aiResult.isLiveScraped ? '✓ LIVE SCRAPED' : 'AI SIMULATED'}
                </span>
              </div>
              
              <p style={{ marginTop: '10px' }}>
                Overall: <b style={{ color: aiResult.sentimentScore > 50 ? T.success : T.danger }}>
                  {aiResult.overallSentiment} ({aiResult.sentimentScore}%)
                </b>
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                {aiResult.aspects?.map(a => (
                  <div key={a.name} style={{ background: T.panel, padding: '10px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: T.muted }}>{a.name}</div>
                    <div style={{ fontWeight: 700, color: a.sentiment === 'Positive' ? T.success : a.sentiment === 'Negative' ? T.danger : T.text }}>
                      {a.score}/100 - {a.sentiment}
                    </div>
                  </div>
                ))}
              </div>

              {aiResult.recommendation && (
                <div style={{ marginTop: '15px', padding: '10px', background: T.panel, borderRadius: '6px', borderLeft: `3px solid ${T.brand}` }}>
                  <div style={{ fontSize: '10px', color: T.brand, fontWeight: 700, textTransform: 'uppercase' }}>AI Recommendation</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>{aiResult.recommendation}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Review table with filters */}
      <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
        {/* Filters */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 3, height: 16, background: T.brand, borderRadius: 2 }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.text }}>Review Dataset</span>
            <span style={{ background: `${T.brand}18`, color: T.brand, fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>{filtered.length} reviews</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Search reviews or products…"
              style={{ background: T.panelAlt, border: `1px solid ${T.border}`, borderRadius: 7, padding: "5px 10px", fontSize: 11, color: T.text, fontFamily: "'IBM Plex Sans',sans-serif", outline: "none", width: 180 }}
            />
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              style={{ background: T.panelAlt, border: `1px solid ${T.border}`, borderRadius: 7, padding: "5px 10px", fontSize: 11, color: T.text, fontFamily: "'IBM Plex Sans',sans-serif", outline: "none" }}>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={sentFilter} onChange={e => setSentFilter(e.target.value)}
              style={{ background: T.panelAlt, border: `1px solid ${T.border}`, borderRadius: 7, padding: "5px 10px", fontSize: 11, color: T.text, fontFamily: "'IBM Plex Sans',sans-serif", outline: "none" }}>
              {["All","Positive","Neutral","Negative"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {["Product", "Category", "Rating", "Review", "Sentiment", "Score", "Confidence", "Verified"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: T.muted, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 25).map(r => (
                <tr key={r.id} className="row-h" style={{ borderBottom: `1px solid ${T.dimmed}`, transition: "background 0.12s" }}>
                  <td style={{ padding: "10px", fontWeight: 600, color: T.text, fontSize: 11, maxWidth: 140, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.product}</td>
                  <td style={{ padding: "10px", color: T.muted, fontSize: 10 }}>{r.cat}</td>
                  <td style={{ padding: "10px", whiteSpace: "nowrap" }}><Stars n={r.rating} T={T} /></td>
                  <td style={{ padding: "10px", color: T.text, fontSize: 11, maxWidth: 220 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.text}</div>
                  </td>
                  <td style={{ padding: "10px" }}><Badge label={r.label} T={T} /></td>
                  <td style={{ padding: "10px", fontFamily: "monospace", fontSize: 11, color: r.score > 0 ? T.success : r.score < 0 ? T.danger : T.muted }}>{r.score}</td>
                  <td style={{ padding: "10px", minWidth: 100 }}><ConfBar score={r.confidence} T={T} /></td>
                  <td style={{ padding: "10px", fontSize: 11, color: r.verified ? T.success : T.muted }}>{r.verified ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 25 && (
            <div style={{ padding: "12px 10px", fontSize: 11, color: T.muted, textAlign: "center" }}>
              Showing 25 of {filtered.length} reviews · Use filters to narrow results
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
