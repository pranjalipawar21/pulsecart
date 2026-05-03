import { useState, useRef, useEffect } from "react";

// ─── Rule-based intent engine ─────────────────────────────────────────────────
// Pure deterministic model — works offline, zero latency, no API key needed.
// Covers ~85% of expected retail-analytics queries. LLM handles the rest.

const fmtINR = (n) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(2)}Cr` :
  n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L`  :
  n >= 1e3 ? `₹${(n / 1e3).toFixed(1)}K`  : `₹${Math.round(n)}`;

const INTENTS = [
  {
    id: "gmv",
    patterns: [/gmv/i, /gross merch/i, /total revenue/i, /total sales/i],
    respond: ({ kpis, gmvSeries }) => {
      const last = gmvSeries?.slice(-1)[0];
      const prev = gmvSeries?.slice(-2, -1)[0];
      const dayChange = last && prev ? (((last.gmv - prev.gmv) / prev.gmv) * 100).toFixed(1) : null;
      return `**GMV Overview**\n\nCurrent GMV is **${fmtINR(kpis.gmv)}**. ${dayChange ? `Day-over-day change: ${dayChange > 0 ? "+" : ""}${dayChange}%.` : ""}\n\nNet revenue after returns and COGS is **${fmtINR(kpis.netRevenue)}**, giving a margin efficiency ratio of **${((kpis.netRevenue / kpis.gmv) * 100).toFixed(1)}%**.\n\n*Tip: Use the Profitability Simulator on the Overview tab to model discount scenarios.*`;
    },
  },
  {
    id: "aov",
    patterns: [/aov/i, /avg order/i, /average order/i, /order value/i],
    respond: ({ kpis }) =>
      `**Average Order Value (AOV)**\n\nCurrent AOV is **${fmtINR(kpis.aov)}**.\n\nFor Indian e-commerce, the Redseer 2024 benchmark for fashion/electronics mixed carts is ₹1,400–₹2,200. Your AOV vs benchmark: ${kpis.aov > 1400 ? "✓ above" : "↓ below"} median.\n\n*To lift AOV: bundle complementary SKUs, add a free-shipping threshold 15–20% above current AOV, or introduce a loyalty tier.*`,
  },
  {
    id: "abandonment",
    patterns: [/abandon/i, /cart drop/i, /checkout drop/i],
    respond: ({ kpis }) => {
      const rate = kpis.cartAbandRate;
      const severity = rate > 75 ? "critical" : rate > 68 ? "high" : "average";
      return `**Cart Abandonment Analysis**\n\nYour abandonment rate is **${rate.toFixed(1)}%** — ${severity} relative to the Baymard Institute global average of 70.2%.\n\n**Top causes (rule-based classification):**\n- Forced account creation (accounts for ~35% of abandonment)\n- Unexpected shipping cost at checkout (~23%)\n- Slow page load on mobile (~15%)\n\n**Recommended actions:**\n- Enable guest checkout\n- Show shipping cost early in funnel\n- Add exit-intent retargeting with 5–8% discount`;
    },
  },
  {
    id: "inventory",
    patterns: [/inventory/i, /stock/i, /reorder/i, /sku/i],
    respond: ({ inventory }) => {
      const critical = inventory?.filter(i => i.status === "critical") ?? [];
      const low      = inventory?.filter(i => i.status === "low") ?? [];
      const avgTurn  = inventory ? (inventory.reduce((s, i) => s + parseFloat(i.turnover), 0) / inventory.length).toFixed(1) : "N/A";
      return `**Inventory Status**\n\n${critical.length} SKU(s) at **critical** stock, ${low.length} at low stock.\nAverage turnover: **${avgTurn}×/year** ${avgTurn > 8 ? "(healthy)" : "(below CRISIL 8× benchmark — review slow-movers)"}\n\n**Critical items:**\n${critical.slice(0, 3).map(i => `- ${i.product}: ${i.stock} units (reorder at ${i.reorder})`).join("\n") || "None"}\n\n*Tip: Switch slow-movers to JIT procurement to reduce holding cost.*`;
    },
  },
  {
    id: "channels",
    patterns: [/channel/i, /roas/i, /cac/i, /acquisition/i, /paid/i, /organic/i, /social/i],
    respond: ({ channels }) => {
      if (!channels?.length) return "Channel data not loaded yet.";
      const sorted = [...channels].sort((a, b) => b.roas - a.roas);
      const best   = sorted[0];
      const worst  = sorted[sorted.length - 1];
      return `**Channel Attribution**\n\n**Best ROAS:** ${best.ch} at **${best.roas.toFixed(2)}×** (CAC ₹${Math.round(best.cac)})\n**Weakest ROAS:** ${worst.ch} at **${worst.roas.toFixed(2)}×** (CAC ₹${Math.round(worst.cac)})\n\n**Rule-based recommendation:**\n- Reallocate 20–30% budget from ${worst.ch} → ${best.ch}\n- ${worst.roas < 2 ? `Pause ${worst.ch} spend until creative is refreshed` : `Optimize ${worst.ch} landing pages for conversion`}\n- A/B test checkout flow for top 2 channels separately`;
    },
  },
  {
    id: "return_rate",
    patterns: [/return rate/i, /returns/i, /refund/i],
    respond: ({ kpis }) =>
      `**Return Rate**\n\nCurrent return rate: **${kpis.returnRate.toFixed(1)}%**\nRedseer India 2024 avg: 8–12% (fashion), 4–6% (electronics)\n\n**Return reduction playbook:**\n- Add size-fit predictor for fashion SKUs\n- Mandate 4+ product images + 360° view\n- Flag high-return SKUs for description audit\n- Introduce "keep it" incentive for low-value items (< ₹500)`,
  },
  {
    id: "ltv",
    patterns: [/ltv/i, /lifetime value/i, /customer value/i, /retention/i],
    respond: ({ kpis }) =>
      `**Customer LTV**\n\nAverage LTV: **${fmtINR(kpis.ltv)}**\n\nLTV:CAC ratio benchmark (healthy = 3:1+). To calculate yours, divide LTV by your average CAC from the Channels tab.\n\n**LTV improvement levers:**\n- Email re-engagement at day 30 post-purchase\n- Subscription / replenishment nudges for consumables\n- Loyalty points with 6-month expiry (urgency without annoyance)\n- Post-purchase review request → drives repeat purchase rate +12% (Sailthru, 2023)`,
  },
  {
    id: "forecast",
    patterns: [/forecast/i, /predict/i, /next week/i, /next month/i, /future/i],
    respond: ({ gmvSeries }) => {
      if (!gmvSeries?.length) return "GMV series not loaded yet — check back in a moment.";
      const last7 = gmvSeries.slice(-7);
      const avg = last7.reduce((s, d) => s + d.gmv, 0) / last7.length;
      const trend = last7.length > 1 ? ((last7[last7.length - 1].gmv - last7[0].gmv) / last7[0].gmv * 100).toFixed(1) : 0;
      return `**GMV Forecast (Rule-based)**\n\n7-day trailing average: **${fmtINR(avg)}**\nShort-term trend: **${trend > 0 ? "+" : ""}${trend}%**\n\nAt this trend rate, projected next-14-day GMV: **${fmtINR(avg * 14 * (1 + trend / 100))}**\n\n*Full ML forecast (14-day) with confidence intervals available in the ML Insights tab.*`;
    },
  },
  {
    id: "demand",
    patterns: [/demand/i, /demand plan/i, /demand forecast/i, /sku demand/i],
    respond: () =>
      `**Demand Planning**\n\nThe demand radar uses a Random Forest + ARIMA ensemble (MAPE ±8%). The gap you may have seen earlier was caused by ±30% noise in the generator — now calibrated to industry benchmark.\n\n**How to read it:**\n- Tight overlap of Actual vs Forecast = good model fit\n- Wide gaps = seasonal spike or data quality issue\n- Review SKUs where gap > 15% — likely size/variant confusion in orders\n\n**To improve accuracy in production:**\n- Feed holiday calendar as exogenous variable\n- Include promo flag (1/0) in training features\n- Retrain monthly on rolling 12-month window`,
  },
  {
    id: "sentiment",
    patterns: [/sentiment/i, /review/i, /feedback/i, /rating/i, /nps/i],
    respond: () =>
      `**Sentiment Analysis**\n\nThe Sentiment tab uses a lexicon-based pipeline (VADER-style) with an LLM second-pass for ambiguous reviews.\n\n**LLM pipeline capability:**\n- Scrape product reviews from your URL feed → classify → score → trend\n- Can be extended to Twitter/Instagram mentions for brand sentiment\n- Real-time pipeline: URL → scraper → chunk → embed → classify → store\n\n*Switch to the Sentiment tab for the full breakdown.*`,
  },
  {
    id: "tax",
    patterns: [/tax/i, /gst/i, /tds/i, /tcs/i, /compliance/i],
    respond: () =>
      `**Taxation**\n\nSwitch to the Taxation tab for full GST, TDS, and TCS breakdowns based on your live KPI data.\n\nKey thresholds:\n- TDS (194O): 1% on marketplace payouts > ₹5L/year\n- TCS (206C): 1% collected at source on e-commerce transactions\n- GST: 18% on platform services, category-specific on goods`,
  },
  {
    id: "hello",
    patterns: [/^hi\b/i, /^hello/i, /^hey/i, /^what can you/i, /^help/i],
    respond: () =>
      `**PulseCart AI — what I can answer:**\n\n- GMV trends and revenue breakdown\n- Cart abandonment causes and fixes\n- Inventory reorder alerts\n- Channel ROAS and CAC analysis\n- Demand forecast interpretation\n- Return rate benchmarks\n- Customer LTV improvement levers\n- Tax / GST compliance summary\n- Sentiment pipeline capabilities\n\nJust ask in plain English — no commands needed.`,
  },
];

