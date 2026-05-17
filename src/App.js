import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Login from './components/Login';
import Sentiment from './components/Sentiment';
import TaxPage from './components/TaxPage';
import SettingsTab from './components/SettingsTab';
import AnalyticsTab from './components/AnalyticsTab';
import { useAuth } from './contexts/AuthContext';
import { toCSV } from './data/utils';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const THEMES = {
  light: { bg:'#F0F4FF', panel:'#FFFFFF', panelAlt:'#F5F7FF', border:'#DDE3F4', text:'#0F172A', muted:'#64748B', dimmed:'#EEF2FF', brand:'#D64E12', brandAlt:'#E8920A', success:'#059669', danger:'#DC2626', info:'#0284C7', shadow:'#0000001A', name:'light' },
  dark:  { bg:'#060B14', panel:'#0C1524', panelAlt:'#101D2E', border:'#182A42', text:'#E2EAF8', muted:'#4A6080', dimmed:'#131F30', brand:'#FF6B35', brandAlt:'#FF9F1C', success:'#10B981', danger:'#EF4444', info:'#38BDF8', shadow:'#00000099', name:'dark' },
};

const fmtINR = n => n>=1e7?`₹${(n/1e7).toFixed(2)}Cr`:n>=1e5?`₹${(n/1e5).toFixed(1)}L`:n>=1e3?`₹${(n/1e3).toFixed(1)}K`:`₹${Math.round(n)}`;

function SH({ title, badge, T, action }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
        <div style={{ width:3, height:16, background:T.brand, borderRadius:2 }} />
        <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:T.text }}>{title}</span>
        {badge && <span style={{ background:`${T.brand}18`, color:T.brand, fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:600 }}>{badge}</span>}
      </div>
      {action}
    </div>
  );
}

function KPICard({ label, value, sub, color, icon, T }) {
  return (
    <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:12, padding:'18px 20px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${color},${color}33)` }} />
      <div style={{ position:'absolute', top:14, right:14, fontSize:20, opacity:0.12 }}>{icon}</div>
      <div style={{ fontSize:10, color:T.muted, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:8, fontWeight:600 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:700, color:T.text, lineHeight:1, marginBottom:6, letterSpacing:'-0.02em' }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:T.muted }}>{sub}</div>}
    </div>
  );
}

