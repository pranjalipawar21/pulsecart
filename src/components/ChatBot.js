import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `You are PulseCart AI, an embedded retail analytics assistant inside the PulseCart e-commerce intelligence dashboard.

You help retail analysts and business owners understand their store metrics. You answer questions about:
- GMV (Gross Merchandise Value), AOV (Average Order Value), conversion rates
- Cart abandonment rates and reduction strategies  
- Inventory turnover, stockouts, reorder strategies
- Customer LTV, churn, segmentation
- Channel attribution (ROAS, CAC, organic vs paid)
- ML forecasting, anomaly detection in sales data
- E-commerce KPI benchmarks for Indian retail market

Keep answers concise (2-4 sentences), data-driven, and actionable. Use ₹ for currency context when relevant. Sound like a knowledgeable retail data analyst, not a generic chatbot.`;

export default function ChatBot({ theme }) {
  const T = theme;
  const [open,    setOpen]    = useState(false);
  const [msgs,    setMsgs]    = useState([
    { role:"assistant", content:"Hi! I'm PulseCart AI 👋 Ask me about your GMV trends, cart abandonment, inventory, or ML forecasts." }
  ]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [msgs, open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const newMsgs = [...msgs, { role:"user", content:text }];
    setMsgs(newMsgs);
    setInput("");
    setLoading(true);

    try {
      const apiMsgs = newMsgs.filter(m => m.role !== "system");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: apiMsgs,
        }),
      });
      const data = await res.json();
      const reply = data.content?.map(b => b.text || "").join("") || "Sorry, I couldn't get a response.";
      setMsgs(prev => [...prev, { role:"assistant", content:reply }]);
    } catch (e) {
      setMsgs(prev => [...prev, { role:"assistant", content:"Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  const SUGGESTIONS = ["Why is cart abandonment high?", "How to improve ROAS?", "What's a good LTV benchmark?", "Explain demand forecasting"];

  return (
    <>
      {/* Floating button */}
      <button onClick={() => setOpen(o => !o)} style={{
        position:"fixed", bottom:28, right:28, zIndex:1000,
        width:56, height:56, borderRadius:"50%", border:"none", cursor:"pointer",
        background:`linear-gradient(135deg, ${T.brand}, ${T.brandAlt})`,
        color:"#fff", fontSize:24, boxShadow:`0 4px 24px ${T.brand}55`,
        display:"flex", alignItems:"center", justifyContent:"center",
        transition:"transform 0.2s",
      }}>
        {open ? "✕" : "✦"}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position:"fixed", bottom:96, right:28, zIndex:999,
          width:360, height:500, borderRadius:16,
          background:T.panel, border:`1px solid ${T.border}`,
          display:"flex", flexDirection:"column",
          boxShadow:`0 12px 48px ${T.shadow}`,
          fontFamily:"'Sora', sans-serif",
          overflow:"hidden",
        }}>
          {/* Header */}
          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${T.border}`, background:`linear-gradient(135deg, ${T.brand}18, transparent)`, display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:`linear-gradient(135deg,${T.brand},${T.brandAlt})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>✦</div>
            <div>
              <div style={{ fontWeight:700, fontSize:13, color:T.text }}>PulseCart AI</div>
              <div style={{ fontSize:10, color:T.brand }}>● Retail Intelligence Assistant</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display:"flex", justifyContent: m.role==="user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth:"82%", padding:"10px 13px", borderRadius: m.role==="user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: m.role==="user" ? `linear-gradient(135deg,${T.brand},${T.brandAlt})` : T.bg,
                  color: m.role==="user" ? "#fff" : T.text,
                  fontSize:12.5, lineHeight:1.55, border: m.role==="assistant" ? `1px solid ${T.border}` : "none",
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display:"flex", gap:4, padding:"10px 13px", background:T.bg, borderRadius:14, border:`1px solid ${T.border}`, width:"fit-content" }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:T.brand, animation:`bounce 1s ${i*0.15}s infinite` }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {msgs.length <= 2 && (
            <div style={{ padding:"0 14px 10px", display:"flex", flexWrap:"wrap", gap:6 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => { setInput(s); }} style={{
                  background:T.bg, border:`1px solid ${T.border}`, borderRadius:20,
                  color:T.muted, fontSize:10.5, padding:"5px 10px", cursor:"pointer",
                  fontFamily:"'Sora',sans-serif",
                }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding:"12px 14px", borderTop:`1px solid ${T.border}`, display:"flex", gap:8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Ask about your retail metrics..."
              style={{
                flex:1, background:T.bg, border:`1px solid ${T.border}`, borderRadius:10,
                padding:"9px 12px", color:T.text, fontSize:12.5, fontFamily:"'Sora',sans-serif",
                outline:"none",
              }}
            />
            <button onClick={send} disabled={loading || !input.trim()} style={{
              background:`linear-gradient(135deg,${T.brand},${T.brandAlt})`, border:"none", borderRadius:10,
              color:"#fff", fontWeight:700, fontSize:13, padding:"0 14px", cursor:"pointer", opacity: (!input.trim()||loading)?0.5:1,
            }}>→</button>
          </div>
        </div>
      )}

      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
    </>
  );
}
