import { useState, useEffect, useRef, useCallback } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend,
} from "recharts";
import {
  rand, randInt, genKPIs, genGMVSeries, genCategoryData, genChannelData,
  genRegionData, genInventoryAlerts, genOrderEvent, forecastGMV,
  genAbandonmentCohorts, genDemandForecast, detectAnomalies,
  genActivityEvent, toCSV, CATEGORIES,
} from "./data/mockData";
import ChatBot from "./components/ChatBot";

// ─── Themes ────────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg:       "#080C16",
    panel:    "#0E1525",
    panelAlt: "#111927",
    border:   "#1C2B45",
    text:     "#E4ECF7",
    muted:    "#4E6080",
    dimmed:   "#182030",
    brand:    "#FF6B35",
    brandAlt: "#FF9F1C",
    success:  "#2DD4A0",
    danger:   "#F4476B",
    info:     "#38BDF8",
    shadow:   "#00000088",
    name:     "dark",
  },
  light: {
    bg:       "#F5F7FA",
    panel:    "#FFFFFF",
    panelAlt: "#F0F4F8",
    border:   "#DDE4EE",
    text:     "#1A2540",
    muted:    "#7A8FAD",
    dimmed:   "#E8EDF5",
    brand:    "#E85D1A",
    brandAlt: "#F59E0B",
    success:  "#0D9E72",
    danger:   "#E3294A",
    info:     "#0284C7",
    shadow:   "#00000022",
    name:     "light",
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmtINR = (n) =>
  n >= 1e7 ? `₹${(n/1e7).toFixed(2)}Cr` :
  n >= 1e5 ? `₹${(n/1e5).toFixed(1)}L`  :
  n >= 1e3 ? `₹${(n/1e3).toFixed(1)}K`  : `₹${Math.round(n)}`;
const pct  = (n) => `${n>=0?"+":""}${n.toFixed(1)}%`;
const fNum = (n) => n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(1)}K` : String(Math.round(n));

// ─── Custom Tooltip ─────────────────────────────────────────────────────────
function ChartTip({ active, payload, label, T }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 14px", fontSize:12, fontFamily:"'Sora',sans-serif", boxShadow:`0 4px 20px ${T.shadow}` }}>
      <div style={{ color:T.muted, marginBottom:4, fontSize:11 }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ color:p.color||T.brand, fontWeight:600 }}>
          {p.name}: {typeof p.value==="number" ? p.value.toLocaleString("en-IN") : p.value}
        </div>
      ))}
    </div>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────
function KPICard({ label, value, delta, sub, color, icon, T }) {
  const up = delta >= 0;
  return (
    <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:14, padding:"20px 22px", position:"relative", overflow:"hidden", transition:"box-shadow 0.2s" }}>
      <div style={{ position:"absolute", top:0, left:0, width:"100%", height:3, background:`linear-gradient(90deg,${color},${color}44)` }} />
      <div style={{ position:"absolute", top:16, right:16, fontSize:22, opacity:0.18 }}>{icon}</div>
      <div style={{ fontSize:11, color:T.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8, fontWeight:600 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:800, color:T.text, lineHeight:1, marginBottom:8, fontFamily:"'Sora',sans-serif" }}>{value}</div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:11, fontWeight:700, color:up?T.success:T.danger, background:up?`${T.success}18`:`${T.danger}18`, padding:"2px 8px", borderRadius:20 }}>
          {up?"▲":"▼"} {Math.abs(delta).toFixed(1)}%
        </span>
        <span style={{ fontSize:11, color:T.muted }}>{sub}</span>
      </div>
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────
function SH({ title, badge, T, action }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:3, height:18, background:T.brand, borderRadius:2 }} />
        <span style={{ fontSize:12, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:T.text }}>{title}</span>
        {badge && <span style={{ background:`${T.brand}20`, color:T.brand, fontSize:10, padding:"2px 9px", borderRadius:20, fontWeight:600 }}>{badge}</span>}
      </div>
      {action}
    </div>
  );
}

// ─── CSV Export Button ───────────────────────────────────────────────────────
function ExportBtn({ data, filename, T }) {
  return (
    <button onClick={() => toCSV(data, filename)} style={{
      background:"none", border:`1px solid ${T.border}`, borderRadius:8, color:T.muted,
      fontSize:10, padding:"4px 10px", cursor:"pointer", fontFamily:"'Sora',sans-serif",
      display:"flex", alignItems:"center", gap:5, fontWeight:600, transition:"all 0.2s",
    }}
      onMouseEnter={e => { e.target.style.borderColor=T.brand; e.target.style.color=T.brand; }}
      onMouseLeave={e => { e.target.style.borderColor=T.border; e.target.style.color=T.muted; }}
    >
      ↓ CSV
    </button>
  );
}

// ─── Date Range Filter ───────────────────────────────────────────────────────
function DateFilter({ value, onChange, T }) {
  const opts = [
    { label:"7D", days:7 }, { label:"30D", days:30 },
    { label:"60D", days:60 }, { label:"90D", days:90 },
  ];
  return (
    <div style={{ display:"flex", gap:4 }}>
      {opts.map(o => (
        <button key={o.days} onClick={() => onChange(o.days)} style={{
          background: value===o.days ? T.brand : "none",
          border: `1px solid ${value===o.days ? T.brand : T.border}`,
          borderRadius:8, color: value===o.days ? "#fff" : T.muted,
          fontSize:11, padding:"4px 12px", cursor:"pointer",
          fontFamily:"'Sora',sans-serif", fontWeight:600, transition:"all 0.2s",
        }}>{o.label}</button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [themeName, setThemeName] = useState("dark");
  const T = THEMES[themeName];

  const [dateRange,    setDateRange]    = useState(30);
  const [tab,          setTab]          = useState("overview");
  const [kpis,         setKpis]         = useState(() => genKPIs(30));
  const [gmvSeries,    setGmvSeries]    = useState(() => genGMVSeries(90));
  const [categories,   setCategories]   = useState(genCategoryData);
  const [channels,     setChannels]     = useState(genChannelData);
  const [regions,      setRegions]      = useState(genRegionData);
  const [inventory,    setInventory]    = useState(genInventoryAlerts);
  const [orders,       setOrders]       = useState(() => Array.from({length:8}, (_,i) => ({ ...genOrderEvent(), id:i })));
  const [activity,     setActivity]     = useState(() => Array.from({length:6}, (_,i) => ({ ...genActivityEvent(), id:i, ts:new Date(Date.now()-i*38000) })));
  const [abandonment,  setAbandonment]  = useState(genAbandonmentCohorts);
  const [demand,       setDemand]       = useState(genDemandForecast);
  const [liveGMV,      setLiveGMV]      = useState(287430);
  const [liveOrders,   setLiveOrders]   = useState(142);
  const [liveUsers,    setLiveUsers]    = useState(4821);
  const [tick,         setTick]         = useState(0);
  const tickRef = useRef(0);

  // filtered GMV based on date range
  const filteredGMV = gmvSeries.slice(-dateRange);
  const forecastData = forecastGMV(filteredGMV, 14);
  const anomalyData  = detectAnomalies(filteredGMV);

  // Combined chart for forecast view
  const combinedForecast = [
    ...filteredGMV.slice(-14).map(d => ({ ...d, predicted: null })),
    ...forecastData.map(d => ({ date:d.date, gmv:null, predicted:d.predicted })),
  ];

  // Live ticker
  useEffect(() => {
    const iv = setInterval(() => {
      tickRef.current++;
      setTick(t => t+1);
      setLiveGMV(p  => Math.max(100000, p * rand(0.97,1.04)));
      setLiveOrders(p => Math.max(10, Math.round(p * rand(0.95,1.07))));
      setLiveUsers(p  => Math.max(500, Math.round(p * rand(0.97,1.05))));

      if (tickRef.current % 6  === 0) setOrders(prev => [{ ...genOrderEvent(), id:Date.now() }, ...prev.slice(0,11)]);
      if (tickRef.current % 9  === 0) setActivity(prev => [{ ...genActivityEvent(), id:Date.now(), ts:new Date() }, ...prev.slice(0,8)]);
      if (tickRef.current % 18 === 0) { setKpis(genKPIs(dateRange)); setCategories(genCategoryData()); setChannels(genChannelData()); }
    }, 1800);
    return () => clearInterval(iv);
  }, [dateRange]);

  useEffect(() => {
    setGmvSeries(genGMVSeries(90));
    setKpis(genKPIs(dateRange));
  }, [dateRange]);

  const TABS = ["overview","ml insights","channels","inventory","live orders"];

  // status color
  const statusColor = (type) => ({ success:T.success, warn:T.brandAlt, danger:T.danger, info:T.info }[type] || T.muted);

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.text, fontFamily:"'Sora','Segoe UI',sans-serif", fontSize:13 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:${T.bg}}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .tab-pill{background:none;border:none;cursor:pointer;padding:7px 16px;border-radius:8px;font-family:'Sora',sans-serif;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;transition:all 0.18s;color:${T.muted}}
        .tab-pill:hover{background:${T.dimmed};color:${T.text}}
        .tab-pill.on{background:${T.brand};color:#fff}
        .row-hover:hover{background:${T.dimmed}!important}
        .pulse{animation:pulse 1.6s infinite}
      `}</style>

      {/* ── NAV ── */}
      <header style={{ position:"sticky", top:0, zIndex:200, background:`${T.panel}F0`, borderBottom:`1px solid ${T.border}`, backdropFilter:"blur(14px)", padding:"0 28px", height:58, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:`linear-gradient(135deg,${T.brand},${T.brandAlt})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:900, color:"#fff" }}>P</div>
          <div>
            <div style={{ fontWeight:800, fontSize:16, letterSpacing:"-0.03em", color:T.text }}>PulseCart</div>
            <div style={{ fontSize:9.5, color:T.muted, letterSpacing:"0.12em", textTransform:"uppercase" }}>Retail Intelligence</div>
          </div>
        </div>

        {/* Tabs */}
        <nav style={{ display:"flex", gap:4 }}>
          {TABS.map(t => <button key={t} className={`tab-pill ${tab===t?"on":""}`} onClick={()=>setTab(t)}>{t}</button>)}
        </nav>

        {/* Controls */}
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:T.success }}>
            <span className="pulse" style={{ display:"inline-block", width:7, height:7, borderRadius:"50%", background:T.success }} />
            LIVE · Tick #{tick}
          </div>
          {/* Theme toggle */}
          <button onClick={()=>setThemeName(n=>n==="dark"?"light":"dark")} style={{ background:T.dimmed, border:`1px solid ${T.border}`, borderRadius:8, padding:"6px 14px", color:T.text, cursor:"pointer", fontFamily:"'Sora',sans-serif", fontSize:12, fontWeight:600 }}>
            {themeName==="dark"?"☀ Light":"⬛ Dark"}
          </button>
        </div>
      </header>

      <main style={{ padding:"24px 28px 80px", maxWidth:1600, margin:"0 auto" }}>

        {/* ── Date Range bar ── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22 }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:800, letterSpacing:"-0.02em" }}>Retail Dashboard</h1>
            <p style={{ fontSize:12, color:T.muted, marginTop:2 }}>All figures in INR · Powered by PulseCart ML Engine</p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:11, color:T.muted, fontWeight:600 }}>Date Range:</span>
            <DateFilter value={dateRange} onChange={setDateRange} T={T} />
          </div>
        </div>

        {/* ── Live pulse strip ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:22 }}>
          {[
            { label:"Live GMV (session)", value:fmtINR(liveGMV),         icon:"📦", color:T.brand   },
            { label:"Orders / hr",         value:liveOrders.toLocaleString("en-IN"), icon:"🛒", color:T.success },
            { label:"Active Sessions",     value:liveUsers.toLocaleString("en-IN"),  icon:"👤", color:T.info   },
          ].map(item => (
            <div key={item.label} style={{ background:T.panel, border:`1px solid ${item.color}44`, borderRadius:12, padding:"14px 18px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:10, color:T.muted, textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:600 }}>{item.label}</div>
                <div style={{ fontSize:22, fontWeight:800, color:item.color, fontFamily:"'Sora',sans-serif", marginTop:4 }}>{item.value}</div>
              </div>
              <div style={{ fontSize:28, opacity:0.6 }}>{item.icon}</div>
            </div>
          ))}
        </div>

        {/* ══════════ OVERVIEW TAB ══════════ */}
        {tab === "overview" && (
          <>
            {/* KPI grid */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:22 }}>
              <KPICard label="GMV"              value={fmtINR(kpis.gmv)}           delta={rand(2,18)}  sub={`last ${dateRange} days`} color={T.brand}   icon="📦" T={T} />
              <KPICard label="Avg Order Value"  value={fmtINR(kpis.aov)}           delta={rand(-3,9)}  sub="per transaction"          color={T.success} icon="🛒" T={T} />
              <KPICard label="Conversion Rate"  value={`${kpis.convRate.toFixed(2)}%`} delta={rand(-1,5)} sub="sessions → orders"     color={T.info}    icon="⚡" T={T} />
              <KPICard label="Cart Abandonment" value={`${kpis.cartAbandRate.toFixed(1)}%`} delta={-rand(0.5,4)} sub="needs attention"  color={T.danger}  icon="🛑" T={T} />
              <KPICard label="Net Revenue"      value={fmtINR(kpis.netRevenue)}    delta={rand(1,14)}  sub="after returns+COGS"       color={T.brandAlt}icon="💰" T={T} />
              <KPICard label="Return Rate"      value={`${kpis.returnRate.toFixed(1)}%`} delta={-rand(0,6)} sub="industry avg 12%"   color={T.danger}  icon="↩" T={T} />
              <KPICard label="Customer LTV"     value={fmtINR(kpis.ltv)}           delta={rand(2,12)}  sub="avg per customer"         color={T.success} icon="♾" T={T} />
              <KPICard label="Inventory Turns"  value={`${kpis.invTurnover.toFixed(1)}x`} delta={rand(-2,8)} sub="per year"         color={T.info}    icon="🔄" T={T} />
            </div>

            {/* GMV Area chart + Activity */}
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:18, marginBottom:18 }}>
              <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:14, padding:22 }}>
                <SH title={`GMV Trend · Last ${dateRange} Days`} T={T}
                  action={<ExportBtn data={filteredGMV} filename="pulsecart_gmv.csv" T={T} />}
                />
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={filteredGMV} margin={{left:0,right:0}}>
                    <defs>
                      <linearGradient id="gGMV" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={T.brand} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={T.brand} stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.dimmed} vertical={false} />
                    <XAxis dataKey="date" tick={{ fill:T.muted, fontSize:9 }} axisLine={false} tickLine={false} interval={Math.floor(dateRange/8)} />
                    <YAxis tickFormatter={v=>`₹${(v/1e5).toFixed(0)}L`} tick={{ fill:T.muted, fontSize:9 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip T={T} />} />
                    <Area type="monotone" dataKey="gmv" name="GMV (₹)" stroke={T.brand} strokeWidth={2.5} fill="url(#gGMV)" dot={false} />
                    <Area type="monotone" dataKey="orders" name="Orders" stroke={T.info} strokeWidth={1.5} fill="none" dot={false} strokeDasharray="4 2" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Activity */}
              <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:14, padding:22, overflow:"hidden" }}>
                <SH title="Live Activity" badge={`${activity.length} events`} T={T} />
                <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
                  {activity.slice(0,7).map((ev,i) => (
                    <div key={ev.id} style={{ display:"flex", gap:10, alignItems:"flex-start", animation:i===0?"fadeSlide 0.3s":"none" }}>
                      <div style={{ width:7, height:7, borderRadius:"50%", background:statusColor(ev.type), marginTop:5, flexShrink:0 }} />
                      <div>
                        <div style={{ fontSize:11.5, color:T.text, lineHeight:1.45 }}>{ev.msg}</div>
                        <div style={{ fontSize:10, color:T.muted, marginTop:1 }}>{ev.ts.toLocaleTimeString("en-IN")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Category + Region */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
              <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:14, padding:22 }}>
                <SH title="Category Revenue" T={T} action={<ExportBtn data={categories} filename="pulsecart_categories.csv" T={T} />} />
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={categories} layout="vertical" margin={{left:4,right:16}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.dimmed} horizontal={false} />
                    <XAxis type="number" tickFormatter={v=>`₹${(v/1e5).toFixed(0)}L`} tick={{ fill:T.muted, fontSize:9 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="cat" tick={{ fill:T.text, fontSize:11 }} axisLine={false} tickLine={false} width={88} />
                    <Tooltip content={<ChartTip T={T} />} />
                    <Bar dataKey="revenue" name="Revenue (₹)" fill={T.brand} fillOpacity={0.85} radius={[0,5,5,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:14, padding:22 }}>
                <SH title="Region Performance" T={T} action={<ExportBtn data={regions} filename="pulsecart_regions.csv" T={T} />} />
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                      {["City","Revenue","Orders","AOV","Growth"].map(h => (
                        <th key={h} style={{ padding:"6px 10px", textAlign:"left", color:T.muted, fontSize:10, fontWeight:600, letterSpacing:"0.06em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {regions.map(r => (
                      <tr key={r.r} className="row-hover" style={{ borderBottom:`1px solid ${T.dimmed}`, transition:"background 0.15s" }}>
                        <td style={{ padding:"9px 10px", fontWeight:600, color:T.text }}>{r.r}</td>
                        <td style={{ padding:"9px 10px", color:T.brand, fontWeight:700 }}>{fmtINR(r.revenue)}</td>
                        <td style={{ padding:"9px 10px", color:T.muted }}>{fNum(r.orders)}</td>
                        <td style={{ padding:"9px 10px", color:T.text }}>{fmtINR(r.aov)}</td>
                        <td style={{ padding:"9px 10px", color:r.growth>=0?T.success:T.danger, fontWeight:600 }}>{pct(r.growth)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ══════════ ML INSIGHTS TAB ══════════ */}
        {tab === "ml insights" && (
          <>
            {/* Model status bar */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:22 }}>
              {[
                { name:"GMV Forecasting",        algo:"Linear Regression + Trend Decomposition", acc:rand(91,97).toFixed(1), color:T.success },
                { name:"Cart Abandonment Model",  algo:"Gradient Boosting Classifier",           acc:rand(86,93).toFixed(1), color:T.brand   },
                { name:"Demand Planning (SKU)",   algo:"Random Forest + ARIMA Ensemble",         acc:rand(88,95).toFixed(1), color:T.info    },
              ].map(m => (
                <div key={m.name} style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:14, padding:20 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{m.name}</div>
                    <span style={{ background:`${m.color}20`, color:m.color, fontSize:10, padding:"3px 9px", borderRadius:20, fontWeight:600 }}>Active</span>
                  </div>
                  <div style={{ fontSize:10, color:T.muted, marginBottom:12 }}>{m.algo}</div>
                  <div style={{ display:"flex", alignItems:"baseline", gap:4, marginBottom:8 }}>
                    <span style={{ fontSize:30, fontWeight:800, color:m.color }}>{m.acc}%</span>
                    <span style={{ fontSize:11, color:T.muted }}>accuracy</span>
                  </div>
                  <div style={{ height:4, background:T.dimmed, borderRadius:2 }}>
                    <div style={{ height:"100%", width:`${m.acc}%`, background:`linear-gradient(90deg,${m.color},${m.color}66)`, borderRadius:2 }} />
                  </div>
                </div>
              ))}
            </div>

            {/* GMV Forecast chart */}
            <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:14, padding:22, marginBottom:18 }}>
              <SH title="14-Day GMV Forecast" badge="ML Prediction" T={T} action={<ExportBtn data={forecastData} filename="pulsecart_forecast.csv" T={T} />} />
              <div style={{ display:"flex", gap:20, marginBottom:12, fontSize:11 }}>
                <span style={{ color:T.brand }}>── Historical GMV</span>
                <span style={{ color:T.brandAlt }}>- - ML Forecast</span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={combinedForecast}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.dimmed} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill:T.muted, fontSize:9 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v=>`₹${(v/1e5).toFixed(0)}L`} tick={{ fill:T.muted, fontSize:9 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip T={T} />} />
                  <Line type="monotone" dataKey="gmv"       name="Actual GMV"    stroke={T.brand}    strokeWidth={2.5} dot={false} connectNulls={false} />
                  <Line type="monotone" dataKey="predicted" name="ML Forecast"   stroke={T.brandAlt} strokeWidth={2}   dot={{ fill:T.brandAlt, r:3 }} strokeDasharray="6 3" connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
              {/* Abandonment cohorts */}
              <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:14, padding:22 }}>
                <SH title="Cart Abandonment Risk Cohorts" badge="Propensity Model" T={T} />
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {abandonment.map(c => (
                    <div key={c.cohort}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                        <span style={{ fontSize:11.5, color:T.text, fontWeight:500 }}>{c.cohort}</span>
                        <span style={{ fontSize:11, fontWeight:700, color: c.risk>65?T.danger:c.risk>45?T.brandAlt:T.success }}>{c.risk.toFixed(0)}% risk</span>
                      </div>
                      <div style={{ height:5, background:T.dimmed, borderRadius:3 }}>
                        <div style={{ height:"100%", width:`${c.risk}%`, background: c.risk>65?T.danger:c.risk>45?T.brandAlt:T.success, borderRadius:3, transition:"width 0.6s" }} />
                      </div>
                      <div style={{ fontSize:10, color:T.muted, marginTop:3 }}>{fNum(c.sessions)} sessions in cohort</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Demand forecast radar */}
              <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:14, padding:22 }}>
                <SH title="Demand Forecast vs Actual" badge="SKU-Level ML" T={T} action={<ExportBtn data={demand} filename="pulsecart_demand.csv" T={T} />} />
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={demand.map(d=>({ cat:d.cat.split(" ")[0], actual:Math.round(d.actual/1000), predicted:Math.round(d.predicted/1000) }))}>
                    <PolarGrid stroke={T.dimmed} />
                    <PolarAngleAxis dataKey="cat" tick={{ fill:T.muted, fontSize:10 }} />
                    <PolarRadiusAxis tick={{ fill:T.muted, fontSize:8 }} />
                    <Radar name="Actual"    dataKey="actual"    stroke={T.brand}   fill={T.brand}   fillOpacity={0.25} strokeWidth={2} />
                    <Radar name="Forecast"  dataKey="predicted" stroke={T.info}    fill={T.info}    fillOpacity={0.15} strokeWidth={2} strokeDasharray="4 2" />
                    <Legend wrapperStyle={{ fontSize:11, color:T.muted }} />
                    <Tooltip content={<ChartTip T={T} />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Anomaly detection */}
            <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:14, padding:22, marginTop:18 }}>
              <SH title="GMV Anomaly Detection" badge={`${anomalyData.filter(d=>d.isAnomaly).length} anomalies flagged · σ > 2.0`} T={T} />
              <ResponsiveContainer width="100%" height={180}>
                <ScatterChart margin={{left:0,right:8}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.dimmed} />
                  <XAxis dataKey="x" name="Day" tick={{ fill:T.muted, fontSize:9 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="gmv" name="GMV" tickFormatter={v=>`₹${(v/1e5).toFixed(0)}L`} tick={{ fill:T.muted, fontSize:9 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip T={T} />} />
                  <Scatter name="Normal"  data={anomalyData.filter(d=>!d.isAnomaly).map((d,i)=>({ x:i, gmv:d.gmv }))} fill={T.brand}  fillOpacity={0.65} r={4} />
                  <Scatter name="Anomaly" data={anomalyData.filter(d=> d.isAnomaly).map((d,i)=>({ x:i, gmv:d.gmv }))} fill={T.danger} r={8} />
                </ScatterChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", gap:20, marginTop:10, fontSize:11 }}>
                <span style={{ color:T.brand }}>● Normal data</span>
                <span style={{ color:T.danger }}>● Anomaly (z-score &gt; 2.0) — likely flash sale or system error</span>
              </div>
            </div>
          </>
        )}

        {/* ══════════ CHANNELS TAB ══════════ */}
        {tab === "channels" && (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:18 }}>
              <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:14, padding:22 }}>
                <SH title="Revenue by Channel" T={T} action={<ExportBtn data={channels} filename="pulsecart_channels.csv" T={T} />} />
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={channels} layout="vertical" margin={{left:8,right:20}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.dimmed} horizontal={false} />
                    <XAxis type="number" tickFormatter={v=>`₹${(v/1e5).toFixed(0)}L`} tick={{ fill:T.muted, fontSize:9 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="ch" tick={{ fill:T.text, fontSize:11 }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip content={<ChartTip T={T} />} />
                    <Bar dataKey="revenue" name="Revenue (₹)" fill={T.brand} fillOpacity={0.85} radius={[0,5,5,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:14, padding:22 }}>
                <SH title="Conversion Rate by Channel" T={T} />
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={channels} layout="vertical" margin={{left:8,right:20}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.dimmed} horizontal={false} />
                    <XAxis type="number" tickFormatter={v=>`${v.toFixed(1)}%`} tick={{ fill:T.muted, fontSize:9 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="ch" tick={{ fill:T.text, fontSize:11 }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip content={<ChartTip T={T} />} />
                    <Bar dataKey="conv" name="Conv Rate %" fill={T.success} fillOpacity={0.85} radius={[0,5,5,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Channel table */}
            <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:14, padding:22 }}>
              <SH title="Channel Attribution Matrix" T={T} action={<ExportBtn data={channels} filename="pulsecart_attribution.csv" T={T} />} />
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                    {["Channel","Sessions","Conv %","Revenue","CAC (₹)","ROAS","Performance"].map(h=>(
                      <th key={h} style={{ padding:"8px 12px", textAlign:"left", color:T.muted, fontSize:10, fontWeight:600, letterSpacing:"0.06em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {channels.sort((a,b)=>b.revenue-a.revenue).map(c => (
                    <tr key={c.ch} className="row-hover" style={{ borderBottom:`1px solid ${T.dimmed}` }}>
                      <td style={{ padding:"11px 12px", fontWeight:700, color:T.text }}>{c.ch}</td>
                      <td style={{ padding:"11px 12px", color:T.muted }}>{fNum(c.sessions)}</td>
                      <td style={{ padding:"11px 12px", color:T.info, fontWeight:600 }}>{c.conv.toFixed(2)}%</td>
                      <td style={{ padding:"11px 12px", color:T.brand, fontWeight:700 }}>{fmtINR(c.revenue)}</td>
                      <td style={{ padding:"11px 12px", color:T.text }}>₹{Math.round(c.cac)}</td>
                      <td style={{ padding:"11px 12px", color:c.roas>=3?T.success:c.roas>=2?T.brandAlt:T.danger, fontWeight:600 }}>{c.roas.toFixed(2)}x</td>
                      <td style={{ padding:"11px 12px" }}>
                        <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                          <div style={{ width:80, height:4, background:T.dimmed, borderRadius:2 }}>
                            <div style={{ height:"100%", width:`${Math.min(100,(c.roas/7)*100)}%`, background:c.roas>=3?T.success:c.roas>=2?T.brandAlt:T.danger, borderRadius:2 }} />
                          </div>
                          <span style={{ fontSize:10, color:c.roas>=3?T.success:T.muted }}>{c.roas>=3?"Strong":c.roas>=2?"Moderate":"Weak"}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ══════════ INVENTORY TAB ══════════ */}
        {tab === "inventory" && (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:20 }}>
              {[
                { label:"SKUs at Critical Stock",  value:inventory.filter(i=>i.status==="critical").length, color:T.danger,   icon:"🚨" },
                { label:"SKUs at Low Stock",        value:inventory.filter(i=>i.status==="low").length,     color:T.brandAlt, icon:"⚠️" },
                { label:"Avg Inventory Turnover",   value:`${(inventory.reduce((s,i)=>s+parseFloat(i.turnover),0)/inventory.length).toFixed(1)}x`, color:T.success, icon:"🔄" },
              ].map(s=>(
                <div key={s.label} style={{ background:T.panel, border:`1px solid ${s.color}44`, borderRadius:14, padding:"18px 22px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:10, color:T.muted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600, marginBottom:6 }}>{s.label}</div>
                    <div style={{ fontSize:28, fontWeight:800, color:s.color }}>{s.value}</div>
                  </div>
                  <div style={{ fontSize:32 }}>{s.icon}</div>
                </div>
              ))}
            </div>

            <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:14, padding:22, marginBottom:18 }}>
              <SH title="Inventory Alert Dashboard" badge="Reorder Intelligence" T={T} action={<ExportBtn data={inventory} filename="pulsecart_inventory.csv" T={T} />} />
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                    {["Product","Current Stock","Reorder Point","Turnover Rate","Status","Action"].map(h=>(
                      <th key={h} style={{ padding:"8px 12px", textAlign:"left", color:T.muted, fontSize:10, fontWeight:600, letterSpacing:"0.06em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inventory.map(i=>(
                    <tr key={i.product} className="row-hover" style={{ borderBottom:`1px solid ${T.dimmed}` }}>
                      <td style={{ padding:"12px", fontWeight:600, color:T.text }}>{i.product}</td>
                      <td style={{ padding:"12px" }}>
                        <span style={{ fontWeight:700, color:i.stock<20?T.danger:i.stock<40?T.brandAlt:T.success }}>{i.stock} units</span>
                      </td>
                      <td style={{ padding:"12px", color:T.muted }}>{i.reorder} units</td>
                      <td style={{ padding:"12px", color:T.info }}>{i.turnover}x / yr</td>
                      <td style={{ padding:"12px" }}>
                        <span style={{ background:i.status==="critical"?`${T.danger}20`:`${T.brandAlt}20`, color:i.status==="critical"?T.danger:T.brandAlt, fontSize:10, padding:"3px 10px", borderRadius:20, fontWeight:700 }}>
                          {i.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding:"12px" }}>
                        <button style={{ background:`${T.brand}20`, color:T.brand, border:"none", borderRadius:8, padding:"5px 12px", fontSize:11, cursor:"pointer", fontWeight:600 }}>
                          Reorder
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:14, padding:22 }}>
              <SH title="Stock Level vs Reorder Point" T={T} />
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={inventory} margin={{left:0,right:8}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.dimmed} vertical={false} />
                  <XAxis dataKey="product" tick={{ fill:T.muted, fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={v=>v.split(" ")[0]} />
                  <YAxis tick={{ fill:T.muted, fontSize:9 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip T={T} />} />
                  <Legend wrapperStyle={{ fontSize:11, color:T.muted }} />
                  <Bar dataKey="stock"   name="Current Stock"  fill={T.brand}   fillOpacity={0.85} radius={[4,4,0,0]} />
                  <Bar dataKey="reorder" name="Reorder Point"  fill={T.muted}   fillOpacity={0.5}  radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* ══════════ LIVE ORDERS TAB ══════════ */}
        {tab === "live orders" && (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:18 }}>
              <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:14, padding:22 }}>
                <SH title="Live Order Feed" badge="Real-time · Socket.IO" T={T} action={<ExportBtn data={orders} filename="pulsecart_orders.csv" T={T} />} />
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                      {["Order ID","Customer","Category","Channel","Region","Amount","Status"].map(h=>(
                        <th key={h} style={{ padding:"7px 10px", textAlign:"left", color:T.muted, fontSize:10, fontWeight:600, letterSpacing:"0.05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o,i)=>(
                      <tr key={o.id} className="row-hover" style={{ borderBottom:`1px solid ${T.dimmed}`, animation:i===0?"fadeSlide 0.3s":"none" }}>
                        <td style={{ padding:"10px 10px", fontFamily:"monospace", fontSize:11, color:T.brand }}>{o.id}</td>
                        <td style={{ padding:"10px 10px", fontWeight:600, color:T.text, fontSize:12 }}>{o.customer}</td>
                        <td style={{ padding:"10px 10px", color:T.muted, fontSize:11 }}>{o.category}</td>
                        <td style={{ padding:"10px 10px", color:T.muted, fontSize:11 }}>{o.channel}</td>
                        <td style={{ padding:"10px 10px", color:T.muted, fontSize:11 }}>{o.region}</td>
                        <td style={{ padding:"10px 10px", fontWeight:700, color:T.success }}>₹{o.amount.toLocaleString("en-IN")}</td>
                        <td style={{ padding:"10px 10px" }}>
                          <span style={{ fontSize:10, padding:"3px 9px", borderRadius:20, fontWeight:600, background:
                            o.status==="delivered"?`${T.success}20`:
                            o.status==="shipped"?`${T.info}20`:
                            o.status==="processing"?`${T.brandAlt}20`:`${T.muted}20`,
                          color:
                            o.status==="delivered"?T.success:
                            o.status==="shipped"?T.info:
                            o.status==="processing"?T.brandAlt:T.muted
                          }}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* GMV by category donut-style bars */}
              <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:14, padding:22 }}>
                <SH title="Orders by Category" T={T} />
                <div style={{ display:"flex", flexDirection:"column", gap:14, marginTop:8 }}>
                  {categories.map((c,i)=>{
                    const pctVal = Math.round((c.units / categories.reduce((s,x)=>s+x.units,0))*100);
                    const colors = [T.brand, T.info, T.success, T.brandAlt, T.danger, T.muted];
                    return (
                      <div key={c.cat}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                          <span style={{ fontSize:12, color:T.text, fontWeight:600 }}>{c.cat}</span>
                          <span style={{ fontSize:11, color:colors[i], fontWeight:700 }}>{pctVal}%</span>
                        </div>
                        <div style={{ height:6, background:T.dimmed, borderRadius:3 }}>
                          <div style={{ height:"100%", width:`${pctVal}%`, background:colors[i], borderRadius:3, transition:"width 0.5s" }} />
                        </div>
                        <div style={{ fontSize:10, color:T.muted, marginTop:3 }}>{c.units.toLocaleString()} units · {pct(c.growth_wow)} WoW</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

      </main>

      {/* ── AI Chatbot ── */}
      <ChatBot theme={T} />
    </div>
  );
}
