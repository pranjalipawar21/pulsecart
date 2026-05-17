-- ─────────────────────────────────────────────────────────────────────────────
-- PulseCart — Seed Data
-- Run AFTER schema.sql: mysql -u root -p < database/seed.sql
-- Passwords are bcrypt-hashed (cost 12). Plain text: pranjal@123
-- ─────────────────────────────────────────────────────────────────────────────

USE pulsecart;

-- ─── 1. Users ─────────────────────────────────────────────────────────────────
-- Both accounts use password: pranjal@123
INSERT IGNORE INTO users (username, password_hash, role, full_name) VALUES
('owner', '$2b$12$vUeS/RhSg0DeJRAd5q5NJ.itqt.qTAnA2eXD1AnCjwcqrIfYgx7Y.', 'owner', 'Store Owner'),
('staff', '$2b$12$47dkUs4CakwDZ5o8m5fu2ePIOHP2nAgty4AZjnpUGQJt8mYwQHTlG', 'staff', 'Staff Member');

-- ─── 2. Categories ────────────────────────────────────────────────────────────
INSERT IGNORE INTO categories (name, description) VALUES
('Electronics',   'Smartphones, laptops, and accessories'),
('Fashion',       'Clothing and footwear'),
('Home & Kitchen','Kitchenware and home decor'),
('Sports',        'Sports gear and fitness equipment'),
('Books',         'Educational and recreational books');

-- ─── 3. Products ──────────────────────────────────────────────────────────────
INSERT IGNORE INTO products (sku, product_name, category_id, price, quantity, low_stock_threshold, location) VALUES
-- Electronics (category_id = 1)
('ELE-PHN-001', 'Redmi Note 13 Pro',    1, 24999.00,  8,  10, 'Aisle A1'),  -- critical stock
('ELE-LP-002',  'ASUS VivoBook 15',     1, 45990.00,  5,   8, 'Aisle A2'),  -- low stock
('ELE-AUD-003', 'boAt Airdopes 141',    1,  1299.00, 52,  15, 'Aisle A3'),  -- healthy
('ELE-TAB-004', 'Samsung Galaxy Tab A9',1, 18999.00, 12,  10, 'Aisle A4'),  -- healthy
-- Fashion (category_id = 2)
('FSH-TSH-005', 'Nike Dri-FIT T-Shirt', 2,  1895.00, 25,   5, 'Aisle B1'),  -- healthy
('FSH-SH-006',  'Adidas Ultraboost',    2, 15999.00,  3,   5, 'Aisle B2'),  -- critical stock
('FSH-KRT-007', 'Libas Printed Kurti',  2,   899.00, 68,  20, 'Aisle B3'),  -- healthy
-- Home & Kitchen (category_id = 3)
('HM-IND-008',  'Prestige Induction Cooktop', 3, 3450.00, 12,  5, 'Aisle C1'), -- healthy
('HM-PRS-009',  'Prestige Pressure Cooker',   3, 2199.00,  7, 10, 'Aisle C2'), -- low stock
('HM-FLK-010',  'Milton Thermosteel Flask',   3,  649.00, 34,  8, 'Aisle C3'), -- healthy
-- Sports (category_id = 4)
('SPT-MAT-011', 'Boldfit Yoga Mat 6mm', 4,  799.00, 18, 10, 'Aisle D1'),  -- low stock
('SPT-BTL-012', 'Decathlon Water Bottle',4,  299.00, 45,  8, 'Aisle D2'), -- healthy
-- Books (category_id = 5)
('BKS-HBT-013', 'Atomic Habits',        5,  399.00, 34, 10, 'Aisle E1'),  -- healthy
('BKS-RCH-014', 'Rich Dad Poor Dad',    5,  349.00,  6, 10, 'Aisle E2');  -- low stock

-- ─── 4. Inventory Movements (realistic history for analytics charts) ──────────
-- Use user_id = 1 (owner) as performed_by for historical entries

-- Initial purchase/stock entries
INSERT IGNORE INTO inventory_movements (product_id, change_amount, movement_type, notes, performed_by) VALUES
(1,  15, 'purchase',   'Initial stock purchase', 1),
(2,  10, 'purchase',   'Initial stock purchase', 1),
(3,  60, 'purchase',   'Initial stock purchase', 1),
(4,  20, 'purchase',   'Initial stock purchase', 1),
(5,  30, 'purchase',   'Initial stock purchase', 1),
(6,   8, 'purchase',   'Initial stock purchase', 1),
(7,  80, 'purchase',   'Initial stock purchase', 1),
(8,  15, 'purchase',   'Initial stock purchase', 1),
(9,  12, 'purchase',   'Initial stock purchase', 1),
(10, 40, 'purchase',   'Initial stock purchase', 1),
(11, 25, 'purchase',   'Initial stock purchase', 1),
(12, 50, 'purchase',   'Initial stock purchase', 1),
(13, 40, 'purchase',   'Initial stock purchase', 1),
(14, 10, 'purchase',   'Initial stock purchase', 1);

-- Sales / stock out entries (to create realistic decrements)
INSERT IGNORE INTO inventory_movements (product_id, change_amount, movement_type, notes, performed_by) VALUES
(1,  -7, 'sale',       'Units sold', 1),
(2,  -5, 'sale',       'Units sold', 1),
(3,  -8, 'sale',       'Units sold', 1),
(5,  -5, 'sale',       'Units sold', 1),
(6,  -5, 'sale',       'Units sold', 1),
(7, -12, 'sale',       'Units sold', 1),
(9,  -5, 'sale',       'Units sold', 1),
(11, -7, 'sale',       'Units sold', 1),
(14, -4, 'sale',       'Units sold', 1);

-- Reorder history
INSERT IGNORE INTO inventory_movements (product_id, change_amount, movement_type, notes, performed_by) VALUES
(2,   5, 'reorder',    'Emergency reorder — low stock', 1),
(6,   3, 'reorder',    'Critical stock reorder', 1),
(9,   5, 'reorder',    'Stock topped up', 1);

-- ─── 5. Reorder Requests ──────────────────────────────────────────────────────
INSERT IGNORE INTO reorder_requests (product_id, requested_qty, triggered_by, status, note) VALUES
(2,  50, 1, 'fulfilled', 'Emergency reorder — low stock'),
(6,  40, 1, 'fulfilled', 'Critical stock reorder'),
(9,  30, 1, 'fulfilled', 'Stock topped up');
