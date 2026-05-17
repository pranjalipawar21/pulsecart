# 🛒 PulseCart — Full-Stack Retail Intelligence Platform

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/pranjalipawar21/pulsecart)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2018.0.0-blue.svg)](https://nodejs.org)
[![React Version](https://img.shields.io/badge/react-18.3.1-blue.svg)](https://react.dev)
[![MySQL](https://img.shields.io/badge/database-MySQL-blue.svg)](https://www.mysql.com)
[![Socket.IO](https://img.shields.io/badge/realtime-Socket.IO-lightgrey.svg)](https://socket.io)

PulseCart is a production-grade, retail intelligence and inventory management platform engineered for modern e-commerce. It utilizes a high-performance **React 18** client with adaptive glassmorphism design, a hardened **Node.js/Express** MVC backend, persistent **MySQL** storage, event-driven socket updates powered by **Socket.IO**, and real-time visualization dashboards powered by **Chart.js**.

All mock data layers, static generator fallbacks, and unverified mock pipelines have been entirely replaced with active, production-grade database connections and atomic operational endpoints.

---

## 🚀 Core Architectural Highlights

1. **Structured Node.js/Express MVC Backend**: Absolute separation of persistent data models, route handlers, custom authentication middleware, and business controller modules.
2. **Secure JWT Authentication & RBAC**: Stateless token-based logins gating individual permissions for `owner` and `staff` hierarchies with strict session persistence.
3. **Atomic Inventory Mutators**: Pessimistic transaction locking (`SELECT ... FOR UPDATE`) executing multi-query stock adjustments to secure data integrity under heavy concurrent threads.
4. **Interactive Chart.js Visualizations**: Line and bar aggregate charts showing actual category-wise capital allocations and cumulative day-by-day SKU stock levels.
5. **Real-Time Synchronizations**: Instant state synchronizations via WebSockets with **Socket.IO** client-server connections, dispatching mutations dynamically without polling.
6. **Self-Contained NLP Sentiment Engine**: Local keyword-driven review processing and sentiment score aggregation, eliminating third-party API dependencies or slow external Python processes.
7. **Production Express Hardening**: Incorporates standard security configurations using `helmet` headers, strictly configured `cors` origin restriction policies, and IP traffic rate limiters.

---

## 📂 System Topology

```bash
pulsecart/
├── src/                    # React Frontend App
│   ├── components/
│   │   ├── AnalyticsTab.js # Chart.js Dashboard (SKU stock trends, Category values, Audit log)
│   │   ├── Sentiment.js    # Review Analysis Matrix & Sandbox (Recharts-powered)
│   │   ├── Login.js        # Responsive Brand Gateway (light/dark adaptivity)
│   │   ├── SettingsTab.js  # Feature toggles & global controls
│   │   └── TaxPage.js      # Ledger summaries
│   ├── contexts/
│   │   └── AuthContext.js  # Secure state with auto token injection & 401 session-guards
│   ├── App.js              # Stripped of all mocks; 6 high-fidelity tabs
│   └── index.js
├── backend/                # Node.js MVC Server
│   ├── config/             # Connection pooling configurations (mysql2/promise)
│   ├── middleware/
│   │   ├── auth.js         # JWT validators & role authorization guards
│   │   └── errorHandler.js # Standardized JSON error response handler
│   ├── models/
│   │   ├── userModel.js    # Bcrypt-backed account persistence
│   │   └── inventoryModel.js# Atomic transactional updates & movements
│   ├── controllers/
│   │   ├── authController.js    # Token generation & credentials verifier
│   │   ├── inventoryController.js # CRUD actions + reorders + adjustments
│   │   ├── analyticsController.js # SQL aggregations (SUM, COUNT, GROUP BY)
│   │   └── sentimentController.js # Local lexical analyzer & statistics
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── inventoryRoutes.js
│   │   ├── analyticsRoutes.js
│   │   └── sentimentRoutes.js
│   ├── server.js           # Security gateway (helmet, rate-limiting, strict CORS, Socket.IO)
│   └── .env.example
├── database/               # SQL Initialization
│   ├── schema.sql          # DB Schemas & optimal multi-column indexes
│   └── seed.sql            # Bcrypt-secured profiles & detailed movement history
└── package.json            # One-command developer workflow (concurrently)
```

---

## ⚡ Quick Start Setup

### 1. Persistent Database Setup
Ensure that **MySQL** is running locally on port `3306`, then import the schema and seeds:
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

### 2. Secure Configuration
Copy the environment template in `/backend`:
```bash
cd backend
cp .env.example .env
```
Open `.env` and configure your credentials. **Make sure to set a cryptographically secure `JWT_SECRET` key.**

### 3. Build & Run (Single-Command Launch)
From the root workspace directory, install dependencies and launch the integrated dev server:
```bash
# Install frontend + backend packages
npm install
cd backend && npm install
cd ..

# Spin up React + Express simultaneously
npm run dev
```

*   **Frontend Client**: `http://localhost:3000`
*   **Secure API gateway**: `http://localhost:5000`

---

## 🧪 Testing Commands

The repository features automated frontend testing pipelines. Run these commands from the root directory to verify performance:
```bash
# Execute frontend unit test suites
npm run test

# Check for code linting violations
npm run lint

# Perform full production React builds
npm run build
```

---

## 📸 Screenshots & Visual Flows

Here are the key interfaces of the PulseCart system:

### 1. Owner Analytics Dashboard
*A visually stunning panel highlighting total units, capital valuations, urgent threshold indicators, SKU-level cumulative stock lines, and GSTR-filing metrics.*

### 2. Live Inventory Control
*Gives administrators interactive buttons to trigger automatic replenishment PO triggers, log manual stock-in/stock-out adjustments with audit comments, and receive live Socket.IO update cards.*

### 3. Review Intelligence Sandbox
*Allows staff to paste review snippets for instant NLP classification or upload bulk review spreadsheets directly into MySQL.*

---

## 🔐 Credentials & Role Workflows

The database seeds two default accounts. All passwords are secure bcrypt hashes (cost factor = 12):

*   **Username**: `owner` | **Password**: `pranjal@123`
    *   *Permissions*: View Full Analytics, Categories financial charts, trigger reorders, adjust stocks, modify product listings, download CSV exports.
*   **Username**: `staff` | **Password**: `pranjal@123`
    *   *Permissions*: View live inventory, execute sentiment sandbox. Restricted from accessing owner-only APIs (403 Forbidden).

---

## 🔗 Production API Documentation

Every endpoint (excluding login) requires a valid Bearer JWT: `Authorization: Bearer <token>`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| **POST** | `/api/auth/login` | Public | Validate credentials, generate JWT |
| **GET** | `/api/auth/me` | Staff / Owner | Return active user profiles |
| **GET** | `/api/products` | Staff / Owner | Fetch products + auto calculated stock status |
| **GET** | `/api/products/:id` | Staff / Owner | Retrieve specific product details |
| **POST** | `/api/products` | Owner | Create new product listing |
| **PUT** | `/api/products/:id` | Owner | Update SKU details |
| **DELETE** | `/api/products/:id` | Owner | Remove listing from catalog |
| **POST** | `/api/inventory/:id/reorder` | Owner | replenishment trigger (+ Socket.IO emit) |
| **POST** | `/api/inventory/:id/adjust` | Owner | signed stock adjustment (+ Socket.IO emit) |
| **GET** | `/api/inventory/movements` | Staff / Owner | Paginated audit trail history |
| **GET** | `/api/analytics/kpis` | Owner | Group aggregated KPI values |
| **GET** | `/api/analytics/categories`| Owner | Group category valuation totals |
| **GET** | `/api/analytics/low-stock` | Staff / Owner | Urgent stock alerts |
| **GET** | `/api/analytics/sku-trends` | Owner | Daily SKU transaction history |
| **POST** | `/api/sentiment/live` | Staff / Owner | Local lexical NLP sandbox |
| **POST** | `/api/sentiment/upload` | Staff / Owner | CSV review file bulk processing |

---

## 🌐 Production Deployment Strategy

To deploy PulseCart in a fully functional, public production environment, implement the following distributed cloud architecture:

1. **Static Frontend Hosting (GitHub Pages / Vercel / Netlify)**:
   - Compile the React assets using `.env.production` pointing to your live backend endpoint.
   - Deploy the build directory statically.
   
2. **Dedicated Backend App Service (Render / Railway / Fly.io)**:
   - Host the Express server node.
   - Configure environment variables (`JWT_SECRET`, database connections, and `CLIENT_ORIGIN` matching your hosted frontend URL).

3. **Managed Relational Database (Railway / Aiven / PlanetScale)**:
   - Provision a cloud-hosted **MySQL** database instance.
   - Run the initial SQL imports (`schema.sql` and `seed.sql`) remotely.
   - Grant permission access to your hosted backend IP addresses.

4. **Websocket Portability**:
   - Ensure the Socket.IO setup correctly communicates over standard HTTPS/WSS protocols on the live server routes.

---

## ⚠️ Known Limitations & Design Rationale

- **Standalone Standalone Runtime**: The sentiment analysis sandbox employs a highly efficient local JavaScript lexical analyzer. While this does not capture the semantic nuance of a full-scale LLM, it allows the entire system to run 100% locally and offline without requiring external API keys, rate-limits, or internet connectivity.
- **Single Currency Assumption**: All ledger sheets and financial valuations are structured around the Indian Rupee (₹/INR) utilizing standard GST/TCS/TDS splits derived from the Finance Act 2024.

---

**Developed for Portfolio Excellence by Pranjali Pawar**
