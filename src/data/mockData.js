// ─── PulseCart Mock Data Engine ───────────────────────────────────────────
// Simulates a real retail data pipeline (Pandas + MySQL backend)

export const CATEGORIES = ["Electronics", "Apparel", "Home & Kitchen", "Beauty", "Sports", "Books"];
export const CHANNELS   = ["Organic Search", "Paid Ads", "Email", "Social", "Direct", "Referral"];
export const REGIONS    = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Pune"];

export const rand    = (a, b) => Math.random() * (b - a) + a;
export const randInt = (a, b) => Math.floor(rand(a, b));
export const pick    = (arr) => arr[randInt(0, arr.length)];

// ── Realistic retail KPIs ──
export function genKPIs(dateRange = 30) {
  const gmv           = rand(8_200_000, 12_500_000);
  const orders        = randInt(14000, 22000);
  const aov           = gmv / orders;                          // Avg Order Value
  const sessions      = randInt(180000, 310000);
  const convRate      = (orders / sessions) * 100;
  const cartAbandRate = rand(62, 79);                          // industry avg 70%
  const returnRate    = rand(8, 18);
  const newCust       = randInt(3200, 7800);
  const repeatCust    = randInt(6000, 14000);
  const ltv           = rand(2800, 5400);                      // Customer LTV ₹
  const invTurnover   = rand(4.2, 9.1);                        // times/year
  const netRevenue    = gmv * (1 - returnRate / 100) * 0.72;  // after returns + COGS

  return { gmv, orders, aov, sessions, convRate, cartAbandRate, returnRate, newCust, repeatCust, ltv, invTurnover, netRevenue };
}

// ── 90-day GMV time series ──
export function genGMVSeries(days = 90) {
  let base = rand(280000, 340000);
  const weekend_boost = [1.0, 0.88, 0.85, 0.87, 0.92, 1.18, 1.35];
  return Array.from({ length: days }, (_, i) => {
    const dow    = i % 7;
    const trend  = 1 + (i / days) * 0.12;                      // slight upward trend
    const spike  = rand(0, 1) > 0.93 ? rand(1.3, 2.1) : 1;     // sale events
    base         = base * rand(0.97, 1.04) * weekend_boost[dow] * trend * spike;
    base         = Math.max(150000, Math.min(900000, base));
    const date   = new Date(Date.now() - (days - i) * 86400000);
    return {
      date:   date.toLocaleDateString("en-IN", { day:"2-digit", month:"short" }),
      gmv:    Math.round(base),
      orders: Math.round(base / rand(480, 720)),
      returns:Math.round(base * rand(0.08, 0.18) / 500),
      rawDate: date,
    };
  });
}

// ── Category performance ──
export function genCategoryData() {
  return CATEGORIES.map(cat => {
    const revenue    = randInt(800000, 4200000);
    const units      = randInt(500, 8000);
    const margin     = rand(12, 48);
    const growth_wow = rand(-12, 35);
    const returns    = rand(5, 25);
    return { cat, revenue, units, margin, growth_wow, returns };
  }).sort((a, b) => b.revenue - a.revenue);
}

// ── Channel attribution ──
export function genChannelData() {
  const totSessions = 280000;
  return CHANNELS.map(ch => {
    const sessions = randInt(8000, 90000);
    const conv     = rand(1.2, 6.8);
    const revenue  = Math.round(sessions * conv * rand(400, 900) / 100);
    const cac      = rand(80, 650);
    const roas     = rand(1.8, 7.2);
    return { ch, sessions, conv, revenue, cac, roas };
  });
}

// ── Regional heatmap ──
export function genRegionData() {
  return REGIONS.map(r => {
    const revenue  = randInt(400000, 3200000);
    const orders   = randInt(800, 9000);
    const aov      = revenue / orders;
    const growth   = rand(-5, 28);
    const churn    = rand(3, 14);
    return { r, revenue, orders, aov, growth, churn };
  }).sort((a, b) => b.revenue - a.revenue);
}

// ── Inventory alerts ──
export function genInventoryAlerts() {
  const products = [
    "Wireless Earbuds Pro", "Cotton Kurta Set", "Air Fryer 5L", "Vitamin C Serum",
    "Yoga Mat Premium", "UPSC Guide 2025", "Smart Watch Gen3", "Linen Bedsheet",
    "Protein Powder 2kg", "Running Shoes X1",
  ];
  return products.slice(0, 6).map(p => ({
    product:  p,
    stock:    randInt(0, 45),
    reorder:  randInt(40, 120),
    turnover: rand(3, 15).toFixed(1),
    status:   randInt(0, 45) < 20 ? "critical" : "low",
  }));
}

