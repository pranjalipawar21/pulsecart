import { useState, useEffect } from "react";

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
  // ... (rest of REVIEW_DATASET is kept as is)
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
    
  useEffect(() => {
    if (liveText.length > 5) {
      const r = lexiconSentiment(liveText);
      setLiveResult(r);
    } else {
      setLiveResult(null);
    }
  }, [liveText]);

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

  const analyzeUrl = async () => {
    setLoading(true);
    setAiResult(null);
    try {
      const res = await apiFetch('/api/sentiment/analyze-url', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }) 
      });
      const data = await res.json();
      setAiResult(data);
    } catch (err) {
      alert("Scraping/Analysis failed: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.025em", color: T.text }}>Sentiment Intelligence</h2>
        <p style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>Real-time backend scraper · Source Transparency · MySQL Scanned Logs</p>
      </div>

      {/* KPI Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 22 }}>
        {[
          { label: "Positive",   value: totals.positive, color: T.success },
          { label: "Neutral",    value: totals.neutral,  color: T.muted   },
          { label: "Negative",   value: totals.negative, color: T.danger  },
          { label: "Avg Score",  value: totals.avgScore, color: T.info   },
          { label: "Avg Rating", value: `${totals.avgRating}★`, color: T.brandAlt },
        ].map(s => (
          <div key={s.label} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, letterSpacing: "-0.02em" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* URL Analyser */}
      <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24, marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
          <div style={{ width: 3, height: 16, background: T.brand, borderRadius: 2 }} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.text }}>Product URL Deep Analysis</span>
          <span style={{ background: T.success+'22', color: T.success, fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>MYSQL LOGGED</span>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <input 
            value={url} 
            onChange={e => setUrl(e.target.value)} 
            placeholder="Paste Amazon/Flipkart/E-com URL for real-time sentiment analysis…" 
            style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `1px solid ${T.border}`, background: T.panelAlt, color: T.text, fontSize: 13 }}
          />
          <button 
            onClick={analyzeUrl} 
            disabled={loading || !url}
            style={{ background: T.brand, color: '#fff', border: 'none', padding: '0 25px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}
          >
            {loading ? 'Scraping...' : 'Start Real-Time Analysis'}
          </button>
        </div>

        {aiResult && (
          <div style={{ marginTop: '24px', padding: '24px', background: T.dimmed, borderRadius: '12px', border: `1px solid ${T.border}`, animation: 'fadeSlide 0.4s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>{aiResult.product}</h3>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ 
                  fontSize: '10px', padding: '4px 10px', borderRadius: '20px', fontWeight: 700,
                  background: aiResult.isLiveScraped ? T.success+'22' : T.danger+'11',
                  color: aiResult.isLiveScraped ? T.success : T.danger,
                  border: `1px solid ${aiResult.isLiveScraped ? T.success : T.danger}44`
                }}>
                  {aiResult.isLiveScraped ? '✓ LIVE SCRAPED' : 'AI SIMULATED (Restricted Source)'}
                </span>
                {aiResult.isLiveScraped && <span style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '20px', fontWeight: 700, background: T.info+'22', color: T.info }}>REAL-TIME DATA</span>}
              </div>
            </div>

            {aiResult.status === "Insufficient Data" ? (
               <div style={{ textAlign: 'center', padding: '40px 0' }}>
                 <div style={{ fontSize: 40, marginBottom: 10 }}>🛡️</div>
                 <div style={{ fontWeight: 700, color: T.text }}>Scraper Restricted by Target Website</div>
                 <p style={{ fontSize: 12, color: T.muted, marginTop: 5 }}>Source policies prevented real-time extraction. LLM provided general context instead.</p>
               </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
                  <div style={{ textAlign: 'center', background: T.panel, padding: 20, borderRadius: 12 }}>
                    <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>Sentiment Score</div>
                    <div style={{ fontSize: 48, fontWeight: 800, color: aiResult.sentimentScore > 70 ? T.success : T.brandAlt }}>{aiResult.sentimentScore}%</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{aiResult.overallSentiment}</div>
                  </div>
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {aiResult.aspects?.map(a => (
                        <div key={a.name} style={{ background: T.panel, padding: '12px 16px', borderRadius: 10 }}>
                          <div style={{ fontSize: 11, color: T.muted }}>{a.name}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                            <span style={{ fontWeight: 700, color: a.sentiment === 'Positive' ? T.success : a.sentiment === 'Negative' ? T.danger : T.text }}>{a.score}/100</span>
                            <span style={{ fontSize: 9, opacity: 0.7 }}>{a.sentiment}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {aiResult.recommendation && (
                  <div style={{ marginTop: 20, padding: 15, background: T.panel, borderRadius: 10, borderLeft: `4px solid ${T.brand}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.brand, textTransform: 'uppercase' }}>Strategic Recommendation</div>
                    <p style={{ fontSize: 12.5, color: T.text, marginTop: 5, lineHeight: 1.5 }}>{aiResult.recommendation}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Review table (omitted for brevity, keep existing logic) */}
    </div>
  );
}
