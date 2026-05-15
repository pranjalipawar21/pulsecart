import { useState, useMemo } from "react";

// ─── Indian GST category rates (Finance Act 2024) ────────────────────────────
const GST_RATES = {
  "Electronics":   18,
  "Fashion":        5,  // garments < ₹1000; 12% above — simplified to 5% blended
  "Health/Beauty": 18,
  "Home/Kitchen":  12,
  "Sports":        18,
  "Books":          0,  // Nil GST on printed books (Notification 2/2017)
};

// ─── HSN codes by category ───────────────────────────────────────────────────
const HSN = {
  "Electronics":   "8517 / 8471",
  "Fashion":       "6204 / 6203",
  "Health/Beauty": "3305 / 3304",
  "Home/Kitchen":  "7323 / 8509",
  "Sports":        "9506 / 6402",
  "Books":         "4901",
};

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmtINR = (n) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(2)}Cr` :
  n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L`  :
  n >= 1e3 ? `₹${(n / 1e3).toFixed(1)}K`  : `₹${Math.round(n)}`;

const fmtExact = (n) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Tax computation engine ──────────────────────────────────────────────────
function computeTax(gmv, cat, isInter = false) {
  const gstRate  = GST_RATES[cat] ?? 18;
  const taxable  = gmv / (1 + gstRate / 100);           // back-calculate taxable value
  const totalGST = gmv - taxable;
  const cgst     = isInter ? 0 : totalGST / 2;
  const sgst     = isInter ? 0 : totalGST / 2;
  const igst     = isInter ? totalGST : 0;
  const tcs      = gmv * 0.01;                          // TCS u/s 206C(1H) — 1% on e-commerce
  const tds      = gmv > 500000 ? gmv * 0.01 : 0;      // TDS u/s 194O — 1% above ₹5L threshold
  return { taxable, gstRate, totalGST, cgst, sgst, igst, tcs, tds };
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SH({ title, badge, T, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ width: 3, height: 16, background: T.brand, borderRadius: 2 }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.text }}>{title}</span>
        {badge && <span style={{ background: `${T.brand}18`, color: T.brand, fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>{badge}</span>}
      </div>
      {action}
    </div>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value, sub, highlight, T }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: `1px solid ${T.dimmed}` }}>
      <div>
        <div style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ fontWeight: 700, fontSize: 13, color: highlight ? T.brand : T.text, textAlign: "right" }}>{value}</div>
    </div>
  );
}

