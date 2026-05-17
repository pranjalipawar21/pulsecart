-- ─────────────────────────────────────────────────────────────────────────────
-- PulseCart — Seed Data (v3)
-- Run AFTER schema.sql: mysql -u root -p < database/seed.sql
-- Password for all accounts: pranjal@123
-- ─────────────────────────────────────────────────────────────────────────────

USE pulsecart;

-- ─── 1. Users ─────────────────────────────────────────────────────────────────
INSERT IGNORE INTO users (username, password_hash, role, full_name, email) VALUES
('owner', '$2b$12$vUeS/RhSg0DeJRAd5q5NJ.itqt.qTAnA2eXD1AnCjwcqrIfYgx7Y.', 'owner', 'Pranjali Pawar', 'owner@pulsecart.com'),
('staff', '$2b$12$47dkUs4CakwDZ5o8m5fu2ePIOHP2nAgty4AZjnpUGQJt8mYwQHTlG', 'staff', 'Rahul Sharma', 'staff@pulsecart.com'),
('staff2', '$2b$12$47dkUs4CakwDZ5o8m5fu2ePIOHP2nAgty4AZjnpUGQJt8mYwQHTlG', 'staff', 'Sneha Kulkarni', 'staff2@pulsecart.com');

-- ─── 2. Categories ────────────────────────────────────────────────────────────
INSERT IGNORE INTO categories (name, description) VALUES
('Electronics',    'Smartphones, laptops, tablets and accessories'),
('Fashion',        'Clothing, footwear and accessories'),
('Home & Kitchen', 'Kitchenware, appliances and home decor'),
('Sports',         'Sports gear and fitness equipment'),
('Books',          'Educational and recreational books'),
('Grocery',        'Daily essentials, snacks and beverages');

-- ─── 3. Products (22 products) ────────────────────────────────────────────────
INSERT IGNORE INTO products (sku, product_name, category_id, price, cost_price, quantity, low_stock_threshold, supplier_name, location) VALUES
-- Electronics (6)
('ELE-PHN-001', 'Redmi Note 13 Pro 5G',       1, 24999.00, 19500.00,  8, 10, 'Xiaomi India Pvt Ltd',      'Aisle A1'),
('ELE-LP-002',  'ASUS VivoBook 15 (i5)',       1, 45990.00, 36000.00,  5,  8, 'ASUS Technology Pvt Ltd',   'Aisle A2'),
('ELE-AUD-003', 'boAt Airdopes 141 TWS',       1,  1299.00,   850.00, 52, 15, 'Imagine Marketing Ltd',     'Aisle A3'),
('ELE-TAB-004', 'Samsung Galaxy Tab A9+',      1, 22999.00, 17500.00, 12, 10, 'Samsung India Electronics', 'Aisle A4'),
('ELE-CAM-005', 'GoPro HERO 12 Black',         1, 34999.00, 27000.00,  3,  5, 'GoPro Inc (India)',         'Aisle A5'),
('ELE-CHG-006', 'Anker 65W GaN Charger',       1,  2799.00,  1800.00, 45, 12, 'Anker Innovations',         'Aisle A6'),
-- Fashion (4)
('FSH-TSH-007', 'Nike Dri-FIT Training T-Shirt', 2,  1895.00,  1100.00, 25,  8, 'Nike India Pvt Ltd',     'Aisle B1'),
('FSH-SH-008',  'Adidas Ultraboost 22 (Men)',    2, 15999.00, 10500.00,  3,  5, 'Adidas India Ltd',       'Aisle B2'),
('FSH-KRT-009', 'Libas Printed Anarkali Kurti',  2,   899.00,   450.00, 68, 20, 'Libas Fashions Pvt Ltd', 'Aisle B3'),
('FSH-BAG-010', 'Lavie Women Handbag',           2,  1499.00,   850.00, 14,  8, 'Lavie Accessories Ltd',  'Aisle B4'),
-- Home & Kitchen (4)
('HM-IND-011', 'Prestige IRIS 750W Induction',  3, 3450.00, 2200.00, 12,  5, 'TTK Prestige Ltd',         'Aisle C1'),
('HM-PRS-012', 'Hawkins Contura 5L Cooker',     3, 2199.00, 1400.00,  7, 10, 'Hawkins Cookers Ltd',       'Aisle C2'),
('HM-FLK-013', 'Milton Thermosteel 1L Flask',   3,  649.00,  380.00, 34,  8, 'Milton Industries Ltd',    'Aisle C3'),
('HM-ARC-014', 'Philips Air Fryer HD9200',       3, 6999.00, 5100.00,  4,  5, 'Philips India Ltd',        'Aisle C4'),
-- Sports (4)
('SPT-MAT-015', 'Boldfit Pro Yoga Mat 6mm',    4,  799.00,  480.00, 18, 10, 'Boldfit Sports India',    'Aisle D1'),
('SPT-BTL-016', 'Decathlon TRIBAN Water Bottle',4,  299.00,  150.00, 45,  8, 'Decathlon India Ltd',     'Aisle D2'),
('SPT-DUM-017', 'Amazon Basics 5kg Dumbbells', 4, 1499.00,  900.00,  6,  8, 'Amazon Seller Services',  'Aisle D3'),
('SPT-CYC-018', 'Hercules Roadeo Cycle',        4,12999.00, 9500.00,  2,  3, 'TI Cycles India Ltd',     'Aisle D4'),
-- Books (3)
('BKS-HBT-019', 'Atomic Habits — James Clear',  5,  399.00,  200.00, 34, 10, 'Penguin Random House',   'Aisle E1'),
('BKS-RCH-020', 'Rich Dad Poor Dad',            5,  349.00,  180.00,  6, 10, 'Warner Business Books',  'Aisle E2'),
('BKS-ZEN-021', 'Zero to One — Peter Thiel',    5,  499.00,  250.00, 22,  8, 'Crown Business Books',   'Aisle E3'),
-- Grocery (2)
('GRC-OAT-022', 'Saffola Gold Oats 1kg',        6,  220.00,  140.00, 80, 20, 'Marico Industries Ltd',  'Shelf G1');

