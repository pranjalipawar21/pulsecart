-- ─────────────────────────────────────────────────────────────────────────────
-- PulseCart — MySQL Schema (v3)
-- Run fresh: mysql -u root -p < database/schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS pulsecart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pulsecart;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Users
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            INT          AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('owner', 'staff') NOT NULL DEFAULT 'staff',
    full_name     VARCHAR(100) DEFAULT '',
    email         VARCHAR(255) DEFAULT '',
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Categories
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
    id          INT          AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Products (Inventory)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    id                  INT            AUTO_INCREMENT PRIMARY KEY,
    sku                 VARCHAR(50)    NOT NULL UNIQUE,
    product_name        VARCHAR(255)   NOT NULL,
    category_id         INT,
    price               DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    cost_price          DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    quantity            INT            NOT NULL DEFAULT 0,
    low_stock_threshold INT            NOT NULL DEFAULT 10,
    supplier_name       VARCHAR(200)   DEFAULT '',
    location            VARCHAR(100)   DEFAULT 'Main Warehouse',
    created_at          TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Sales
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales (
    id            INT            AUTO_INCREMENT PRIMARY KEY,
    product_id    INT            NOT NULL,
    quantity_sold INT            NOT NULL,
    selling_price DECIMAL(10, 2) NOT NULL,
    sale_date     TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    staff_id      INT            DEFAULT NULL,
    notes         TEXT,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id)   REFERENCES users(id)    ON DELETE SET NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Inventory Movements (Full audit trail)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_movements (
    id            INT  AUTO_INCREMENT PRIMARY KEY,
    product_id    INT  NOT NULL,
    change_amount INT  NOT NULL,
    movement_type ENUM('purchase', 'sale', 'adjustment', 'reorder', 'return') NOT NULL,
    notes         TEXT,
    performed_by  INT  DEFAULT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id)   REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES users(id)    ON DELETE SET NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Reorder Alerts
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reorder_alerts (
    id            INT  AUTO_INCREMENT PRIMARY KEY,
    product_id    INT  NOT NULL,
    current_stock INT  NOT NULL,
    threshold     INT  NOT NULL,
    supplier_name VARCHAR(200) DEFAULT '',
    status        ENUM('pending', 'completed') NOT NULL DEFAULT 'pending',
    notes         TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at  TIMESTAMP NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Reorder Requests (legacy, kept for compatibility)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reorder_requests (
    id            INT  AUTO_INCREMENT PRIMARY KEY,
    product_id    INT  NOT NULL,
    requested_qty INT  NOT NULL,
    triggered_by  INT  DEFAULT NULL,
    status        ENUM('pending', 'fulfilled', 'cancelled') NOT NULL DEFAULT 'pending',
    note          TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id)   REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (triggered_by) REFERENCES users(id)    ON DELETE SET NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Settings
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
    id                          INT          AUTO_INCREMENT PRIMARY KEY,
    store_name                  VARCHAR(200) DEFAULT 'PulseCart Store',
    owner_email                 VARCHAR(255) DEFAULT '',
    low_stock_default_threshold INT          DEFAULT 10,
    theme_preference            VARCHAR(20)  DEFAULT 'light',
    currency                    VARCHAR(10)  DEFAULT 'INR',
    timezone                    VARCHAR(50)  DEFAULT 'Asia/Kolkata',
    updated_at                  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Product Reviews (for Sentiment Analysis)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_reviews (
    id           INT  AUTO_INCREMENT PRIMARY KEY,
    product_id   INT  DEFAULT NULL,
    product_name VARCHAR(255),
    review_text  TEXT NOT NULL,
    rating       INT,
    review_date  DATE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. Sentiment Results
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sentiment_results (
    id         INT            AUTO_INCREMENT PRIMARY KEY,
    review_id  INT            NOT NULL,
    score      DECIMAL(5, 4),
    label      ENUM('positive', 'neutral', 'negative'),
    confidence DECIMAL(5, 4),
    keywords   TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (review_id) REFERENCES product_reviews(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_sku      ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_qty      ON products(quantity);
CREATE INDEX IF NOT EXISTS idx_sales_product     ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_date        ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_staff       ON sales(staff_id);
CREATE INDEX IF NOT EXISTS idx_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_created ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_product    ON reorder_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status     ON reorder_alerts(status);
CREATE INDEX IF NOT EXISTS idx_reorders_product  ON reorder_requests(product_id);

SET FOREIGN_KEY_CHECKS = 1;
