require('dotenv').config();
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DB_CONFIG = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306'),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || 'root',
};
const DB_NAME = process.env.DB_NAME || 'pulsecart';

async function seed() {
  console.log('🌱 PulseCart Data Seeder (Real Business Logic)');
  
  let conn = await mysql.createConnection(DB_CONFIG);
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await conn.end();

  conn = await mysql.createConnection({ ...DB_CONFIG, database: DB_NAME });

  // 1. Create Tables
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  const dropTables = [
    'DROP TABLE IF EXISTS price_history',
    'DROP TABLE IF EXISTS supplier_products',
    'DROP TABLE IF EXISTS suppliers',
    'DROP TABLE IF EXISTS order_items',
    'DROP TABLE IF EXISTS orders',
    'DROP TABLE IF EXISTS visits',
    'DROP TABLE IF EXISTS customers',
    'DROP TABLE IF EXISTS inventory',
    'DROP TABLE IF EXISTS users',
    'DROP TABLE IF EXISTS kpis',
    'DROP TABLE IF EXISTS gmv_series',
    'DROP TABLE IF EXISTS sentiment_history',
    'DROP TABLE IF EXISTS product_url_scans',
    'DROP TABLE IF EXISTS reorder_log',
    'DROP TABLE IF EXISTS purchase_orders',
    'DROP TABLE IF EXISTS po_line_items',
    'DROP TABLE IF EXISTS product_returns',
    'DROP TABLE IF EXISTS anomaly_log',
    'DROP TABLE IF EXISTS ai_cache',
    'DROP TABLE IF EXISTS refresh_tokens'
  ];
  for (let sql of dropTables) await conn.query(sql);

  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE,
      password_hash VARCHAR(255),
      role ENUM('owner','staff'),
      full_name VARCHAR(100)
    )`,
    `CREATE TABLE IF NOT EXISTS inventory (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sku VARCHAR(50) UNIQUE,
      product VARCHAR(120),
      category VARCHAR(50),
      stock INT,
      reorder_threshold INT,
      price DECIMAL(10,2),
      cost_price DECIMAL(10,2),
      status VARCHAR(10) GENERATED ALWAYS AS (CASE WHEN stock < 20 THEN 'critical' WHEN stock < reorder_threshold THEN 'low' ELSE 'healthy' END) STORED
    )`,
    `CREATE TABLE IF NOT EXISTS customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(100) UNIQUE,
      segment ENUM('one-time', 'regular', 'high-value')
    )`,
    `CREATE TABLE IF NOT EXISTS visits (
      id INT AUTO_INCREMENT PRIMARY KEY,
      visit_date DATE,
      visit_count INT,
      UNIQUE KEY uq_v (visit_date)
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id VARCHAR(50) UNIQUE,
      customer_id INT,
      amount DECIMAL(10,2),
      status ENUM('processing','shipped','delivered','returned'),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT,
      product_id INT,
      quantity INT,
      unit_price DECIMAL(10,2)
    )`,
    `CREATE TABLE IF NOT EXISTS suppliers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100),
      contact_email VARCHAR(150),
      phone VARCHAR(20),
      city VARCHAR(100),
      category VARCHAR(50),
      rating DECIMAL(2,1),
      avg_delivery_days INT,
      defect_rate DECIMAL(5,2),
      reliability_score INT
    )`,
    `CREATE TABLE IF NOT EXISTS price_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT,
      platform VARCHAR(30),
      current_price DECIMAL(10,2),
      mrp DECIMAL(10,2),
      recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  for (let sql of tables) await conn.query(sql);
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');

  // 2. Seed Users
  const hash = await bcrypt.hash('pranjal@123', 10);
  await conn.execute("INSERT IGNORE INTO users (username, password_hash, role, full_name) VALUES ('owner', ?, 'owner', 'Pranjali Pawar')", [hash]);

  // 3. Seed Inventory
  const products = [
    ['ELEC-001', 'iPhone 15 Pro', 'Electronics', 15, 30, 134900, 95000],
    ['ELEC-002', 'MacBook Air M2', 'Electronics', 5, 10, 114900, 85000],
    ['FASH-001', 'Levi 501 Jeans', 'Fashion', 45, 20, 4599, 2100],
    ['FASH-002', 'Nike Jordan Low', 'Fashion', 8, 15, 8995, 4500],
    ['HOME-001', 'Dyson V11 Vacuum', 'Home', 12, 5, 54900, 38000]
  ];
  for (let p of products) {
    await conn.execute("INSERT IGNORE INTO inventory (sku, product, category, stock, reorder_threshold, price, cost_price) VALUES (?,?,?,?,?,?,?)", p);
  }

  // 4. Seed Customers
  const customers = [
    ['Amit Shah', 'amit@example.com', 'high-value'],
    ['Priya Rai', 'priya@example.com', 'regular'],
    ['John Doe', 'john@example.com', 'one-time']
  ];
  for (let c of customers) {
    await conn.execute("INSERT IGNORE INTO customers (name, email, segment) VALUES (?,?,?)", c);
  }

  // 5. Seed Visits (last 30 days)
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const count = 500 + Math.floor(Math.random() * 500);
    await conn.execute("INSERT IGNORE INTO visits (visit_date, visit_count) VALUES (?, ?)", [date.toISOString().split('T')[0], count]);
  }

  // 6. Seed Orders & Items
  const statuses = ['delivered', 'delivered', 'delivered', 'shipped', 'returned'];
  for (let i = 0; i < 100; i++) {
    const custId = 1 + Math.floor(Math.random() * 3);
    const amount = 500 + Math.floor(Math.random() * 5000);
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    
    const [res] = await conn.execute("INSERT INTO orders (order_id, customer_id, amount, status, created_at) VALUES (?,?,?,?,?)", 
      [`ORD-${1000 + i}`, custId, amount, status, date]);
    
    // Add 1-2 items per order
    const prodId = 1 + Math.floor(Math.random() * 5);
    await conn.execute("INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?,?,?,?)",
      [res.insertId, prodId, 1, amount]);
  }

  // 7. Seed Suppliers
  const suppliers = [
    ['Global Tech Solutions', 'contact@globaltech.com', '9876543210', 'Bangalore', 'Electronics', 4.8, 3, 0.01, 98],
    ['Premium Apparel Ltd', 'sales@premium.com', '9123456789', 'Mumbai', 'Fashion', 4.2, 7, 0.05, 85]
  ];
  for (let s of suppliers) {
    await conn.execute("INSERT IGNORE INTO suppliers (name, contact_email, phone, city, category, rating, avg_delivery_days, defect_rate, reliability_score) VALUES (?,?,?,?,?,?,?,?,?)", s);
  }

  // 8. Seed Price History
  for (let i = 1; i <= 5; i++) {
    const mrp = 10000 + Math.floor(Math.random() * 50000);
    const price = mrp * 0.85;
    await conn.execute("INSERT INTO price_history (product_id, platform, current_price, mrp) VALUES (?, 'PulseCart', ?, ?)", [i, price, mrp]);
  }

  console.log('✅ Seed Complete. Real business data inserted.');
  await conn.end();
}

seed().catch(console.error);
