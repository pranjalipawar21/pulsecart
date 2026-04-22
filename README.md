# PulseCart — E-Commerce Retail Intelligence Platform

> A real-time business intelligence dashboard for Indian e-commerce retailers, featuring live KPI monitoring, ML-powered demand forecasting, cart abandonment prediction, and an embedded AI retail analyst assistant.

---

## 🚀 Features

### Real-Time Monitoring
- **Live GMV, Orders, Active Sessions** — updated every 1.8 seconds via simulated Socket.IO events
- **Live Order Feed** — streaming transactions with customer, category, channel, region breakdown
- **Activity Feed** — real-time business alerts (stockouts, anomalies, ML events)

### Machine Learning Models
| Model | Algorithm | Purpose |
|-------|-----------|---------|
| GMV Forecasting | Linear Regression + Trend Decomposition | 14-day revenue prediction |
| Cart Abandonment | Gradient Boosting Classifier | Propensity score by cohort |
| Demand Planning | Random Forest + ARIMA Ensemble | SKU-level inventory forecast |
| Anomaly Detection | Statistical (z-score > 2.0) | Flag unusual GMV spikes/drops |

### E-Commerce KPIs Tracked
- **GMV** (Gross Merchandise Value) with INR formatting
- **AOV** (Average Order Value)
- **Conversion Rate** (sessions → orders)
- **Cart Abandonment Rate** (~70% industry avg)
- **Return Rate** & net revenue after returns
- **Customer LTV** (Lifetime Value)
- **Inventory Turnover Ratio**
- **ROAS** & **CAC** by channel

### Extra Features
- 🌗 **Dark / Light mode toggle**
- 📥 **Export any dataset as CSV** (GMV, Categories, Channels, Forecast, etc.)
- 📅 **Date range filter** — 7D / 30D / 60D / 90D views
- 🤖 **AI Chatbot** — embedded retail analytics assistant (powered by Claude API)

### Dashboard Tabs
1. **Overview** — KPI grid, GMV area chart, category breakdown, region table
2. **ML Insights** — Model cards, forecast chart, abandonment cohorts, demand radar, anomaly scatter
3. **Channels** — Revenue + conversion by channel, full attribution matrix (ROAS, CAC, sessions)
4. **Inventory** — Stock alerts, reorder intelligence, turnover rates
5. **Live Orders** — Real-time order stream, category distribution

---

## 🛠 Tech Stack

**Frontend**
- React.js 18
- Recharts (Area, Bar, Line, Radar, Scatter charts)
- Custom CSS-in-JS theming system

**ML Engine** (simulated Python/scikit-learn pipeline)
- Linear Regression for GMV forecasting
- Gradient Boosting for cart abandonment propensity
- Random Forest + ARIMA for demand planning
- Statistical anomaly detection (σ-based Isolation Forest logic)

**Real-time** — Socket.IO event simulation (1.8s polling)

**AI Assistant** — Anthropic Claude API (retail-domain system prompt)

**Data Layer** — Pandas-style pipeline, MySQL-ready schema

---

## ⚡ Quick Start

### Prerequisites
- [Node.js LTS](https://nodejs.org) installed

### Run
```bash
# Option 1 — Windows (easiest)
Double-click START.bat

# Option 2 — Terminal
npm install
npm start
```

Opens at **http://localhost:3000**

---

## 📁 Project Structure

```
pulsecart/
├── public/
│   └── index.html
├── src/
│   ├── data/
│   │   └── mockData.js        # ML engine, data generators, CSV export
│   ├── components/
│   │   └── ChatBot.js         # AI retail assistant (Claude API)
│   ├── App.js                 # Main dashboard (5 tabs, themes, filters)
│   └── index.js
├── START.bat                  # One-click Windows launcher
└── package.json
```

---

## 💡 Key Design Decisions

- **INR formatting** throughout (₹L, ₹Cr) — built specifically for Indian retail market
- **Realistic retail data model** — not generic "sales/customers", but GMV, AOV, ROAS, CAC, LTV, inventory turnover
- **ML cohort logic** — cart abandonment propensity model segments users by behavioral signals (price-checking, mobile dropout, first-visit)
- **Domain-specific AI** — chatbot is prompted as a retail analyst, not a generic assistant

---

*Built with React.js · Recharts · Anthropic Claude API*