-- ─── 4. Settings ──────────────────────────────────────────────────────────────
INSERT IGNORE INTO settings (id, store_name, owner_email, low_stock_default_threshold, theme_preference) VALUES
(1, 'PulseCart Retail Store', 'owner@pulsecart.com', 10, 'light');

-- ─── 5. Inventory Movements ───────────────────────────────────────────────────
INSERT IGNORE INTO inventory_movements (product_id, change_amount, movement_type, notes, performed_by) VALUES
(1, 15, 'purchase', 'Initial stock purchase', 1),
(2, 10, 'purchase', 'Initial stock purchase', 1),
(3, 60, 'purchase', 'Initial stock purchase', 1),
(4, 20, 'purchase', 'Initial stock purchase', 1),
(5,  5, 'purchase', 'Initial stock purchase', 1),
(6, 50, 'purchase', 'Initial stock purchase', 1),
(7, 30, 'purchase', 'Initial stock purchase', 1),
(8,  8, 'purchase', 'Initial stock purchase', 1),
(9, 80, 'purchase', 'Initial stock purchase', 1),
(10,20, 'purchase', 'Initial stock purchase', 1),
(11,15, 'purchase', 'Initial stock purchase', 1),
(12,12, 'purchase', 'Initial stock purchase', 1),
(13,40, 'purchase', 'Initial stock purchase', 1),
(14, 6, 'purchase', 'Initial stock purchase', 1),
(15,25, 'purchase', 'Initial stock purchase', 1),
(16,50, 'purchase', 'Initial stock purchase', 1),
(17,10, 'purchase', 'Initial stock purchase', 1),
(18, 4, 'purchase', 'Initial stock purchase', 1),
(19,40, 'purchase', 'Initial stock purchase', 1),
(20,10, 'purchase', 'Initial stock purchase', 1),
(21,25, 'purchase', 'Initial stock purchase', 1),
(22,90, 'purchase', 'Initial stock purchase', 1);

-- Sales (stock out movements)
INSERT IGNORE INTO inventory_movements (product_id, change_amount, movement_type, notes, performed_by) VALUES
(1,  -7, 'sale', 'Units sold to customers', 2),
(2,  -5, 'sale', 'Units sold to customers', 2),
(3,  -8, 'sale', 'Units sold to customers', 2),
(4,  -8, 'sale', 'Units sold to customers', 2),
(5,  -2, 'sale', 'Units sold to customers', 2),
(6,  -5, 'sale', 'Units sold to customers', 2),
(7,  -5, 'sale', 'Units sold to customers', 2),
(8,  -5, 'sale', 'Units sold to customers', 2),
(9, -12, 'sale', 'Units sold to customers', 2),
(10, -6, 'sale', 'Units sold to customers', 2),
(12, -5, 'sale', 'Units sold to customers', 2),
(15, -7, 'sale', 'Units sold to customers', 2),
(17, -4, 'sale', 'Units sold to customers', 2),
(18, -2, 'sale', 'Units sold to customers', 2),
(19, -6, 'sale', 'Units sold to customers', 2),
(20, -4, 'sale', 'Units sold to customers', 2),
(22,-10, 'sale', 'Units sold to customers', 2);