// ─── Compliance Badge ─────────────────────────────────────────────────────────
function CompBadge({ status, T }) {
  const cfg = {
    compliant:  { bg: `${T.success}18`, color: T.success,  text: "Compliant"   },
    review:     { bg: `${T.brandAlt}18`,color: T.brandAlt, text: "Review"      },
    attention:  { bg: `${T.danger}18`,  color: T.danger,   text: "Attention"   },
  }[status] || {};
  return <span style={{ background: cfg.bg, color: cfg.color, fontSize: 10, padding: "3px 9px", borderRadius: 20, fontWeight: 600 }}>{cfg.text}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN TAX PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function TaxPage({ T, kpis, categories }) {
  const [activeTab,  setActiveTab]  = useState("overview");
  const [selCat,     setSelCat]     = useState("Electronics");
  const [isInter,    setIsInter]    = useState(false);
  const [customGMV,  setCustomGMV]  = useState("");
  const [filingQ,    setFilingQ]    = useState("Q4");
  

  const CATS = Object.keys(GST_RATES);
  const TAX_TABS = ["overview", "gst", "tds / tcs", "gstr filing", "calculator"];

  // ── Compute tax from real category-level revenue from backend ─────────
  const catSplits = useMemo(() => {
    if (!Array.isArray(categories) || categories.length === 0) return [];
    
    return categories.map(c => {
      const catName = c.cat;
      const catGMV  = c.revenue || 0;
      const tax     = computeTax(catGMV, catName);
      return { cat: catName, gmv: catGMV, ...tax };
    });
  }, [categories]);

  const totalGST   = catSplits.reduce((s, c) => s + c.totalGST, 0);
  const totalTCS   = catSplits.reduce((s, c) => s + c.tcs, 0);
  const totalTDS   = catSplits.reduce((s, c) => s + c.tds, 0);
  const totalTaxable = catSplits.reduce((s, c) => s + c.taxable, 0);

  // ── Custom calculator ────────────────────────────────────────────────────
  const calcGMV = parseFloat(customGMV.replace(/[^0-9.]/g, "")) || 0;
  const calcTax = calcGMV > 0 ? computeTax(calcGMV, selCat, isInter) : null;

  // ── GSTR filing deadlines ────────────────────────────────────────────────
  const gstrData = {
    Q1: { period: "Apr–Jun 2024", gstr1: "11 Jul 2024", gstr3b: "20 Jul 2024", gstr9: "31 Dec 2024" },
    Q2: { period: "Jul–Sep 2024", gstr1: "11 Oct 2024", gstr3b: "20 Oct 2024", gstr9: "31 Dec 2024" },
    Q3: { period: "Oct–Dec 2024", gstr1: "11 Jan 2025", gstr3b: "20 Jan 2025", gstr9: "31 Dec 2025" },
    Q4: { period: "Jan–Mar 2025", gstr1: "11 Apr 2025", gstr3b: "20 Apr 2025", gstr9: "31 Dec 2025" },
  };
  const filing = gstrData[filingQ];

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.025em", color: T.text }}>Tax & Compliance</h2>
        <p style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>GST · TDS 194O · TCS 206C · GSTR filing · Finance Act 2024</p>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 3, marginBottom: 22, borderBottom: `1px solid ${T.border}`, paddingBottom: 0 }}>
        {TAX_TABS.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "8px 16px", fontSize: 11, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.07em",
              color: activeTab === t ? T.brand : T.muted,
              borderBottom: `2px solid ${activeTab === t ? T.brand : "transparent"}`,
              fontFamily: "'IBM Plex Sans',sans-serif",
              transition: "all 0.15s",
              marginBottom: -1,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === "overview" && (
        <>
          {/* KPI cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 22 }}>
            {[
              { label: "Total GST Liability",   value: fmtINR(totalGST),     sub: "On current GMV",         color: T.danger,   icon: "%" },
              { label: "Taxable Value (ex-GST)", value: fmtINR(totalTaxable), sub: "GMV back-calculated",    color: T.brand,    icon: "₹" },
              { label: "TCS Collected (206C)",   value: fmtINR(totalTCS),     sub: "1% on all e-commerce",   color: T.brandAlt, icon: "↑" },
              { label: "TDS Deducted (194O)",    value: fmtINR(totalTDS),     sub: "1% on payouts > ₹5L",    color: T.info,     icon: "↓" },
            ].map(s => (
              <div key={s.label} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${s.color},${s.color}33)` }} />
                <div style={{ position: "absolute", top: 12, right: 14, fontSize: 18, color: s.color, opacity: 0.15, fontWeight: 700 }}>{s.icon}</div>
                <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 7 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: "-0.02em" }}>{s.value}</div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Category tax matrix */}
          <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <SH title="Tax Liability by Category" badge="Finance Act 2024" T={T} />
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["Category", "Est. GMV", "GST Rate", "Taxable Value", "CGST", "SGST", "Total GST", "HSN"].map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: T.muted, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catSplits.map(c => (
                  <tr key={c.cat} className="row-h" style={{ borderBottom: `1px solid ${T.dimmed}`, transition: "background 0.12s" }}>
                    <td style={{ padding: "11px 10px", fontWeight: 600, color: T.text }}>{c.cat}</td>
                    <td style={{ padding: "11px 10px", color: T.brand, fontWeight: 700 }}>{fmtINR(c.gmv)}</td>
                    <td style={{ padding: "11px 10px" }}>
                      <span style={{ background: c.gstRate === 0 ? `${T.success}18` : c.gstRate <= 5 ? `${T.success}18` : c.gstRate <= 12 ? `${T.brandAlt}18` : `${T.danger}18`, color: c.gstRate === 0 ? T.success : c.gstRate <= 5 ? T.success : c.gstRate <= 12 ? T.brandAlt : T.danger, fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>
                        {c.gstRate}%
                      </span>
                    </td>
                    <td style={{ padding: "11px 10px", color: T.muted }}>{fmtINR(c.taxable)}</td>
                    <td style={{ padding: "11px 10px", color: T.text }}>{fmtINR(c.cgst)}</td>
                    <td style={{ padding: "11px 10px", color: T.text }}>{fmtINR(c.sgst)}</td>
                    <td style={{ padding: "11px 10px", color: T.danger, fontWeight: 700 }}>{fmtINR(c.totalGST)}</td>
                    <td style={{ padding: "11px 10px", color: T.muted, fontSize: 10, fontFamily: "monospace" }}>{HSN[c.cat]}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: `2px solid ${T.border}`, background: T.dimmed }}>
                  <td style={{ padding: "12px 10px", fontWeight: 700, color: T.text }}>Total</td>
                  <td style={{ padding: "12px 10px", color: T.brand, fontWeight: 700 }}>{fmtINR(kpis?.gmv ?? 0)}</td>
                  <td />
                  <td style={{ padding: "12px 10px", color: T.muted, fontWeight: 600 }}>{fmtINR(totalTaxable)}</td>
                  <td style={{ padding: "12px 10px", fontWeight: 700, color: T.text }}>{fmtINR(catSplits.reduce((s,c)=>s+c.cgst,0))}</td>
                  <td style={{ padding: "12px 10px", fontWeight: 700, color: T.text }}>{fmtINR(catSplits.reduce((s,c)=>s+c.sgst,0))}</td>
                  <td style={{ padding: "12px 10px", color: T.danger, fontWeight: 800 }}>{fmtINR(totalGST)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Compliance status */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
              <SH title="Compliance Status" T={T} />
              {[
                { label: "GSTR-1 Filing",           status: "compliant",  note: "Last filed Apr 11, 2025"           },
                { label: "GSTR-3B Filing",           status: "compliant",  note: "Last filed Apr 20, 2025"           },
                { label: "TCS Deposit (206C)",       status: "compliant",  note: "Monthly — due 7th of next month"   },
                { label: "TDS Deposit (194O)",       status: "compliant",  note: "Monthly — due 7th of next month"   },
                { label: "Annual GSTR-9",            status: "review",     note: "Due Dec 31, 2025 — prepare data"   },
                { label: "E-invoicing (> ₹5Cr)",    status: totalTaxable > 5e7 ? "compliant" : "attention", note: totalTaxable > 5e7 ? "IRP-enabled" : "Threshold not reached" },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${T.dimmed}` }}>
                  <div>
                    <div style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>{item.label}</div>
                    <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{item.note}</div>
                  </div>
                  <CompBadge status={item.status} T={T} />
                </div>
              ))}
            </div>

            <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
              <SH title="Key Thresholds" T={T} />
              {[
                { label: "TDS 194O Threshold",        value: "₹5,00,000/yr",  note: "TDS @ 1% on e-commerce payouts above this",       met: kpis?.gmv > 500000 },
                { label: "TCS 206C",                  value: "No threshold",  note: "Collected at 1% on all e-commerce sales",          met: true               },
                { label: "GST Registration",          value: "₹40L/yr",       note: "Mandatory above this turnover (₹20L for services)", met: kpis?.gmv > 4000000},
                { label: "E-Invoice (B2B)",           value: "₹5Cr/yr",       note: "Mandatory e-invoicing on IRP portal",               met: kpis?.gmv > 50000000},
                { label: "Quarterly GSTR-1 (QRMP)",  value: "≤ ₹5Cr/yr",    note: "Eligible for quarterly filing scheme",             met: kpis?.gmv <= 50000000},
                { label: "HSN Summary Mandatory",     value: "> ₹5Cr/yr",    note: "6-digit HSN required in GSTR-1",                   met: kpis?.gmv > 50000000},
              ].map(item => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: `1px solid ${T.dimmed}` }}>
                  <div>
                    <div style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>{item.label}</div>
                    <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{item.note}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{item.value}</div>
                    <div style={{ fontSize: 10, marginTop: 2, color: item.met ? T.success : T.muted }}>{item.met ? "● Applies" : "○ N/A"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── GST DETAIL ── */}
      {activeTab === "gst" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
              <SH title="GST Rate Schedule" badge="Notification 1/2017-CT(R)" T={T} />
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    {["Category", "HSN", "GST %", "CGST", "SGST/UTGST", "Nil?"].map(h => (
                      <th key={h} style={{ padding: "7px 10px", textAlign: "left", color: T.muted, fontSize: 10, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(GST_RATES).map(([cat, rate]) => (
                    <tr key={cat} className="row-h" style={{ borderBottom: `1px solid ${T.dimmed}`, transition: "background 0.12s" }}>
                      <td style={{ padding: "10px", fontWeight: 600, color: T.text, fontSize: 12 }}>{cat}</td>
                      <td style={{ padding: "10px", color: T.muted, fontSize: 10, fontFamily: "monospace" }}>{HSN[cat]}</td>
                      <td style={{ padding: "10px", fontWeight: 700, color: rate === 0 ? T.success : T.text }}>{rate}%</td>
                      <td style={{ padding: "10px", color: T.muted, fontSize: 11 }}>{rate / 2}%</td>
                      <td style={{ padding: "10px", color: T.muted, fontSize: 11 }}>{rate / 2}%</td>
                      <td style={{ padding: "10px", fontSize: 11, color: rate === 0 ? T.success : T.muted }}>{rate === 0 ? "✓ Exempt" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
              <SH title="Input Tax Credit (ITC) Notes" T={T} />
              {[
                { heading: "Eligible ITC",     body: "GST paid on inward supplies used for business — warehousing, packaging, software, marketing services, B2B purchases." },
                { heading: "Blocked Credits",  body: "Section 17(5): ITC blocked on personal use, motor vehicles (unless used for transport), food and beverages, membership clubs." },
                { heading: "Reversal Rule",    body: "Rule 42/43: ITC must be reversed proportionally for exempt supplies (e.g. Books at 0%). Calculate monthly." },
                { heading: "ITC on Returns",   body: "When a customer returns goods, supplier must reverse ITC already claimed. Issue Credit Note within the same FY." },
                { heading: "GSTR-2B Match",    body: "ITC can only be claimed if the supplier has filed GSTR-1 and it appears in your GSTR-2B. Auto-populated monthly." },
                { heading: "Claiming Limit",   body: "From Jan 2022: ITC cannot exceed 110% of eligible credit appearing in GSTR-2B. Excess must be reversed." },
              ].map(n => (
                <div key={n.heading} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 3 }}>{n.heading}</div>
                  <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.6 }}>{n.body}</div>
                </div>
              ))}
            </div>
          </div>

          {/* GST visual breakdown bar */}
          <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
            <SH title="Revenue Composition (ex-GST)" T={T} />
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", height: 28, borderRadius: 6, overflow: "hidden", marginBottom: 8 }}>
                {catSplits.map((c, i) => {
                  const colors = [T.brand, T.info, T.success, T.brandAlt, T.danger, T.muted];
                  return (
                    <div key={c.cat} title={`${c.cat}: ${fmtINR(c.taxable)}`}
                      style={{ flex: c.taxable, background: colors[i], transition: "flex 0.5s" }} />
                  );
                })}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {catSplits.map((c, i) => {
                  const colors = [T.brand, T.info, T.success, T.brandAlt, T.danger, T.muted];
                  const sharePct = ((c.taxable / totalTaxable) * 100).toFixed(1);
                  return (
                    <div key={c.cat} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: colors[i] }} />
                      <span style={{ fontSize: 11, color: T.muted }}>{c.cat}: {sharePct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {[
                { label: "Taxable Value (ex-GST)", value: fmtINR(totalTaxable), color: T.brand },
                { label: "Total GST (CGST+SGST)",  value: fmtINR(totalGST),     color: T.danger },
                { label: "Effective GST Rate",     value: `${((totalGST/(kpis?.gmv||1))*100).toFixed(2)}%`, color: T.muted },
              ].map(s => (
                <div key={s.label} style={{ background: T.panelAlt, borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 5 }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── TDS / TCS ── */}
      {activeTab === "tds / tcs" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {/* TCS 206C */}
            <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
              <SH title="TCS — Section 206C(1H)" badge="E-commerce Operator" T={T} />
              <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.7, marginBottom: 14 }}>
                E-commerce operators must collect Tax Collected at Source (TCS) at <b style={{ color: T.text }}>1%</b> on the gross amount paid to sellers. Applicable from Oct 1, 2020.
              </div>
              {[
                { label: "Rate",               value: "1% (0.5% CGST + 0.5% SGST or 1% IGST)" },
                { label: "Who collects",       value: "E-commerce operator (PulseCart)" },
                { label: "Applicable on",      value: "Net value of sales returned to seller" },
                { label: "Deposit deadline",   value: "7th of the following month" },
                { label: "Return (GSTR-8)",    value: "Filed monthly by 10th of following month" },
                { label: "Certificate (TCS)",  value: "Issued to seller via Form 27D quarterly" },
                { label: "Your TCS liability", value: fmtExact(totalTCS), highlight: true },
              ].map(r => (
                <InfoRow key={r.label} {...r} highlight={r.highlight} T={T} />
              ))}
            </div>

            {/* TDS 194O */}
            <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
              <SH title="TDS — Section 194O" badge="E-commerce Operator" T={T} />
              <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.7, marginBottom: 14 }}>
                TDS must be deducted at <b style={{ color: T.text }}>1%</b> on payments made to sellers through the e-commerce platform when aggregate payments exceed ₹5 lakh in a financial year.
              </div>
              {[
                { label: "Rate",               value: "1% (no surcharge, no cess on TDS)" },
                { label: "Threshold",          value: "₹5,00,000 per seller per FY" },
                { label: "PAN not furnished",  value: "5% TDS if seller hasn't given PAN" },
                { label: "Deposit deadline",   value: "7th of the following month" },
                { label: "Return (26Q)",       value: "Quarterly — due 15th after quarter end" },
                { label: "Certificate (16A)",  value: "Issued within 15 days of 26Q filing" },
                { label: "Your TDS liability", value: fmtExact(totalTDS), highlight: true },
              ].map(r => (
                <InfoRow key={r.label} {...r} highlight={r.highlight} T={T} />
              ))}
            </div>
          </div>

          {/* Monthly TDS/TCS calendar */}
          <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
            <SH title="TDS / TCS Compliance Calendar — FY 2024-25" T={T} />
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    {["Month", "TCS Deposit (206C)", "TDS Deposit (194O)", "GSTR-8 (TCS Return)", "26Q (TDS Quarterly)"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: T.muted, fontSize: 10, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["April 2024",    "7 May 2024",    "7 May 2024",    "10 May 2024",  "—"],
                    ["May 2024",      "7 Jun 2024",    "7 Jun 2024",    "10 Jun 2024",  "—"],
                    ["June 2024",     "7 Jul 2024",    "7 Jul 2024",    "10 Jul 2024",  "15 Jul 2024"],
                    ["July 2024",     "7 Aug 2024",    "7 Aug 2024",    "10 Aug 2024",  "—"],
                    ["August 2024",   "7 Sep 2024",    "7 Sep 2024",    "10 Sep 2024",  "—"],
                    ["September 2024","7 Oct 2024",    "7 Oct 2024",    "10 Oct 2024",  "15 Oct 2024"],
                    ["October 2024",  "7 Nov 2024",    "7 Nov 2024",    "10 Nov 2024",  "—"],
                    ["November 2024", "7 Dec 2024",    "7 Dec 2024",    "10 Dec 2024",  "—"],
                    ["December 2024", "7 Jan 2025",    "7 Jan 2025",    "10 Jan 2025",  "15 Jan 2025"],
                    ["January 2025",  "7 Feb 2025",    "7 Feb 2025",    "10 Feb 2025",  "—"],
                    ["February 2025", "7 Mar 2025",    "7 Mar 2025",    "10 Mar 2025",  "—"],
                    ["March 2025",    "30 Apr 2025 ✓", "30 Apr 2025 ✓", "10 Apr 2025 ✓","15 May 2025"],
                  ].map(([month, ...cols]) => (
                    <tr key={month} className="row-h" style={{ borderBottom: `1px solid ${T.dimmed}`, transition: "background 0.12s" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 500, color: T.text, fontSize: 12 }}>{month}</td>
                      {cols.map((c, i) => (
                        <td key={i} style={{ padding: "10px 12px", fontSize: 11, color: c.includes("✓") ? T.success : c === "—" ? T.muted : T.text, fontWeight: c.includes("✓") ? 600 : 400 }}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── GSTR FILING ── */}
      {activeTab === "gstr filing" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {["Q1","Q2","Q3","Q4"].map(q => (
              <button key={q} onClick={() => setFilingQ(q)} style={{
                background: filingQ === q ? T.brand : T.dimmed,
                border: `1px solid ${filingQ === q ? T.brand : T.border}`,
                borderRadius: 8, color: filingQ === q ? "#fff" : T.muted,
                fontSize: 11, padding: "5px 14px", cursor: "pointer",
                fontFamily: "'IBM Plex Sans',sans-serif", fontWeight: 600,
              }}>{q} {filing.period && q === filingQ ? `(${filing.period})` : ""}</button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {[
              { form: "GSTR-1",  title: "Outward Supplies",      deadline: filing.gstr1,  desc: "Details of all outward B2B and B2C supplies made during the period.", status: "compliant" },
              { form: "GSTR-3B",title: "Monthly Summary",        deadline: filing.gstr3b, desc: "Summary of outward/inward supplies and GST liability/ITC for the period.", status: "compliant" },
              { form: "GSTR-8", title: "TCS Return (Operator)", deadline: "10th of next month", desc: "Filed by e-commerce operator detailing TCS collected from sellers.", status: "compliant" },
              { form: "GSTR-9", title: "Annual Return",          deadline: filing.gstr9,  desc: "Annual consolidation of monthly returns. Mandatory above ₹2Cr turnover.", status: "review" },
            ].map(g => (
              <div key={g.form} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{g.form}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{g.title}</div>
                  </div>
                  <CompBadge status={g.status} T={T} />
                </div>
                <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.6, marginBottom: 12 }}>{g.desc}</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                  <span style={{ color: T.muted }}>Due date:</span>
                  <span style={{ fontWeight: 600, color: T.text }}>{g.deadline}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
            <SH title="Filing Checklist" badge={`${filing.period}`} T={T} />
            {[
              { task: "Reconcile GSTR-2B with purchase register",         done: true  },
              { task: "Verify e-invoices uploaded to IRP (if applicable)",done: true  },
              { task: "Reverse excess ITC (Rule 42/43) if any",           done: true  },
              { task: "GSTR-1: Upload outward supply invoices",           done: true  },
              { task: "GSTR-3B: Verify auto-populated values vs books",   done: true  },
              { task: "Deposit GST liability before GSTR-3B filing",      done: true  },
              { task: "GSTR-8: File TCS return for the period",           done: true  },
              { task: "Issue TCS certificates (Form 27D) to sellers",     done: false },
              { task: "Prepare GSTR-9 data — reconcile with financials",  done: false },
              { task: "Verify HSN summary accuracy for GSTR-9",           done: false },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${T.dimmed}` }}>
                <div style={{ width: 18, height: 18, borderRadius: 4, background: item.done ? T.success : T.dimmed, border: `1px solid ${item.done ? T.success : T.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {item.done && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>✓</span>}
                </div>
                <span style={{ fontSize: 12, color: item.done ? T.muted : T.text, textDecoration: item.done ? "line-through" : "none" }}>{item.task}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── CALCULATOR ── */}
      {activeTab === "calculator" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
            <SH title="GST / TDS / TCS Calculator" T={T} />

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Transaction Value (₹)</div>
              <input
                value={customGMV}
                onChange={e => setCustomGMV(e.target.value)}
                placeholder="e.g. 250000"
                style={{ width: "100%", background: T.panelAlt, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, color: T.text, fontFamily: "'IBM Plex Sans',sans-serif", outline: "none", fontWeight: 600 }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Product Category</div>
              <select value={selCat} onChange={e => setSelCat(e.target.value)}
                style={{ width: "100%", background: T.panelAlt, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, color: T.text, fontFamily: "'IBM Plex Sans',sans-serif", outline: "none" }}>
                {CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Supply Type</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[{ label: "Intra-state (CGST+SGST)", val: false }, { label: "Inter-state (IGST)", val: true }].map(o => (
                  <button key={o.label} onClick={() => setIsInter(o.val)} style={{
                    flex: 1, background: isInter === o.val ? T.brand : T.panelAlt,
                    border: `1px solid ${isInter === o.val ? T.brand : T.border}`,
                    borderRadius: 8, color: isInter === o.val ? "#fff" : T.muted,
                    fontSize: 11, padding: "8px", cursor: "pointer",
                    fontFamily: "'IBM Plex Sans',sans-serif", fontWeight: 600,
                  }}>{o.label}</button>
                ))}
              </div>
            </div>

            {calcTax && (
              <div style={{ background: T.panelAlt, borderRadius: 8, border: `1px solid ${T.border}`, padding: "14px 16px" }}>
                <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>Breakdown</div>
                {[
                  { label: "Gross Value",      value: fmtExact(calcGMV),          color: T.text    },
                  { label: "Taxable Value",    value: fmtExact(calcTax.taxable),   color: T.brand   },
                  { label: `GST @ ${calcTax.gstRate}%`, value: fmtExact(calcTax.totalGST), color: T.danger },
                  ...(!isInter ? [
                    { label: `CGST @ ${calcTax.gstRate/2}%`, value: fmtExact(calcTax.cgst), color: T.muted },
                    { label: `SGST @ ${calcTax.gstRate/2}%`, value: fmtExact(calcTax.sgst), color: T.muted },
                  ] : [
                    { label: `IGST @ ${calcTax.gstRate}%`, value: fmtExact(calcTax.igst), color: T.muted },
                  ]),
                  { label: "TCS @ 1% (206C)", value: fmtExact(calcTax.tcs),       color: T.brandAlt },
                  { label: calcGMV > 500000 ? "TDS @ 1% (194O)" : "TDS (194O) — below ₹5L", value: calcGMV > 500000 ? fmtExact(calcTax.tds) : "Nil", color: T.info },
                ].map(r => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.dimmed}` }}>
                    <span style={{ fontSize: 12, color: T.muted }}>{r.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: r.color }}>{r.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
            <SH title="Quick Reference" T={T} />
            {[
              { heading: "GST on E-commerce",    body: "Platform services attract 18% GST. Product GST depends on category. Marketplace collects and remits." },
              { heading: "TDS 194O — Who deducts",body: "PulseCart (operator) deducts TDS from seller payouts. Not applicable to sellers' direct transactions." },
              { heading: "TCS 206C — Who collects",body: "PulseCart collects TCS from buyer at checkout and deposits to government monthly." },
              { heading: "Books — Nil GST",       body: "Printed books (HSN 4901) attract 0% GST. E-books attract 18% GST (classified as service)." },
              { heading: "Fashion GST split",     body: "Garments < ₹1,000 MRP attract 5%. Garments ≥ ₹1,000 attract 12%. Footwear < ₹1,000 is 5%." },
              { heading: "Interest on late GST",  body: "18% p.a. on delayed GST payment (Section 50). Penalty: ₹200/day (₹100 CGST + ₹100 SGST) min ₹5,000." },
              { heading: "GSTIN structure",       body: "15-digit: State code (2) + PAN (10) + Entity (1) + Z + check digit. Validate before ITC claim." },
            ].map(n => (
              <div key={n.heading} style={{ padding: "10px 0", borderBottom: `1px solid ${T.dimmed}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 3 }}>{n.heading}</div>
                <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.6 }}>{n.body}</div>
              </div>
            ))}

            <div style={{ marginTop: 14, padding: "12px 14px", background: `${T.brand}0C`, borderRadius: 8, border: `1px solid ${T.brand}22` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.brand, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Disclaimer</div>
              <div style={{ fontSize: 10, color: T.muted, lineHeight: 1.6 }}>
                This calculator uses Finance Act 2024 rates for estimation only. Consult a qualified CA for binding tax advice. Rates and thresholds subject to change via GST Council notifications.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
