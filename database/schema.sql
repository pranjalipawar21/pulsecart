-- ─────────────────────────────────────────────────────────────────────────────
-- PulseCart — MySQL Schema
-- Run: mysql -u root -p < database/schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

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
    price               DECIMAL(10, 2) NOT NULL,
    quantity            INT            NOT NULL DEFAULT 0,
    low_stock_threshold INT            NOT NULL DEFAULT 10,
    location            VARCHAR(100)   DEFAULT 'Main Warehouse',
    created_at          TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Inventory Movements (Full audit trail)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_movements (
    id            INT  AUTO_INCREMENT PRIMARY KEY,
    product_id    INT  NOT NULL,
    change_amount INT  NOT NULL,                       -- positive = in, negative = out
    movement_type ENUM('purchase', 'sale', 'adjustment', 'reorder', 'return') NOT NULL,
    notes         TEXT,
    performed_by  INT  DEFAULT NULL,                   -- FK to users.id (NULL = system)
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id)   REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES users(id)    ON DELETE SET NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Reorder Requests
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reorder_requests (
    id            INT  AUTO_INCREMENT PRIMARY KEY,
    product_id    INT  NOT NULL,
    requested_qty INT  NOT NULL,
    triggered_by  INT  DEFAULT NULL,                   -- FK to users.id
    status        ENUM('pending', 'fulfilled', 'cancelled') NOT NULL DEFAULT 'fulfilled',
    note          TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id)  REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (triggered_by) REFERENCES users(id)   ON DELETE SET NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Product Reviews (for Sentiment Analysis)
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
-- 7. Sentiment Results
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
-- Indexes for performance
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_sku          ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category     ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_qty          ON products(quantity);
CREATE INDEX IF NOT EXISTS idx_movements_product     ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_created     ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_reorders_product      ON reorder_requests(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product       ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_review      ON sentiment_results(review_id);