function Dashboard({ user, isOwner, apiFetch, logout }) {
  const [themeName, setThemeName] = useState(() => localStorage.getItem('theme') || 'light');
  const T = THEMES[themeName];

  useEffect(() => { localStorage.setItem('theme', themeName); document.body.style.background = T.bg; }, [themeName, T.bg]);

  const TABS = isOwner
    ? ['overview', 'inventory', 'analytics', 'sentiment', 'tax', 'settings']
    : ['inventory', 'sentiment', 'settings'];

  const [tab, setTab] = useState(TABS[0]);
  const [showSettings, setShowSettings] = useState(false);

  // ── Inventory State ──────────────────────────────────────────────────────────
  const [inventory,    setInventory]    = useState([]);
  const [reorderState, setReorderState] = useState({});
  const [invLoading,   setInvLoading]   = useState(false);

  // ── Overview KPIs ────────────────────────────────────────────────────────────
  const [kpis,       setKpis]       = useState(null);
  const [categories, setCategories] = useState([]);
  const [lowStock,   setLowStock]   = useState([]);

  const fetchInventory = async () => {
    setInvLoading(true);
    try {
      const res = await apiFetch('/api/products');
      const d   = await res.json();
      if (d.success) setInventory(d.data || []);
    } catch (e) { console.error('Inventory fetch failed', e); }
    setInvLoading(false);
  };

  const fetchOverview = async () => {
    if (!isOwner) return;
    try {
      const [kpiRes, catRes, lsRes] = await Promise.all([
        apiFetch('/api/analytics/kpis'),
        apiFetch('/api/analytics/categories'),
        apiFetch('/api/analytics/low-stock'),
      ]);
      if (kpiRes.ok) { const d = await kpiRes.json(); if (d.success) setKpis(d.data); }
      if (catRes.ok) { const d = await catRes.json(); if (d.success) setCategories(d.data || []); }
      if (lsRes.ok)  { const d = await lsRes.json();  if (d.success) setLowStock(d.data || []); }
    } catch (e) { console.error('Overview fetch failed', e); }
  };

  useEffect(() => {
    fetchInventory();
    if (isOwner) fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Socket.IO — live inventory updates ───────────────────────────────────────
  const socketRef = useRef(null);
  useEffect(() => {
    const socket = io(API, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('inventoryUpdated', () => {
      fetchInventory();
      if (isOwner) fetchOverview();
    });
    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerReorder = async (item) => {
    setReorderState(p => ({ ...p, [item.id]: 'loading' }));
    try {
      const res = await apiFetch(`/api/inventory/${item.id}/reorder`, {
        method: 'POST',
        body: JSON.stringify({ quantity: 50, note: 'Manual reorder from dashboard' }),
      });
      const d = await res.json();
      setReorderState(p => ({ ...p, [item.id]: d.success ? 'done' : 'error' }));
    } catch { setReorderState(p => ({ ...p, [item.id]: 'error' })); }
  };

  const statusColor = s => s === 'critical' ? T.danger : s === 'low' ? T.brandAlt : T.success;

  // ── Inventory Tab ────────────────────────────────────────────────────────────
  const InventoryTab = () => (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:700, color:T.text }}>Inventory</h2>
          <p style={{ fontSize:12, color:T.muted, marginTop:3 }}>Real-time stock · MySQL-persisted</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          {isOwner && <button onClick={() => window.open(`${API}/api/inventory/export?token=${localStorage.getItem('pc_token')}`,'_blank')} style={{ background:T.brand, color:'#fff', border:'none', padding:'8px 14px', borderRadius:8, cursor:'pointer', fontSize:12 }}>↓ Export CSV</button>}
          <button onClick={fetchInventory} style={{ background:T.dimmed, border:`1px solid ${T.border}`, padding:'8px 14px', borderRadius:8, cursor:'pointer', fontSize:12 }}>↺ Refresh</button>
        </div>
      </div>

      {invLoading && <div style={{ textAlign:'center', color:T.muted, padding:40 }}>Loading inventory…</div>}

      {!invLoading && (
        <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${T.border}`, background:T.dimmed }}>
                {['SKU','Product','Category','Stock','Reorder At','Price','Location','Status', isOwner?'Action':''].filter(Boolean).map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', color:T.muted, fontSize:10, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inventory.length === 0 && (
                <tr><td colSpan="9" style={{ padding:40, textAlign:'center', color:T.muted }}>No products in inventory. Add your first product via the API.</td></tr>
              )}
              {inventory.map(item => (
                <tr key={item.id} style={{ borderBottom:`1px solid ${T.dimmed}`, transition:'background 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = T.dimmed}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding:'12px 14px', fontFamily:'monospace', fontSize:11, color:T.brand }}>{item.sku}</td>
                  <td style={{ padding:'12px 14px', fontWeight:600, color:T.text }}>{item.product}</td>
                  <td style={{ padding:'12px 14px', color:T.muted, fontSize:11 }}>{item.category || '—'}</td>
                  <td style={{ padding:'12px 14px', fontWeight:700, color:statusColor(item.status) }}>{item.stock} units</td>
                  <td style={{ padding:'12px 14px', color:T.muted }}>{item.reorder_threshold}</td>
                  <td style={{ padding:'12px 14px', color:T.text }}>₹{Number(item.price).toLocaleString('en-IN')}</td>
                  <td style={{ padding:'12px 14px', color:T.muted, fontSize:11 }}>{item.location}</td>
                  <td style={{ padding:'12px 14px' }}>
                    <span style={{ background:`${statusColor(item.status)}18`, color:statusColor(item.status), fontSize:10, padding:'3px 9px', borderRadius:20, fontWeight:600 }}>
                      {(item.status || 'healthy').toUpperCase()}
                    </span>
                  </td>
                  {isOwner && (
                    <td style={{ padding:'12px 14px' }}>
                      <button
                        onClick={() => triggerReorder(item)}
                        disabled={reorderState[item.id] === 'loading'}
                        title="Reorder 50 units"
                        style={{ background: reorderState[item.id]==='done'?T.success:T.brand, color:'#fff', border:'none', borderRadius:6, padding:'5px 10px', cursor:'pointer', fontSize:11 }}>
                        {reorderState[item.id]==='loading'?'…':reorderState[item.id]==='done'?'✓ Done':'⟳ Reorder'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ── Overview Tab ─────────────────────────────────────────────────────────────
  const OverviewTab = () => {
    if (!isOwner) return null;
    if (!kpis) return <div style={{ textAlign:'center', padding:60, color:T.muted }}>Loading analytics from MySQL…</div>;

    return (
      <div>
        <div style={{ marginBottom:22 }}>
          <h1 style={{ fontSize:22, fontWeight:700, color:T.text }}>Overview</h1>
          <p style={{ fontSize:12, color:T.muted, marginTop:4 }}>Inventory KPIs · Source: MySQL real-time queries</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:22 }}>
          <KPICard label="Total Products"    value={kpis.total_products}                           sub="SKUs in catalog"       color={T.brand}    icon="📦" T={T} />
          <KPICard label="Total Units"       value={kpis.total_units?.toLocaleString('en-IN')}     sub="Units across all SKUs" color={T.info}     icon="🔢" T={T} />
          <KPICard label="Inventory Value"   value={fmtINR(kpis.inventory_value)}                  sub="quantity × price"      color={T.success}  icon="₹" T={T} />
          <KPICard label="Low Stock Items"   value={kpis.low_stock_count}                          sub={`${kpis.critical_count} critical`} color={T.danger} icon="⚠" T={T} />
          <KPICard label="Reorders (30d)"    value={kpis.reorder_count}                            sub="Reorder requests"      color={T.brandAlt} icon="🔄" T={T} />
          <KPICard label="Movements (30d)"   value={kpis.movement_count}                           sub="Stock change events"   color={T.muted}    icon="📊" T={T} />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:12, padding:20 }}>
            <SH title="Category Breakdown" T={T} action={<button onClick={()=>toCSV(categories,'categories.csv')} style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:6, color:T.muted, fontSize:10, padding:'4px 10px', cursor:'pointer' }}>↓ CSV</button>} />
            {categories.map((c,i) => {
              const maxVal = Math.max(...categories.map(x=>Number(x.total_value||0)));
              const pct = maxVal > 0 ? (Number(c.total_value)/maxVal)*100 : 0;
              const colors = [T.brand, T.info, T.success, T.brandAlt, T.danger];
              return (
                <div key={c.category} style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:12, color:T.text, fontWeight:500 }}>{c.category}</span>
                    <span style={{ fontSize:11, color:colors[i%5], fontWeight:700 }}>{fmtINR(Number(c.total_value||0))}</span>
                  </div>
                  <div style={{ height:5, background:T.dimmed, borderRadius:3 }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:colors[i%5], borderRadius:3, transition:'width 0.5s' }} />
                  </div>
                  <div style={{ fontSize:10, color:T.muted, marginTop:2 }}>{c.total_units || 0} units · {c.product_count} SKUs · {c.low_stock_count} low-stock</div>
                </div>
              );
            })}
          </div>

          <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:12, padding:20 }}>
            <SH title="Low Stock Alerts" badge={`${lowStock.length} items`} T={T} />
            {lowStock.length === 0 && <div style={{ color:T.muted, fontSize:12, textAlign:'center', padding:20 }}>All stock levels healthy ✓</div>}
            {lowStock.slice(0,8).map(item => (
              <div key={item.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:`1px solid ${T.dimmed}` }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:T.text }}>{item.product}</div>
                  <div style={{ fontSize:10, color:T.muted, marginTop:2 }}>{item.sku} · {item.category}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:statusColor(item.status) }}>{item.stock} / {item.reorder_threshold}</div>
                  <span style={{ fontSize:10, padding:'2px 7px', borderRadius:20, fontWeight:600, background:`${statusColor(item.status)}18`, color:statusColor(item.status) }}>{item.status?.toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight:'100vh', background:T.bg, color:T.text, fontFamily:"'IBM Plex Sans','Segoe UI',sans-serif", fontSize:13 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:${T.bg}}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
        .tab-btn{background:none;border:none;cursor:pointer;padding:8px 16px;border-radius:10px;font-family:'IBM Plex Sans',sans-serif;font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;transition:all 0.2s;color:${T.muted};white-space:nowrap}
        .tab-btn:hover{background:${T.dimmed};color:${T.text}}
        .tab-btn.active{background:linear-gradient(135deg,${T.brand},${T.brandAlt});color:#fff;box-shadow:0 4px 12px ${T.brand}44}
      `}</style>

      {/* Settings Drawer */}
      <div style={{ position:'fixed', top:0, right:showSettings?0:'-400px', width:380, height:'100vh', background:T.panel, zIndex:1000, boxShadow:`-10px 0 30px ${T.shadow}`, transition:'right 0.3s ease-in-out', padding:30, borderLeft:`1px solid ${T.border}`, overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:24 }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:T.text }}>Settings</h2>
          <button onClick={() => setShowSettings(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:T.text }}>✕</button>
        </div>
        <SettingsTab T={T} setThemeName={setThemeName} themeName={themeName} />
      </div>
      {showSettings && <div onClick={() => setShowSettings(false)} style={{ position:'fixed', inset:0, zIndex:999, background:'rgba(0,0,0,0.3)' }} />}

      {/* Settings toggle button */}
      <button onClick={() => setShowSettings(true)} style={{ position:'fixed', right:0, top:'50%', transform:'translateY(-50%)', background:T.panel, border:`1px solid ${T.border}`, borderRight:'none', padding:'12px 8px', borderRadius:'10px 0 0 10px', cursor:'pointer', zIndex:900, display:'flex', flexDirection:'column', gap:5, alignItems:'center' }}>
        <span style={{ fontSize:16 }}>⚙</span>
        <span style={{ fontSize:9, fontWeight:700, transform:'rotate(-90deg)', marginTop:15 }}>SETTINGS</span>
      </button>

      {/* Navbar */}
      <header style={{ position:'sticky', top:0, zIndex:200, background:`${T.panel}EE`, borderBottom:`1px solid ${T.border}`, backdropFilter:'blur(16px)', padding:'0 24px', height:58, display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:`linear-gradient(135deg,${T.brand},${T.brandAlt})`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:16, color:'#fff', boxShadow:`0 4px 12px ${T.brand}44` }}>P</div>
          <div>
            <div style={{ fontWeight:700, fontSize:15, letterSpacing:'-0.025em', color:T.text, lineHeight:1 }}>PulseCart</div>
            <div style={{ fontSize:9, color:T.muted, letterSpacing:'0.14em', textTransform:'uppercase' }}>Retail Intelligence</div>
          </div>
        </div>
        <nav style={{ display:'flex', gap:2, overflowX:'auto' }}>
          {TABS.map(t => (
            <button key={t} className={`tab-btn ${tab===t?'active':''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </nav>
        <div style={{ display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
          <span style={{ fontSize:11, color:T.muted }}>{user.username} · <span style={{ color:T.brand }}>{user.role}</span></span>
          <button onClick={logout} style={{ background:'none', border:`1px solid ${T.border}`, color:T.muted, fontSize:10, padding:'5px 12px', borderRadius:6, cursor:'pointer' }}>Logout</button>
        </div>
      </header>

      <main style={{ padding:'24px 28px 100px', maxWidth:1560, margin:'0 auto' }}>
        {tab === 'overview'   && <OverviewTab />}
        {tab === 'inventory'  && <InventoryTab />}
        {tab === 'analytics'  && isOwner && <AnalyticsTab T={T} apiFetch={apiFetch} />}
        {tab === 'sentiment'  && <Sentiment T={T} apiFetch={apiFetch} />}
        {tab === 'tax'        && isOwner && <TaxPage T={T} kpis={kpis || {}} categories={categories} />}
        {tab === 'settings'   && <SettingsTab T={T} setThemeName={setThemeName} themeName={themeName} />}
      </main>
    </div>
  );
}

export default function App() {
  const { user, isOwner, apiFetch, logout } = useAuth();
  if (!user) return <Login />;
  return <Dashboard user={user} isOwner={isOwner} apiFetch={apiFetch} logout={logout} />;
}
