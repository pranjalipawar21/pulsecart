# 🛒 PulseCart — Full-Stack Retail Intelligence Platform

PulseCart is a production-grade, internship-ready retail intelligence platform designed for Indian e-commerce. It features a modern **React 18** frontend, a structured **Node.js/Express** MVC backend, and persistent **MySQL** storage.

> **Live Demo**: [https://pranjalipawar21.github.io/pulsecart](https://pranjalipawar21.github.io/pulsecart)

---

## 🚀 Phase 2 Focus: Real-Time Inventory Management
- **Structured MVC Backend**: Clear separation of Models, Controllers, and Routes.
- **Persistent MySQL Storage**: Real products, categories, and stock movements.
- **Dynamic Reorder Logic**: Calculations based on `quantity <= low_stock_threshold`.
- **Audit Trails**: Every stock change is logged in `inventory_movements`.

---

## 🛠️ Tech Stack
- **Frontend**: React 18, Chart.js, Recharts, CSS3 (Glassmorphism)
- **Backend**: Node.js, Express.js, MySQL (`mysql2/promise`)
- **Database**: MySQL 8.0+
- **Environment**: Dotenv for secure configuration

---

## 📂 Project Structure
```bash
pulsecart/
├── src/                    # React Frontend
├── backend/                # Node.js MVC Backend (New)
│   ├── config/             # DB Connection
│   ├── controllers/        # Request Handling
│   ├── models/             # SQL Queries
│   ├── routes/             # Endpoint Definitions
│   └── server.js           # Entry Point
├── database/               # SQL Scripts
│   ├── schema.sql          # Table Definitions
│   └── seed.sql            # Sample Seed Data
└── README.md               # Documentation
```

---

## ⚡ Quick Start (Local Setup)

### 1. Database Setup
1. Ensure **MySQL** is running.
2. Import the schema and seed data:
   ```bash
   mysql -u root -p < database/schema.sql
   mysql -u root -p < database/seed.sql
   ```

### 2. Backend Installation
1. Navigate to the backend folder: `cd backend`
2. Create a `.env` file based on `.env.example`.
3. Install dependencies: `npm install`
4. Start development server: `npm run dev` (Starts on http://localhost:5000)

### 3. Frontend Installation
1. In the root directory, create a `.env` file:
   ```env
   REACT_APP_API_URL=http://localhost:5000
   ```
2. Install dependencies: `npm install`
3. Start React app: `npm start` (Starts on http://localhost:3000)

---

## 🔗 Inventory API Documentation

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products` | Fetch all products with calculated status |
| GET | `/api/products/:id` | Fetch specific product details |
| POST | `/api/products` | Create a new product |
| PUT | `/api/products/:id` | Update product details |
| DELETE | `/api/products/:id` | Delete a product |
| GET | `/api/inventory/low-stock` | Fetch only low/critical stock items |
| POST | `/api/inventory/:id/reorder` | Trigger a stock replenishment |
| GET | `/api/inventory/export` | Export inventory as CSV |

---

**Developed for Portfolio Excellence by Pranjali Pawar**