// ── Real-time order feed ──
const FIRST = ["Aisha","Rohan","Priya","Arjun","Sneha","Vikram","Kavya","Rahul","Divya","Kiran"];
const LAST  = ["Sharma","Patel","Singh","Kumar","Nair","Reddy","Joshi","Gupta","Mehta","Shah"];
export function genOrderEvent() {
  const items  = randInt(1, 5);
  const amount = randInt(299, 8999);
  return {
    id:       `ORD${randInt(100000, 999999)}`,
    customer: `${pick(FIRST)} ${pick(LAST)}`,
    category: pick(CATEGORIES),
    channel:  pick(CHANNELS),
    region:   pick(REGIONS),
    amount,
    items,
    time:     new Date(),
    status:   pick(["placed","processing","shipped","delivered"]),
  };
}

// ── ML: Linear regression forecast ──
export function forecastGMV(series, steps = 14) {
  const n = series.length;
  let sx=0, sy=0, sxy=0, sx2=0;
  series.forEach((d,i) => { sx+=i; sy+=d.gmv; sxy+=i*d.gmv; sx2+=i*i; });
  const slope     = (n*sxy - sx*sy) / (n*sx2 - sx*sx);
  const intercept = (sy - slope*sx) / n;
  return Array.from({ length: steps }, (_, i) => {
    const day = new Date(Date.now() + i*86400000);
    return {
      date:      day.toLocaleDateString("en-IN",{ day:"2-digit", month:"short" }),
      predicted: Math.round(Math.max(0, intercept + slope*(n+i) * (1 + rand(-0.04,0.04)))),
    };
  });
}

// ── ML: Cart abandonment propensity score ──
export function genAbandonmentCohorts() {
  return [
    { cohort:"High-Intent (viewed 3+ items)",    risk: rand(28,42), sessions: randInt(8000,15000) },
    { cohort:"Price-Sensitive (price checked)",  risk: rand(55,72), sessions: randInt(5000,10000) },
    { cohort:"Mobile Checkout Dropoff",          risk: rand(68,82), sessions: randInt(12000,20000) },
    { cohort:"First-time Visitors",              risk: rand(75,88), sessions: randInt(18000,30000) },
    { cohort:"Return Customers",                 risk: rand(18,30), sessions: randInt(6000,12000) },
  ];
}

// ── ML: Demand forecast by category ──
export function genDemandForecast() {
  return CATEGORIES.map(cat => ({
    cat,
    actual:    randInt(50000, 500000),
    predicted: randInt(50000, 500000),
    confidence: rand(82, 97).toFixed(1),
  }));
}

// ── Anomaly detection on GMV ──
export function detectAnomalies(series) {
  const vals = series.map(d => d.gmv);
  const mean = vals.reduce((a,b) => a+b, 0) / vals.length;
  const std  = Math.sqrt(vals.reduce((a,b) => a+(b-mean)**2, 0) / vals.length);
  return series.map(d => ({ ...d, isAnomaly: Math.abs(d.gmv - mean) > 2.0*std, zScore: ((d.gmv-mean)/std).toFixed(2) }));
}

// ── CSV export utility ──
export function toCSV(data, filename) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]).join(",");
  const rows    = data.map(row => Object.values(row).map(v => `"${v}"`).join(",")).join("\n");
  const blob    = new Blob([headers + "\n" + rows], { type:"text/csv" });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Activity feed events ──
export function genActivityEvent() {
  const events = [
    { msg:"Flash sale triggered — Electronics +42% GMV",   type:"success" },
    { msg:"Cart abandonment spike in Mobile channel",       type:"warn"    },
    { msg:"Inventory critical: Wireless Earbuds Pro",       type:"danger"  },
    { msg:"ML model retrained on last 7 days data",         type:"info"    },
    { msg:"High-LTV customer segment detected — 234 users", type:"success" },
    { msg:"Return rate anomaly in Apparel category",        type:"warn"    },
    { msg:"New cohort created: Price-Sensitive Buyers",     type:"info"    },
    { msg:"ROAS dropped below 2.0x on Paid Ads channel",    type:"danger"  },
    { msg:"Weekend demand forecast updated",                type:"info"    },
    { msg:"Bulk order: ₹1.2L from Bangalore",              type:"success" },
  ];
  return pick(events);
}
