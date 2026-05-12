-- ─────────────────────────────────────────────────────────────────────────────
-- PulseCart MySQL Schema
-- Run: mysql -u root -p < schema.sql
-- Or: node server/seed.js (auto-creates everything)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS pulsecart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pulsecart;

-- Users (owner / staff roles)
CREATE TABLE IF NOT EXISTS users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  username     VARCHAR(50)  UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role         ENUM('owner','staff') NOT NULL DEFAULT 'staff',
  full_name    VARCHAR(100),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory SKUs
CREATE TABLE IF NOT EXISTS inventory (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  sku               VARCHAR(50) UNIQUE NOT NULL,
  product           VARCHAR(120) NOT NULL,
  category          VARCHAR(50),
  stock             INT NOT NULL DEFAULT 0,
  reorder_threshold INT NOT NULL DEFAULT 50,
  turnover          DECIMAL(5,1) DEFAULT 0,
  price             DECIMAL(10,2) DEFAULT 0,
  status            VARCHAR(10) GENERATED ALWAYS AS (
    CASE WHEN stock < 20                  THEN 'critical'
         WHEN stock < reorder_threshold   THEN 'low'
         ELSE 'healthy' END
  ) STORED,
  location          VARCHAR(50) DEFAULT 'Warehouse A',
  description       TEXT,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  order_id    VARCHAR(50) UNIQUE NOT NULL,
  customer_id INT,
  customer    VARCHAR(100), -- Legacy column for name
  category    VARCHAR(50),
  channel     VARCHAR(50),
  region      VARCHAR(60),
  amount      DECIMAL(10,2),
  status      ENUM('processing','shipped','delivered','returned') DEFAULT 'processing',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Reorder log
CREATE TABLE IF NOT EXISTS reorder_log (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  inventory_id INT NOT NULL,
  triggered_by INT NOT NULL,
  quantity     INT NOT NULL DEFAULT 100,
  note         TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inventory_id) REFERENCES inventory(id),
  FOREIGN KEY (triggered_by) REFERENCES users(id)
);

-- KPI snapshots
CREATE TABLE IF NOT EXISTS kpis (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  gmv             BIGINT NOT NULL,
  net_revenue     BIGINT NOT NULL,
  aov             INT NOT NULL,
  conv_rate       DECIMAL(5,2) NOT NULL,
  cart_aband_rate DECIMAL(5,2) NOT NULL,
  return_rate     DECIMAL(5,2) NOT NULL,
  ltv             INT NOT NULL,
  inv_turnover    DECIMAL(5,2) NOT NULL,
  snapshot_date   DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GMV time series (90-day daily data)
CREATE TABLE IF NOT EXISTS gmv_series (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  date_label VARCHAR(10) NOT NULL,
  gmv        BIGINT NOT NULL,
  orders     INT NOT NULL,
  UNIQUE KEY uq_date (date_label)
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(100) UNIQUE,
  phone        VARCHAR(20),
  segment      ENUM('one-time', 'regular', 'high-value') DEFAULT 'one-time',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Response Cache
CREATE TABLE IF NOT EXISTS ai_cache (
  cache_key    VARCHAR(255) PRIMARY KEY,
  response     JSON NOT NULL,
  expires_at   TIMESTAMP NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refresh Tokens for Auth
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  token        VARCHAR(255) UNIQUE NOT NULL,
  expires_at   TIMESTAMP NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Sentiment analysis history
CREATE TABLE IF NOT EXISTS sentiment_history (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  url         TEXT NOT NULL,
  platform    VARCHAR(30),
  identifier  VARCHAR(100),
  result_json JSON,
  analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 1. SUPPLIERS
-- ============================================
CREATE TABLE IF NOT EXISTS suppliers (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL,
  category      VARCHAR(50),
  lead_days     INT DEFAULT 5,
  gst_number    VARCHAR(20),
  payment_terms VARCHAR(20) DEFAULT 'Net-30',
  on_time_pct   DECIMAL(5,2) DEFAULT 100.00,
  quality_score DECIMAL(3,1) DEFAULT 5.0,
  overall_score INT DEFAULT 100,
  is_active     TINYINT(1) DEFAULT 1,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. COMPETITOR PRICES
-- ============================================
CREATE TABLE IF NOT EXISTS competitor_prices (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  sku          VARCHAR(20) NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  our_price    DECIMAL(10,2) NOT NULL,
  amazon       DECIMAL(10,2),
  flipkart     DECIMAL(10,2),
  croma        DECIMAL(10,2),
  reliance     DECIMAL(10,2),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- 3. NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  type         ENUM('stock','pricing','returns','finance','anomaly','order') NOT NULL,
  severity     ENUM('danger','warning','success','info') NOT NULL,
  title        VARCHAR(200) NOT NULL,
  body         TEXT NOT NULL,
  is_read      TINYINT(1) DEFAULT 0,
  is_dismissed TINYINT(1) DEFAULT 0,
  action_label VARCHAR(50),
  action_route VARCHAR(100),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. PURCHASE ORDERS
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  po_number       VARCHAR(20) UNIQUE NOT NULL,
  supplier_id     INT,
  status          ENUM('draft','pending_approval','approved','sent','delivered','cancelled') DEFAULT 'draft',
  total_value     DECIMAL(12,2) NOT NULL,
  requested_by    VARCHAR(100) DEFAULT 'PulseCart AI',
  approved_by     VARCHAR(100),
  notes           TEXT,
  requested_date  DATE NOT NULL,
  expected_date   DATE,
  approved_at     TIMESTAMP,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS po_line_items (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  po_id      INT NOT NULL,
  sku        VARCHAR(20),
  product    VARCHAR(150),
  quantity   INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total      DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id)
);

-- ============================================
-- 5. RETURNS & ANOMALIES
-- ============================================
CREATE TABLE IF NOT EXISTS product_returns (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  return_id       VARCHAR(20) UNIQUE NOT NULL,
  order_id        VARCHAR(20),
  sku             VARCHAR(20),
  product_name    VARCHAR(150),
  customer_reason TEXT,
  ai_category     ENUM('Defective Product','Wrong Item Sent','Changed Mind','Sizing/Fit Issue','Other'),
  ai_confidence   INT,
  ai_action       TEXT,
  escalate        TINYINT(1) DEFAULT 0,
  status          ENUM('pending','resolved','escalated') DEFAULT 'pending',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS anomaly_log (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  sku            VARCHAR(20),
  product_name   VARCHAR(150),
  anomaly_type   ENUM('demand_spike','sales_drop','stockout_risk','return_spike','price_undercut') NOT NULL,
  severity       ENUM('low','medium','high','critical') NOT NULL,
  description    TEXT,
  ai_explanation TEXT,
  ai_action      TEXT,
  resolved       TINYINT(1) DEFAULT 0,
  detected_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
