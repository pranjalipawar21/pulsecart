-- PulseCart Phase 2: Sample Seed Data

USE pulsecart;

-- 1. Seed Categories
INSERT INTO categories (name, description) VALUES
('Electronics', 'Smartphones, laptops, and accessories'),
('Fashion', 'Clothing and footwear'),
('Home & Kitchen', 'Kitchenware and home decor'),
('Sports', 'Sports gear and fitness equipment');

-- 2. Seed Products
-- Electronics
INSERT INTO products (sku, product_name, category_id, price, quantity, low_stock_threshold, location) VALUES
('ELE-PHN-001', 'Redmi Note 13 Pro', 1, 24999.00, 15, 10, 'Aisle A1'),
('ELE-LP-002', 'ASUS VivoBook 15', 1, 45990.00, 5, 8, 'Aisle A2'), -- Low stock
('ELE-AUD-003', 'boAt Airdopes 141', 1, 1299.00, 42, 15, 'Aisle A3');

-- Fashion
INSERT INTO products (sku, product_name, category_id, price, quantity, low_stock_threshold, location) VALUES
('FSH-TSH-004', 'Nike Dri-FIT T-Shirt', 2, 1895.00, 25, 5, 'Aisle B1'),
('FSH-SH-005', 'Adidas Ultraboost', 2, 15999.00, 3, 5, 'Aisle B2'); -- Critical stock

-- Home & Kitchen
INSERT INTO products (sku, product_name, category_id, price, quantity, low_stock_threshold, location) VALUES
('HM-KT-006', 'Prestige Induction Cooktop', 3, 3450.00, 12, 5, 'Aisle C1');

-- 3. Initial Inventory Movements (Optional)
INSERT INTO inventory_movements (product_id, change_amount, movement_type, notes) VALUES
(1, 15, 'purchase', 'Initial stock setup'),
(2, 5, 'purchase', 'Initial stock setup'),
(3, 42, 'purchase', 'Initial stock setup'),
(4, 25, 'purchase', 'Initial stock setup'),
(5, 3, 'purchase', 'Initial stock setup'),
(6, 12, 'purchase', 'Initial stock setup');
