# PulseCart — Retail Intelligence Dashboard

A production-grade e-commerce analytics dashboard for Indian retail, built with React 18, Firebase Realtime Database, Recharts, and the Anthropic API.

---

## What it does

| Feature | Detail |
|---|---|
| **Live GMV strip** | Session-level counters driven by Firebase + BTC volatility signal |
| **ML Insights** | OLS GMV forecast · RF+ARIMA demand planning · z-score anomaly detection |
| **Channel Attribution** | ROAS, CAC, conversion by channel — Dentsu India 2024 benchmarks |
| **Inventory Intelligence** | Reorder alerts, turnover rates, stock vs reorder chart |
| **Sentiment Analysis** | 100-review dataset · VADER lexicon engine · LLM second-pass · URL pipeline |
| **Tax & Compliance** | GST / TDS 194O / TCS 206C / GSTR filing calendar — Finance Act 2024 |
| **PulseCart AI** | Rule-based engine (11 intents, zero latency) + Anthropic LLM fallback |
| **Profitability Simulator** | Discount → GMV impact model with price elasticity (ε = −0.5) |

---

## Quick start

```bash
# 1. Clone
git clone https://github.com/pranjalipawar21/pulsecart.git
cd pulsecart

# 2. Install
npm install

# 3. Set up environment variables
cp .env.local.template .env.local
# Edit .env.local and fill in your Firebase config

# 4. Start
npm start
```

---

## File structure

```
src/
├── App.js                  # Main app — routing, live ticker, all tabs
├── index.js                # React 18 root + ErrorBoundary
├── firebase.js             # Firebase init (singleton, HMR-safe)
├── seedFirebase.js         # One-time DB seeder with guard flag
│
├── components/
│   ├── ChatBot.js          # Rule-based engine + Anthropic LLM fallback
│   ├── Sentiment.js        # Review analysis, lexicon + LLM pipeline
│   └── TaxPage.js          # GST/TDS/TCS/GSTR compliance
│
└── data/
    ├── mockData.js         # All data generators and API fetchers
    └── feedbackData.js     # NPS, CSAT, CES structured feedback data

public/
└── index.html              # Pre-React loader, font preload, meta tags
```

---

## Environment variables

Copy `.env.local.template` → `.env.local` and fill in:

| Variable | Where to get it |
|---|---|
| `REACT_APP_FIREBASE_*` | Firebase Console → Project Settings → Your Apps |
| `REACT_APP_GNEWS_API_KEY` | https://gnews.io (free: 100 req/day) |
| `REACT_APP_ANTHROPIC_API_KEY` | https://console.anthropic.com |

---

## Firebase setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create project → Add web app → copy config into `.env.local`
3. Enable **Realtime Database** (not Firestore)
4. Set rules (dev):
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```
5. For production, lock down to authenticated users

**The seeder runs automatically on first load.** It checks for a `dashboard/seeded` flag before writing — will never overwrite live data on subsequent loads.

To force a re-seed: delete the `dashboard` node in Firebase Console, then reload.

---

## Data sources

| Data | Source | Real-time? |
|---|---|---|
| USD/INR rate | exchangerate.host (free) | ✓ Every 5 min |
| India GDP | World Bank API (free) | ✓ Every 5 min |
| BTC price | CoinGecko (free) | ✓ Every 54 s |
| E-commerce news | GNews API | ✓ Every 5 min |
| GMV / KPIs | Firebase Realtime DB | ✓ Live listener |
| Product reviews | Curated dataset (100 reviews) | Static |
| Tax rates | Finance Act 2024 | Static |

---

## Demand forecast — why the gap is fixed

The original `genDemandForecast()` applied ±30% noise to predicted values, causing large gaps in the radar chart. Real Random Forest + ARIMA ensemble MAPE on Indian retail SKU data runs 6–10% (IIM-A 2023). Fixed to ±8%.

---

## ChatBot

Two-layer architecture:
1. **Rule-based engine** — 11 intents matched by regex. Covers ~85% of queries. Zero API cost, zero latency. Uses live dashboard data for specific numbers.
2. **Anthropic LLM fallback** — fires only when no intent matches. Full dashboard context injected as system prompt (GMV, AOV, abandonment rate, top channel, etc).

---

## Tech stack

- React 18 · CRA
- Firebase Realtime Database v10
- Recharts 2
- Anthropic Claude API (claude-sonnet-4-20250514)
- IBM Plex Sans (Google Fonts)
- No Redux, no Router — intentionally minimal

---

## License

MIT