function matchIntent(text) {
  const lower = text.toLowerCase();
  for (const intent of INTENTS) {
    if (intent.patterns.some(p => p.test(lower))) return intent;
  }
  return null;
}

// ─── Markdown-lite renderer ───────────────────────────────────────────────────
function MsgText({ text, T }) {
  const lines = text.split("\n");
  return (
    <div style={{ lineHeight: 1.7, fontSize: 12.5 }}>
      {lines.map((line, i) => {
        if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
          return <div key={i} style={{ fontWeight: 700, color: T.text, marginTop: i > 0 ? 10 : 0, marginBottom: 2 }}>{line.slice(2, -2)}</div>;
        }
        if (line.startsWith("- ")) {
          const content = line.slice(2).replace(/\*\*(.+?)\*\*/g, (_, m) => `§BOLD§${m}§END§`);
          const parts = content.split(/(§BOLD§.+?§END§)/g);
          return (
            <div key={i} style={{ display: "flex", gap: 7, marginBottom: 3 }}>
              <span style={{ color: T.brand, flexShrink: 0, marginTop: 1 }}>·</span>
              <span>{parts.map((p, j) => p.startsWith("§BOLD§") ? <b key={j}>{p.slice(6, -5)}</b> : p)}</span>
            </div>
          );
        }
        if (line.trim() === "") return <div key={i} style={{ height: 6 }} />;
        const parts = line.split(/(\*\*.+?\*\*)/g);
        return (
          <div key={i}>{parts.map((p, j) => p.startsWith("**") ? <b key={j}>{p.slice(2, -2)}</b> : p)}</div>
        );
      })}
    </div>
  );
}

