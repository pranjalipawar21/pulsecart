-- ─────────────────────────────────────────────────────────────────────────────
-- PulseCart MySQL Schema v2.1 — Production Grade
-- Run: node seed.js  (preferred — handles CREATE + INSERT)
-- Or:  mysql -u root -p < schema.sql  (schema-only, no data)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS pulsecart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pulsecart;

-- Users (owner / staff roles)
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('owner','staff') NOT NULL DEFAULT 'staff',
  full_name     VARCHAR(100),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory SKUs (status is a generated column — always reflects live stock)
CREATE TABLE IF NOT EXISTS inventory (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  sku               VARCHAR(50) UNIQUE NOT NULL,
  product           VARCHAR(120) NOT NULL,
  category          VARCHAR(50),
  stock             INT NOT NULL DEFAULT 0,
  reorder_threshold INT NOT NULL DEFAULT 50,
  price             DECIMAL(10,2) DEFAULT 0,
  cost_price        DECIMAL(10,2) DEFAULT 0,
  status            VARCHAR(10) GENERATED ALWAYS AS (
    CASE WHEN stock < 20                THEN 'critical'
         WHEN stock < reorder_threshold THEN 'low'
         ELSE 'healthy' END
  ) STORED,
  location          VARCHAR(50) DEFAULT 'Warehouse A',
  description       TEXT,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(100) UNIQUE,
  phone      VARCHAR(20),
  segment    ENUM('one-time','regular','high-value') DEFAULT 'one-time',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Visits (for Conversion Rate calculation)
CREATE TABLE IF NOT EXISTS visits (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  visit_date  DATE NOT NULL DEFAULT (CURRENT_DATE),
  platform    ENUM('web','app','mobile_web') DEFAULT 'web',
  visit_count INT DEFAULT 0,
  UNIQUE KEY uq_visit (visit_date, platform)
);

-- Orders (full fields: customer, category, channel, region, tax)
CREATE TABLE IF NOT EXISTS orders (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  order_id    VARCHAR(50) UNIQUE NOT NULL,
  customer_id INT,
  customer    VARCHAR(100),
  category    VARCHAR(50),
  channel     VARCHAR(50),
  region      VARCHAR(60),
  amount      DECIMAL(10,2) NOT NULL,
  tax_amount  DECIMAL(10,2) DEFAULT 0,
  status      ENUM('processing','shipped','delivered','returned') DEFAULT 'processing',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Order Items (for COGS / Inventory Turnover calculation)
CREATE TABLE IF NOT EXISTS order_items (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  order_id   INT NOT NULL,
  product_id INT NOT NULL,
  quantity   INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id)   REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES inventory(id)
);

-- Suppliers (with quality_score and on_time_pct for composite scoring)
CREATE TABLE IF NOT EXISTS suppliers (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(100) NOT NULL,
  contact_email     VARCHAR(150) NOT NULL,
  phone             VARCHAR(20),
  city              VARCHAR(100),
  category          VARCHAR(50),
  rating            DECIMAL(2,1) DEFAULT 4.0,
  avg_delivery_days INT DEFAULT 5,
  defect_rate       DECIMAL(5,2) DEFAULT 0.00,
  reliability_score INT DEFAULT 100,
  quality_score     DECIMAL(3,1) DEFAULT 8.0,  -- out of 10
  on_time_pct       DECIMAL(5,2) DEFAULT 90.00, -- percentage
  is_active         TINYINT(1) DEFAULT 1,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Supplier-Product Mapping
CREATE TABLE IF NOT EXISTS supplier_products (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id    INT NOT NULL,
  product_id     INT NOT NULL,
  supply_price   DECIMAL(10,2) NOT NULL,
  lead_time_days INT DEFAULT 3,
  min_order_qty  INT DEFAULT 10,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (product_id)  REFERENCES inventory(id)
);

-- Price History (competitor benchmarks — platform field required)
CREATE TABLE IF NOT EXISTS price_history (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  product_id       INT NOT NULL,
  platform         VARCHAR(30) DEFAULT 'PulseCart',  -- e.g. 'Flipkart', 'Amazon', 'Croma'
  current_price    DECIMAL(10,2) NOT NULL,
  mrp              DECIMAL(10,2) NOT NULL,
  discount_percent DECIMAL(5,2) GENERATED ALWAYS AS (((mrp - current_price) / mrp) * 100) STORED,
  recorded_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES inventory(id)
);

-- Product URL Scans (URL Deep Analysis — no live scraping)
CREATE TABLE IF NOT EXISTS product_url_scans (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  url                  TEXT NOT NULL,
  platform             VARCHAR(30),
  product_slug         VARCHAR(255),
  product_id_extracted VARCHAR(100),
  scan_status          ENUM('success','partial','failed') DEFAULT 'failed',
  matched_product_id   INT,
  data_source          VARCHAR(50) DEFAULT 'url-parse',
  result_json          JSON,
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  type       ENUM('stock','pricing','returns','finance','anomaly','order') NOT NULL,
  severity   ENUM('danger','warning','success','info') NOT NULL,
  title      VARCHAR(200) NOT NULL,
  body       TEXT NOT NULL,
  is_read    TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Anomaly Log (z-score based detection — queried by health-report endpoint)
CREATE TABLE IF NOT EXISTS anomaly_log (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  metric      VARCHAR(50) NOT NULL,
  value       DECIMAL(12,2),
  expected    DECIMAL(12,2),
  z_score     DECIMAL(5,2),
  severity    ENUM('low','medium','high') DEFAULT 'medium',
  description TEXT,
  resolved    TINYINT(1) DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- KPI Snapshots (optional — analytics now uses live queries)
CREATE TABLE IF NOT EXISTS kpis (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  gmv           BIGINT NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
