# PulseCart — Retail Intelligence & Inventory Management System

A production-grade e-commerce analytics dashboard for Indian retail, built with **React 18**, **Node.js + Express.js**, **MySQL**, **Firebase Realtime Database**, **Chart.js + Recharts**, and **Gemini AI**.

> **Live**: Light mode by default · Role-based access (Owner / Staff) · AI-powered sentiment & forecasting

---

## Features

### Dashboard & Analytics
- **8 KPI cards** — GMV, AOV, conversion rate, cart abandonment, net revenue, return rate, LTV, inventory turns (benchmarked to Redseer India 2024)
- **GMV time-series** with 90-day seasonality (Valentine's, Holi, Eid, Diwali spikes)
- **Category revenue**, **channel attribution**, **region performance** tables and charts
- **Profitability simulator** — model discount impact on GMV using price elasticity (ε = −0.5)
- **Live macro data** — USD/INR (exchangerate.host), India GDP (World Bank), BTC (CoinGecko)

### ML Insights
- **14-day GMV forecast** — OLS linear trend extrapolation with dampened seasonality
- **Cart abandonment risk cohorts** — Baymard Institute 2024 benchmarks
- **Demand forecast vs actual** — RF+ARIMA ensemble (±8% MAPE)
- **Anomaly detection** — z-score method (|z| > 2.0)

### Inventory Management
- **Stock tracking** with real-time alerts (critical / low / healthy)
- **Reorder intelligence** — owner-only reorder triggers via backend API
- **Inventory turnover analysis** — CRISIL retail benchmarks
- **Stock vs reorder point** visualization (Chart.js)

### Sentiment Intelligence (AI-Powered)
- **100-review lexicon pipeline** — VADER-style with 100+ word lexicon, negation handling, intensifier support
- **Gemini LLM second-pass** — aspect-level analysis for ambiguous reviews
- **URL product analysis** — paste Amazon / Flipkart / Meesho / Myntra URLs:
  - Extracts ASIN, FSN, or product slug from URL
  - Gemini identifies the real product and provides sentiment analysis
  - Aspect breakdown, representative reviews, actionable recommendations, competitor comparison
- **AI category analysis** — Gemini-powered insights per product category

### Role-Based Access Control
- **JWT authentication** with bcrypt password hashing
- **Owner** — full dashboard, analytics, ML insights, channels, sentiment, taxation
- **Staff** — inventory + live orders only
- **API middleware** — `requireAuth`, `requireOwner` guards on all routes

### AI Backend (Gemini-Powered)
- `POST /api/sentiment/analyze-url` — URL-based product sentiment analysis
- `POST /api/ai/demand-forecast` — AI demand planning per SKU
- `POST /api/ai/natural-query` — natural language inventory queries (e.g., "show me everything under ₹500 with low stock")
- `POST /api/ai/anomaly-explain` — contextual explanation for GMV anomalies

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/pranjalipawar21/pulsecart.git
cd pulsecart

# 2. Install frontend deps
npm install

# 3. Set up frontend environment
cp .env.local.template .env.local
# Edit .env.local — add Firebase config + REACT_APP_GEMINI_API_KEY

# 4. Install backend deps
cd server
npm install
cp .env.example .env
# Edit .env — add MySQL credentials + GEMINI_API_KEY
cd ..

# 5. Start
npm start            # React frontend on :3000
cd server && npm run dev  # Express backend on :5001
```

---

## File Structure

```
src/
├── App.js                    # Main app — routing, charts, all tabs
├── index.js                  # React 18 root + ErrorBoundary
├── firebase.js               # Firebase init (singleton, HMR-safe)
├── seedFirebase.js            # One-time DB seeder with guard flag
├── components/
│   ├── ChatBot.js             # Rule-based engine + Gemini LLM fallback
│   ├── Login.js               # Role selector + JWT auth (light mode)
│   ├── Sentiment.js           # Review analysis, lexicon + LLM pipeline + URL analysis
│   └── TaxPage.js             # GST/TDS/TCS/GSTR compliance
├── contexts/
│   └── AuthContext.js         # JWT auth state + apiFetch wrapper
├── hooks/
│   ├── useFetchWithBackoff.js # Exponential backoff for API calls
│   └── useVisibilityTicker.js # Pause tickers when tab is hidden
└── data/
    ├── mockData.js            # Data generators, ML models, API fetchers
    └── feedbackData.js        # NPS, CSAT, CES structured feedback

server/
├── index.js                   # Express entry point
├── db.js                      # MySQL pool + in-memory fallback
├── schema.sql                 # MySQL schema (users, inventory, orders, reorder_log)
├── middleware/
│   └── auth.js                # JWT verification + role guards
└── routes/
    ├── auth.js                # POST /login, GET /me
    ├── inventory.js           # GET /, GET /alerts, PUT /:id/reorder
    ├── orders.js              # Order CRUD
    ├── analytics.js           # KPIs, categories, channels, SKU trends
    ├── sentiment.js           # POST /analyze-url (Gemini AI)
    └── ai.js                  # Demand forecast, NL queries, anomaly explain
```

---

## Environment Variables

### Frontend (`.env.local`)

| Variable | Source |
|---|---|
| `REACT_APP_FIREBASE_*` | [Firebase Console](https://console.firebase.google.com) |
| `REACT_APP_GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `REACT_APP_GNEWS_API_KEY` | [GNews](https://gnews.io) (optional) |

### Backend (`server/.env`)

| Variable | Default |
|---|---|
| `DB_HOST` | `localhost` |
| `DB_PORT` | `3306` |
| `DB_USER` | `root` |
| `DB_PASSWORD` | `root` |
| `DB_NAME` | `pulsecart` |
| `JWT_SECRET` | `pulsecart_dev_secret` |
| `PORT` | `5001` |
| `GEMINI_API_KEY` | *(required for AI features)* |

---

## How to Get Real-Time Data (Instead of Simulated Values)

### Already Real-Time ✅
- **USD/INR exchange rate** — `exchangerate.host` API (free, no key)
- **India GDP growth** — World Bank API (free, no key)
- **Bitcoin/Ethereum prices** — CoinGecko API (free, rate-limited)

### Product Reviews (for Sentiment Analysis)
The current implementation uses **Gemini AI** to analyze products based on its training knowledge — this gives accurate results for well-known products without needing paid APIs.

For **actual scraped reviews**, integrate one of:

| Service | Coverage | Cost | Integration |
|---|---|---|---|
| [Rainforest API](https://www.rainforestapi.com/) | Amazon (ASIN → real reviews) | Free tier, then $49/mo | Extract ASIN from URL → API call → feed reviews to Gemini |
| [Apify](https://apify.com/) | Amazon + Flipkart scrapers | Free tier, then $49/mo | Use Amazon Reviews Scraper actor |
| [ScraperAPI](https://www.scraperapi.com/) | Any website | Free tier available | Proxy-based scraping |

**Production flow**: `URL → extract ASIN/ID → Rainforest/Apify → get 50-100 reviews → POST /api/sentiment/analyze-url → Gemini analyzes → structured JSON → frontend`

### Live Sales / Inventory Data
In production, this comes from your **MySQL database**. The Firebase seeder provides realistic demo data. Connect your POS system or Shopify/WooCommerce webhook to the orders API for real-time data.

---

## API Testing with Postman

All endpoints require JWT authentication. First, call `POST /api/auth/login` with `{"username": "owner", "password": "demo123"}` to get a token, then include it as `Authorization: Bearer <token>` in subsequent requests.

### Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | Bearer | Token validation |
| GET | `/api/inventory` | Bearer | All SKUs (sorted by urgency) |
| GET | `/api/inventory/alerts` | Bearer | Stock below threshold |
| PUT | `/api/inventory/:id/reorder` | Owner | Trigger reorder |
| GET | `/api/analytics/kpis` | Owner | Dashboard KPIs |
| GET | `/api/analytics/categories` | Owner | Category breakdown |
| GET | `/api/analytics/channels` | Owner | Channel attribution |
| GET | `/api/analytics/sku-trends` | Owner | SKU sales trends |
| POST | `/api/sentiment/analyze-url` | Bearer | AI sentiment for product URL |
| POST | `/api/ai/demand-forecast` | Owner | AI demand planning |
| POST | `/api/ai/natural-query` | Bearer | Natural language inventory query |
| POST | `/api/ai/anomaly-explain` | Owner | Explain GMV anomaly |

---

## Tech Stack

- **Frontend**: React 18 · CRA · Recharts 2 · Chart.js 4 · react-chartjs-2
- **Backend**: Node.js · Express 4 · mysql2 · bcryptjs · jsonwebtoken
- **Database**: MySQL (primary) · In-memory fallback · Firebase Realtime Database
- **AI**: Google Gemini API (gemini-2.0-flash)
- **Typography**: IBM Plex Sans (Google Fonts)
- **Architecture**: No Redux, no Router — intentionally minimal SPA

---

## License

MIT