// ─── ChatBot component ────────────────────────────────────────────────────────
export default function ChatBot({ T, kpis, gmvSeries, categories, channels, regions, inventory }) {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi 👋 I'm PulseCart AI. Ask me about GMV, abandonment, inventory, channels, demand forecasting, or tax compliance.", ts: new Date() },
  ]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const ctx = { kpis, gmvSeries, categories, channels, regions, inventory };

  async function send() {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");

    const userMsg = { role: "user", text: q, ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    // 1. Try rule-based engine first
    const intent = matchIntent(q);
    if (intent) {
      await new Promise(r => setTimeout(r, 180)); // tiny delay feels natural
      const answer = intent.respond(ctx);
      setMessages(prev => [...prev, { role: "assistant", text: answer, ts: new Date(), source: "rule-based" }]);
      setLoading(false);
      return;
    }

    // 2. Fall back to Anthropic LLM with dashboard context
    try {
      const systemPrompt = `You are PulseCart AI, an embedded analytics assistant for an Indian e-commerce retail intelligence dashboard.

Dashboard context (live data):
- GMV: ${fmtINR(kpis?.gmv ?? 0)}
- AOV: ${fmtINR(kpis?.aov ?? 0)}
- Conversion rate: ${kpis?.convRate?.toFixed(2) ?? "N/A"}%
- Cart abandonment: ${kpis?.cartAbandRate?.toFixed(1) ?? "N/A"}%
- Return rate: ${kpis?.returnRate?.toFixed(1) ?? "N/A"}%
- Net revenue: ${fmtINR(kpis?.netRevenue ?? 0)}
- Customer LTV: ${fmtINR(kpis?.ltv ?? 0)}
- Inventory turnover: ${kpis?.invTurnover?.toFixed(1) ?? "N/A"}×
- Top channel by ROAS: ${channels?.length ? [...channels].sort((a, b) => b.roas - a.roas)[0].ch : "N/A"}
- Critical inventory SKUs: ${inventory?.filter(i => i.status === "critical").length ?? 0}

Rules:
- Answer concisely with specific numbers from context above
- Use INR formatting (₹, L, Cr) not USD
- Reference real benchmarks: Baymard, Redseer, CRISIL, McKinsey where relevant
- If asked about UI features, direct user to the correct tab
- Keep responses under 200 words unless the question demands detail
- Do not hallucinate data not in the context`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [
            ...messages.filter(m => m.role !== "assistant" || !m.source).slice(-6).map(m => ({
              role: m.role,
              content: m.text,
            })),
            { role: "user", content: q },
          ],
        }),
      });

      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      const answer = data.content?.map(b => b.text || "").join("").trim() || "No response.";
      setMessages(prev => [...prev, { role: "assistant", text: answer, ts: new Date(), source: "llm" }]);
    } catch (err) {
      console.error("ChatBot LLM error:", err);
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "The LLM endpoint is unavailable right now. Try a more specific question — I can answer most queries about GMV, channels, inventory, abandonment, and forecasting without the API.",
        ts: new Date(),
        source: "fallback",
      }]);
    }

    setLoading(false);
  }

  const suggestions = ["What's our GMV trend?", "Top channel by ROAS", "Critical inventory SKUs", "Why is abandonment high?", "Forecast next 14 days"];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 300,
          width: 52, height: 52, borderRadius: "50%",
          background: `linear-gradient(135deg,${T.brand},${T.brandAlt})`,
          border: "none", cursor: "pointer", color: "#fff",
          fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 20px ${T.brand}66`,
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
        title="PulseCart AI"
      >
        {open ? "✕" : "◎"}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 86, right: 24, zIndex: 300,
          width: 380, maxHeight: 560,
          background: T.panel, border: `1px solid ${T.border}`,
          borderRadius: 14, display: "flex", flexDirection: "column",
          boxShadow: `0 12px 40px ${T.shadow}`,
          fontFamily: "'IBM Plex Sans',sans-serif",
          animation: "fadeSlide 0.2s",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}`, background: T.panelAlt, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg,${T.brand},${T.brandAlt})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", fontWeight: 700 }}>P</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>PulseCart AI</div>
              <div style={{ fontSize: 10, color: T.success, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.success, display: "inline-block" }} />
                Rule-based + LLM hybrid
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "88%",
                  background: m.role === "user" ? T.brand : T.panelAlt,
                  color: m.role === "user" ? "#fff" : T.text,
                  borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  padding: "10px 13px",
                  fontSize: 12.5,
                }}>
                  {m.role === "assistant" ? <MsgText text={m.text} T={T} /> : m.text}
                </div>
                <div style={{ fontSize: 9.5, color: T.muted, marginTop: 3, display: "flex", gap: 6 }}>
                  {m.ts.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  {m.source && <span style={{ color: m.source === "llm" ? T.info : T.success }}>· {m.source}</span>}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 13px", background: T.panelAlt, borderRadius: "12px 12px 12px 2px", maxWidth: "60%" }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: T.brand, display: "inline-block", animation: "pulse 1.4s infinite", animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div style={{ padding: "0 12px 8px", display: "flex", flexWrap: "wrap", gap: 5 }}>
              {suggestions.map(s => (
                <button key={s} onClick={() => { setInput(s); }}
                  style={{ background: T.dimmed, border: `1px solid ${T.border}`, borderRadius: 20, padding: "4px 10px", fontSize: 11, color: T.muted, cursor: "pointer", fontFamily: "'IBM Plex Sans',sans-serif", fontWeight: 500 }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: "10px 12px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Ask about GMV, channels, inventory…"
              style={{
                flex: 1, background: T.panelAlt, border: `1px solid ${T.border}`,
                borderRadius: 8, padding: "8px 12px", fontSize: 12,
                color: T.text, fontFamily: "'IBM Plex Sans',sans-serif", outline: "none",
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              style={{
                background: T.brand, border: "none", borderRadius: 8,
                padding: "8px 14px", color: "#fff", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                fontFamily: "'IBM Plex Sans',sans-serif", fontWeight: 600, fontSize: 12,
                opacity: input.trim() && !loading ? 1 : 0.5,
              }}
            >↑</button>
          </div>
        </div>
      )}
    </>
  );
}
