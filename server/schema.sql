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
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  order_id   VARCHAR(50) UNIQUE NOT NULL,
  customer   VARCHAR(100),
  category   VARCHAR(50),
  channel    VARCHAR(50),
  region     VARCHAR(60),
  amount     DECIMAL(10,2),
  status     ENUM('processing','shipped','delivered','returned') DEFAULT 'processing',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- Sentiment analysis history
CREATE TABLE IF NOT EXISTS sentiment_history (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  url         TEXT NOT NULL,
  platform    VARCHAR(30),
  identifier  VARCHAR(100),
  result_json JSON,
  analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