-- ─── 6. Sales Records (30 days history) ──────────────────────────────────────
INSERT IGNORE INTO sales (product_id, quantity_sold, selling_price, staff_id, sale_date) VALUES
-- Today
(3,  3, 1299.00, 2, NOW()),
(7,  2, 1895.00, 2, NOW()),
(9,  5,  899.00, 2, NOW()),
(13, 2,  649.00, 2, NOW()),
(19, 3,  399.00, 2, NOW()),
(22, 8,  220.00, 2, NOW()),
-- Yesterday
(1,  1, 24999.00, 2, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(6,  2,  2799.00, 2, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(15, 3,   799.00, 2, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(16, 5,   299.00, 2, DATE_SUB(NOW(), INTERVAL 1 DAY)),
-- 3 days ago
(4,  2, 22999.00, 2, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(3,  4,  1299.00, 2, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(9,  8,   899.00, 2, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(21, 3,   499.00, 2, DATE_SUB(NOW(), INTERVAL 3 DAY)),
-- 5 days ago
(2,  1, 45990.00, 2, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(7,  3,  1895.00, 2, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(10, 4,  1499.00, 2, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(22,12,   220.00, 2, DATE_SUB(NOW(), INTERVAL 5 DAY)),
-- 7 days ago
(1,  2, 24999.00, 2, DATE_SUB(NOW(), INTERVAL 7 DAY)),
(5,  1, 34999.00, 2, DATE_SUB(NOW(), INTERVAL 7 DAY)),
(6,  3,  2799.00, 2, DATE_SUB(NOW(), INTERVAL 7 DAY)),
(19, 5,   399.00, 2, DATE_SUB(NOW(), INTERVAL 7 DAY)),
-- 10 days ago
(3,  6, 1299.00, 2, DATE_SUB(NOW(), INTERVAL 10 DAY)),
(4,  1, 22999.00,2, DATE_SUB(NOW(), INTERVAL 10 DAY)),
(11, 2, 3450.00, 2, DATE_SUB(NOW(), INTERVAL 10 DAY)),
(16, 8,  299.00, 2, DATE_SUB(NOW(), INTERVAL 10 DAY)),
-- 14 days ago
(7,  4, 1895.00, 2, DATE_SUB(NOW(), INTERVAL 14 DAY)),
(9, 10,  899.00, 2, DATE_SUB(NOW(), INTERVAL 14 DAY)),
(20, 3,  349.00, 2, DATE_SUB(NOW(), INTERVAL 14 DAY)),
(22,15,  220.00, 2, DATE_SUB(NOW(), INTERVAL 14 DAY)),
-- 18 days ago
(1,  1, 24999.00,2, DATE_SUB(NOW(), INTERVAL 18 DAY)),
(2,  1, 45990.00,2, DATE_SUB(NOW(), INTERVAL 18 DAY)),
(6,  2,  2799.00,2, DATE_SUB(NOW(), INTERVAL 18 DAY)),
(13, 4,   649.00,2, DATE_SUB(NOW(), INTERVAL 18 DAY)),
-- 22 days ago
(3,  5, 1299.00, 2, DATE_SUB(NOW(), INTERVAL 22 DAY)),
(8,  1, 15999.00,2, DATE_SUB(NOW(), INTERVAL 22 DAY)),
(15, 4,   799.00,2, DATE_SUB(NOW(), INTERVAL 22 DAY)),
(19, 6,   399.00,2, DATE_SUB(NOW(), INTERVAL 22 DAY)),
-- 27 days ago
(4,  3, 22999.00,2, DATE_SUB(NOW(), INTERVAL 27 DAY)),
(9, 12,   899.00,2, DATE_SUB(NOW(), INTERVAL 27 DAY)),
(16,10,   299.00,2, DATE_SUB(NOW(), INTERVAL 27 DAY)),
(22,20,   220.00,2, DATE_SUB(NOW(), INTERVAL 27 DAY));

-- ─── 7. Reorder Alerts ────────────────────────────────────────────────────────
INSERT IGNORE INTO reorder_alerts (product_id, current_stock, threshold, supplier_name, status) VALUES
(1,  8, 10, 'Xiaomi India Pvt Ltd',     'pending'),
(2,  5,  8, 'ASUS Technology Pvt Ltd',  'pending'),
(5,  3,  5, 'GoPro Inc (India)',         'pending'),
(8,  3,  5, 'Adidas India Ltd',          'pending'),
(12, 7, 10, 'Hawkins Cookers Ltd',       'pending'),
(14, 4,  5, 'Philips India Ltd',         'pending'),
(17, 6,  8, 'Amazon Seller Services',    'pending'),
(18, 2,  3, 'TI Cycles India Ltd',       'pending'),
(20, 6, 10, 'Warner Business Books',     'completed');

-- ─── 8. Reorder Requests (legacy) ────────────────────────────────────────────
INSERT IGNORE INTO reorder_requests (product_id, requested_qty, triggered_by, status, note) VALUES
(2,  50, 1, 'fulfilled', 'Emergency reorder — low stock'),
(8,  40, 1, 'fulfilled', 'Critical stock reorder'),
(12, 30, 1, 'pending',   'Needs restocking');
