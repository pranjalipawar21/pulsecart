# PulseCart — Retail Intelligence & Inventory Management System

A full-stack retail dashboard built with **React.js**, **Node.js/Express**, and **MySQL**.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MySQL 8.0+
- npm v9+

### Step 1 — Clone & Install

```bash
# Install frontend dependencies (root)
npm install

# Install backend dependencies
cd backend && npm install && cd ..
```

### Step 2 — Configure Environment

```bash
# Copy the backend env example
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your MySQL credentials:

```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD_HERE
DB_NAME=pulsecart
DB_PORT=3306
JWT_SECRET=your_64_char_random_hex_here
CLIENT_ORIGIN=http://localhost:3000
```

> **Generate JWT secret:** `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### Step 3 — Import Database

Open MySQL (PowerShell or Command Prompt):

```powershell
# Import schema (creates all tables)
Get-Content database/schema.sql | mysql -u root -p

# Import seed data (creates users, 22 products, sales records, alerts)
Get-Content database/seed.sql | mysql -u root -p
```

Or using the MySQL CLI directly:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

### Step 4 — Start the Application

```bash
# Start both frontend (port 3000) and backend (port 5000) together
npm run dev
```

Or start separately:

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
npm start
```

Open: **http://localhost:3000**

---

## 🔑 Default Login Credentials

| Role  | Username | Password     | Access |
|-------|----------|-------------|--------|
| 👑 Owner | `owner` | `pranjal@123` | Full access: Dashboard, Analytics, Reports, Staff |
| 🧑 Staff | `staff` | `pranjal@123` | Inventory, Sales, Alerts, Settings |
| 🧑 Staff | `staff2` | `pranjal@123` | Inventory, Sales, Alerts, Settings |

---

## 📁 Project Structure

```
pulsecart/
├── backend/
│   ├── config/
│   │   └── db.js                 # MySQL connection pool
│   ├── controllers/
│   │   ├── authController.js     # Login, register, staff list
│   │   ├── inventoryController.js # Product CRUD, export
│   │   ├── analyticsController.js # KPIs, charts, trends
│   │   ├── salesController.js    # Sales CRUD + summary
│   │   ├── alertsController.js   # Reorder alerts
│   │   ├── reportsController.js  # CSV download generators
│   │   └── settingsController.js # Store settings
│   ├── middleware/
│   │   ├── auth.js               # JWT verifyToken + requireOwner
│   │   └── errorHandler.js       # Centralized error handler
│   ├── models/
│   │   ├── userModel.js          # User DB operations
│   │   ├── inventoryModel.js     # Product + movement operations
│   │   └── salesModel.js         # Sales + stock decrement
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── inventoryRoutes.js
│   │   ├── analyticsRoutes.js
│   │   ├── salesRoutes.js
│   │   ├── alertsRoutes.js
│   │   ├── reportsRoutes.js
│   │   └── settingsRoutes.js
│   ├── server.js
│   ├── .env.example
│   └── package.json
├── database/
│   ├── schema.sql                # All table definitions
│   └── seed.sql                  # 22 products, users, sales, alerts
├── src/
│   ├── components/
│   │   ├── Login.js
│   │   └── Register.js
│   ├── contexts/
│   │   └── AuthContext.js        # JWT auth + apiFetch wrapper
│   ├── pages/
│   │   ├── Dashboard.js          # KPI cards + Chart.js charts
│   │   ├── Inventory.js          # Full CRUD with modals
│   │   ├── Sales.js              # Record sales + history
│   │   ├── Alerts.js             # Reorder alerts management
│   │   ├── Analytics.js          # Owner-only charts
│   │   ├── Reports.js            # CSV download buttons
│   │   ├── Staff.js              # Staff management
│   │   └── Settings.js           # Store config + theme toggle
│   ├── services/
│   │   └── api.js                # Centralized API service
│   ├── App.js                    # Sidebar layout + routing
│   └── index.css                 # Design system (light/dark)
└── package.json
```

---

## 🔌 API Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/login` | Public | Login → JWT token |
| `POST` | `/api/auth/register` | Public | Register new user |
| `GET`  | `/api/auth/me` | JWT | Get current user |
| `GET`  | `/api/auth/staff` | Owner | List all staff |
| `GET`  | `/api/products` | JWT | All products |
| `POST` | `/api/products` | Owner | Create product |
| `PUT`  | `/api/products/:id` | Owner | Update product |
| `DELETE` | `/api/products/:id` | Owner | Delete product |
| `GET`  | `/api/inventory/categories` | JWT | All categories |
| `POST` | `/api/inventory/:id/reorder` | Owner | Reorder 50 units |
| `GET`  | `/api/analytics/summary` | Owner | Dashboard KPIs |
| `GET`  | `/api/analytics/charts` | Owner | Chart data |
| `GET`  | `/api/analytics/low-stock` | JWT | Low stock list |
| `GET`  | `/api/sales` | JWT | Sales history |
| `POST` | `/api/sales` | JWT | Record a sale |
| `GET`  | `/api/sales/summary` | JWT | Today's summary |
| `GET`  | `/api/alerts` | JWT | Reorder alerts |
| `PUT`  | `/api/alerts/:id/complete` | Owner | Mark alert done |
| `POST` | `/api/alerts/generate` | Owner | Scan & create alerts |
| `GET`  | `/api/reports/inventory` | Owner | CSV download |
| `GET`  | `/api/reports/sales` | Owner | CSV download |
| `GET`  | `/api/reports/low-stock` | Owner | CSV download |
| `GET`  | `/api/settings` | JWT | Get settings |
| `PUT`  | `/api/settings` | Owner | Save settings |
| `GET`  | `/api/health` | Public | Server health check |

---

## ✅ Feature Testing Checklist

### Authentication
- [ ] Login as owner (`owner` / `pranjal@123`) → redirects to Dashboard
- [ ] Login as staff (`staff` / `pranjal@123`) → sees only Inventory, Sales, Alerts, Settings
- [ ] Register new account → can login immediately

### Inventory
- [ ] Products table loads with 22 items
- [ ] Add product → appears in table
- [ ] Edit product → changes saved to DB
- [ ] Delete product → removed from table
- [ ] Search by name/SKU → filters correctly
- [ ] Filter "Low Stock" → shows critical/low items
- [ ] Reorder button → adds 50 units, clears alert

### Sales
- [ ] Record Sale modal opens
- [ ] Dropdown shows available products with stock count
- [ ] Quantity > stock → shows error "Insufficient stock"
- [ ] Sale recorded → stock decrements in inventory
- [ ] Today's revenue KPI updates
- [ ] Sales history table shows all records

### Alerts
- [ ] Alerts page shows pending reorder alerts
- [ ] Mark as completed → status changes to DONE
- [ ] Generate Alerts → scans all low-stock products

### Analytics (Owner only)
- [ ] Best-Selling Products bar chart renders
- [ ] Monthly Revenue trend line chart renders
- [ ] Category Revenue doughnut chart renders
- [ ] Profit Estimate chart renders

### Reports (Owner only)
- [ ] Download Inventory CSV → file downloads with all products
- [ ] Download Sales CSV → file downloads with sales history
- [ ] Download Low Stock CSV → file downloads with low-stock items

### Settings
- [ ] Dark mode toggle works (persists on refresh)
- [ ] Save Settings → updates DB
- [ ] Staff cannot modify settings (read-only form)

---

## 🗄️ Database Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts with role (owner/staff) |
| `categories` | Product categories |
| `products` | Full product catalog with cost_price, supplier_name |
| `sales` | Sales records linked to products and staff |
| `inventory_movements` | Full audit trail of all stock changes |
| `reorder_alerts` | Auto-generated low-stock alerts |
| `reorder_requests` | Manual reorder requests |
| `settings` | Store configuration |
| `product_reviews` | Customer reviews (for sentiment analysis) |

---

## 🌐 Deployment (Replit / Render + Railway)

### Backend (Render / Replit)
Set environment variables:
```
PORT=5000
DB_HOST=<railway_mysql_host>
DB_USER=<railway_user>
DB_PASSWORD=<railway_password>
DB_NAME=pulsecart
JWT_SECRET=<64_char_hex>
CLIENT_ORIGIN=https://your-frontend-url.com
```

### Frontend (Vercel / GitHub Pages)
Set environment variable:
```
REACT_APP_API_URL=https://your-backend-url.com
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Chart.js 4, react-chartjs-2, Socket.IO client |
| Backend | Node.js 18, Express 4, Socket.IO |
| Database | MySQL 8.0 with mysql2/promise |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Security | helmet, express-rate-limit, CORS |
