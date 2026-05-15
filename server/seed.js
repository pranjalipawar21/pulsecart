/**
 * PulseCart Database Seeder — Production-Grade
 * Run: node seed.js
 * Drops and rebuilds all tables with realistic Indian retail data.
 * All business metrics are calculated from this seeded data — no hardcoded frontend values.
 */
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr)       { return arr[rand(0, arr.length - 1)]; }
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

async function seed() {
  console.log('🌱 PulseCart Data Seeder — starting...');

  // Connect without DB first to create it
  let conn = await mysql.createConnection(DB_CONFIG);
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await conn.end();

  conn = await mysql.createConnection({ ...DB_CONFIG, database: DB_NAME });
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');

  // ─── Drop Tables (in dependency order) ────────────────────────────────────
  const drops = [
    'anomaly_log', 'ai_cache', 'refresh_tokens', 'reorder_log',
    'purchase_orders', 'po_line_items', 'product_returns',
    'sentiment_history', 'product_url_scans',
    'price_history', 'supplier_products', 'suppliers',
    'order_items', 'orders', 'visits', 'customers',
    'inventory', 'kpis', 'gmv_series', 'users', 'notifications',
  ];
  for (const t of drops) await conn.query(`DROP TABLE IF EXISTS ${t}`);

  // ─── Create Tables ────────────────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE users (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      username      VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role          ENUM('owner','staff') NOT NULL DEFAULT 'staff',
      full_name     VARCHAR(100),
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.query(`
    CREATE TABLE inventory (
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
    )
  `);

  await conn.query(`
    CREATE TABLE customers (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      name       VARCHAR(100) NOT NULL,
      email      VARCHAR(100) UNIQUE,
      phone      VARCHAR(20),
      segment    ENUM('one-time','regular','high-value') DEFAULT 'one-time',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.query(`
    CREATE TABLE visits (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      visit_date  DATE NOT NULL DEFAULT (CURRENT_DATE),
      platform    ENUM('web','app','mobile_web') DEFAULT 'web',
      visit_count INT DEFAULT 0,
      UNIQUE KEY uq_visit (visit_date, platform)
    )
  `);

  await conn.query(`
    CREATE TABLE orders (
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
    )
  `);

  await conn.query(`
    CREATE TABLE order_items (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      order_id   INT NOT NULL,
      product_id INT NOT NULL,
      quantity   INT NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (order_id)   REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES inventory(id)
    )
  `);

  await conn.query(`
    CREATE TABLE suppliers (
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
      quality_score     DECIMAL(3,1) DEFAULT 8.0,
      on_time_pct       DECIMAL(5,2) DEFAULT 90.00,
      is_active         TINYINT(1) DEFAULT 1,
      created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.query(`
    CREATE TABLE supplier_products (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      supplier_id    INT NOT NULL,
      product_id     INT NOT NULL,
      supply_price   DECIMAL(10,2) NOT NULL,
      lead_time_days INT DEFAULT 3,
      min_order_qty  INT DEFAULT 10,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (product_id)  REFERENCES inventory(id)
    )
  `);

  await conn.query(`
    CREATE TABLE price_history (
      id               INT AUTO_INCREMENT PRIMARY KEY,
      product_id       INT NOT NULL,
      platform         VARCHAR(30) DEFAULT 'PulseCart',
      current_price    DECIMAL(10,2) NOT NULL,
      mrp              DECIMAL(10,2) NOT NULL,
      discount_percent DECIMAL(5,2) GENERATED ALWAYS AS (((mrp - current_price) / mrp) * 100) STORED,
      recorded_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES inventory(id)
    )
  `);

  await conn.query(`
    CREATE TABLE product_url_scans (
      id                  INT AUTO_INCREMENT PRIMARY KEY,
      url                 TEXT NOT NULL,
      platform            VARCHAR(30),
      product_slug        VARCHAR(255),
      product_id_extracted VARCHAR(100),
      scan_status         ENUM('success','partial','failed') DEFAULT 'failed',
      matched_product_id  INT,
      data_source         VARCHAR(50) DEFAULT 'url-parse',
      result_json         JSON,
      created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.query(`
    CREATE TABLE notifications (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      type       ENUM('stock','pricing','returns','finance','anomaly','order') NOT NULL,
      severity   ENUM('danger','warning','success','info') NOT NULL,
      title      VARCHAR(200) NOT NULL,
      body       TEXT NOT NULL,
      is_read    TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.query(`
    CREATE TABLE anomaly_log (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      metric       VARCHAR(50) NOT NULL,
      value        DECIMAL(12,2),
      expected     DECIMAL(12,2),
      z_score      DECIMAL(5,2),
      severity     ENUM('low','medium','high') DEFAULT 'medium',
      description  TEXT,
      resolved     TINYINT(1) DEFAULT 0,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.query(`
    CREATE TABLE kpis (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      gmv           BIGINT NOT NULL,
      snapshot_date DATE NOT NULL DEFAULT (CURRENT_DATE),
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('✅ Tables created');

  // ─── 1. Users ─────────────────────────────────────────────────────────────
  const hash = await bcrypt.hash('pranjal@123', 10);
  await conn.execute(
    "INSERT INTO users (username, password_hash, role, full_name) VALUES (?,?,'owner','Pranjali Pawar')",
    ['owner', hash]
  );
  const staffHash = await bcrypt.hash('staff@123', 10);
  await conn.execute(
    "INSERT INTO users (username, password_hash, role, full_name) VALUES (?,?,'staff','Rahul Staff')",
    ['staff', staffHash]
  );
  console.log('✅ Users seeded (owner / staff)');

  // ─── 2. Inventory ─────────────────────────────────────────────────────────
  // Realistic Indian retail SKUs across categories
  const products = [
    // SKU, Product, Category, Stock, ReorderThreshold, Price, CostPrice, Location
    ['ELEC-001', 'Apple iPhone 15 Pro 128GB', 'Electronics',    14, 30, 134900, 95000, 'Rack A-1'],
    ['ELEC-002', 'Apple MacBook Air M2 256GB','Electronics',     5, 10, 114900, 85000, 'Rack A-2'],
    ['ELEC-003', 'Samsung Galaxy S24 Ultra',  'Electronics',    22, 20, 124999, 88000, 'Rack A-3'],
    ['ELEC-004', 'Sony WH-1000XM5 Headphones','Electronics',    37, 25,  29990, 18000, 'Rack A-4'],
    ['ELEC-005', 'boAt Rockerz 450 Pro',       'Electronics',     8, 30,   2499,   980, 'Rack A-5'],
    ['FASH-001', "Levi's 511 Slim Fit Jeans",  'Fashion',        45, 20,   4599,  2100, 'Rack B-1'],
    ['FASH-002', 'Nike Air Max 270',            'Fashion',         8, 15,   8995,  4500, 'Rack B-2'],
    ['FASH-003', 'Allen Solly Formal Shirt',    'Fashion',        60, 25,   1899,   780, 'Rack B-3'],
    ['FASH-004', 'Puma Men Sports Shorts',      'Fashion',        33, 20,   1299,   550, 'Rack B-4'],
    ['HOME-001', 'Dyson V11 Cordless Vacuum',   'Home & Kitchen', 12,  5,  54900, 38000, 'Rack C-1'],
    ['HOME-002', 'Instant Pot Duo 7-in-1',      'Home & Kitchen', 28, 15,   9999,  5800, 'Rack C-2'],
    ['HOME-003', 'Philips Air Fryer HD9200',    'Home & Kitchen',  6, 10,   6499,  3800, 'Rack C-3'],
    ['SPRT-001', 'Yonex Arcsaber 11 Badminton', 'Sports',          3, 10,  18999, 12000, 'Rack D-1'],
    ['SPRT-002', 'Decathlon Running Shoes',      'Sports',         40, 20,   2999,  1400, 'Rack D-2'],
    ['HLTH-001', 'HealthKart HK Vitals Fish Oil','Health & Beauty', 9, 20,    899,   350, 'Rack E-1'],
    ['HLTH-002', 'Mamaearth Vitamin C Serum',    'Health & Beauty',25, 15,    899,   340, 'Rack E-2'],
    ['BOOK-001', 'Atomic Habits — James Clear',  'Books',          50, 10,    399,   180, 'Rack F-1'],
    ['BOOK-002', 'The Psychology of Money',       'Books',          42, 10,    349,   150, 'Rack F-2'],
  ];
  for (const p of products) {
    await conn.execute(
      'INSERT INTO inventory (sku, product, category, stock, reorder_threshold, price, cost_price, location) VALUES (?,?,?,?,?,?,?,?)',
      p
    );
  }
  console.log(`✅ Inventory seeded (${products.length} SKUs)`);

  // ─── 3. Customers ─────────────────────────────────────────────────────────
  const customers = [
    ['Amit Shah',        'amit.shah@gmail.com',       '9876543201', 'high-value'],
    ['Priya Rai',        'priya.rai@gmail.com',        '9123456702', 'regular'],
    ['Rohan Malhotra',   'rohan.m@outlook.com',        '9988776603', 'high-value'],
    ['Sneha Kulkarni',   'sneha.k@gmail.com',          '9775544304', 'regular'],
    ['Vikram Nair',      'vikram.nair@yahoo.com',      '9654321005', 'one-time'],
    ['Ananya Iyer',      'ananya.iyer@gmail.com',      '9871236706', 'regular'],
    ['Rajesh Sharma',    'rajesh.sharma@gmail.com',    '9765432107', 'high-value'],
    ['Meera Patel',      'meera.patel@gmail.com',      '9654129808', 'one-time'],
    ['Siddharth Verma',  'siddharth.v@outlook.com',    '9512348709', 'regular'],
    ['Divya Menon',      'divya.menon@gmail.com',      '9432187610', 'high-value'],
  ];
  for (const c of customers) {
    await conn.execute(
      'INSERT INTO customers (name, email, phone, segment) VALUES (?,?,?,?)',
      c
    );
  }
  console.log('✅ Customers seeded');

  // ─── 4. Visits (last 60 days, web + app) ──────────────────────────────────
  for (let i = 0; i < 60; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const weekday = d.getDay();
    // Weekend boost
    const base = weekday === 0 || weekday === 6 ? 900 : 600;
    await conn.execute(
      'INSERT IGNORE INTO visits (visit_date, platform, visit_count) VALUES (?,?,?)',
      [dateStr, 'web', base + rand(0, 300)]
    );
    await conn.execute(
      'INSERT IGNORE INTO visits (visit_date, platform, visit_count) VALUES (?,?,?)',
      [dateStr, 'app', Math.floor((base + rand(0, 300)) * 0.6)]
    );
  }
  console.log('✅ Visits seeded (60 days)');

  // ─── 5. Orders & Order Items (last 60 days) ───────────────────────────────
  const CHANNELS  = ['Organic','Paid Search','Social','Email','App','Direct','Affiliate'];
  const REGIONS   = ['Mumbai','Delhi NCR','Bangalore','Hyderabad','Chennai','Pune','Ahmedabad','Kolkata'];
  const NAMES     = ['Aarav Shah','Priya Rai','Rohit Kumar','Ananya Iyer','Vikram Singh',
                     'Sneha Patel','Arjun Verma','Meera Nair','Karan Joshi','Divya Reddy',
                     'Rajesh Gupta','Pooja Malhotra','Amit Menon','Neha Kulkarni'];
  const STATUSES  = ['delivered','delivered','delivered','shipped','processing','returned'];

  let orderNum = 1000;
  for (let i = 0; i < 200; i++) {
    const custId   = rand(1, 10);
    const custName = NAMES[rand(0, NAMES.length - 1)];
    const prodIdx  = rand(0, products.length - 1);
    const prodCat  = products[prodIdx][2];
    const prodPrice= Number(products[prodIdx][5]);
    const qty      = rand(1, 3);
    const amount   = prodPrice * qty * (0.85 + Math.random() * 0.25);
    const tax      = amount * 0.18;
    const status   = pick(STATUSES);
    const dAgo     = rand(0, 59);

    const [res] = await conn.execute(
      `INSERT INTO orders (order_id, customer_id, customer, category, channel, region, amount, tax_amount, status, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        `PC-2024-${++orderNum}`,
        custId,
        custName,
        prodCat,
        pick(CHANNELS),
        pick(REGIONS),
        amount.toFixed(2),
        tax.toFixed(2),
        status,
        daysAgo(dAgo),
      ]
    );
    // Order item
    await conn.execute(
      'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?,?,?,?)',
      [res.insertId, prodIdx + 1, qty, prodPrice]
    );
  }
  console.log('✅ Orders seeded (200 orders, 60-day range)');

  // ─── 6. Suppliers ─────────────────────────────────────────────────────────
  // Columns: name, email, phone, city, category, rating, avg_delivery_days,
  //          defect_rate, reliability_score, quality_score, on_time_pct
  const suppliers = [
    ['Global Tech Solutions', 'contact@globaltech.com',  '9876543210', 'Bangalore', 'Electronics', 4.8, 3,  0.01, 97, 9.5, 97.00],
    ['Premium Apparel Ltd',   'sales@premiumapparel.com','9123456789', 'Mumbai',    'Fashion',      4.2, 7,  0.05, 84, 7.8, 83.50],
    ['HomeGoods Pvt Ltd',     'order@homegoods.in',      '9988776655', 'Pune',      'Home & Kitchen',3.9,10, 0.08, 72, 6.9, 71.20],
    ['Anker Innovations',     'india@anker.com',         '9811223344', 'Delhi',     'Electronics',  4.6, 5,  0.02, 91, 9.0, 90.00],
    ['FitLife Distributors',  'supply@fitlife.co.in',    '9700112233', 'Chennai',   'Sports',        4.0, 8,  0.06, 78, 7.5, 77.50],
    ['BookHive Wholesale',    'orders@bookhive.in',      '9600998877', 'Kolkata',   'Books',         4.4, 4,  0.00, 96, 9.2, 95.80],
  ];
  for (const s of suppliers) {
    await conn.execute(
      `INSERT INTO suppliers
       (name, contact_email, phone, city, category, rating, avg_delivery_days,
        defect_rate, reliability_score, quality_score, on_time_pct)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      s
    );
  }
  // Supplier-product mappings
  const spMappings = [
    [1, 1, 89000, 3, 5], [1, 3, 82000, 4, 3], [4, 4, 16000, 5, 10],
    [2, 6, 1900,  7, 20],[2, 7, 4200,  8, 15],[3, 10, 5500, 10, 8],
    [5, 13, 11000, 8, 5],[6, 17, 160,  4, 50],
  ];
  for (const [sid, pid, price, lead, moq] of spMappings) {
    await conn.execute(
      'INSERT INTO supplier_products (supplier_id, product_id, supply_price, lead_time_days, min_order_qty) VALUES (?,?,?,?,?)',
      [sid, pid, price, lead, moq]
    );
  }
  console.log('✅ Suppliers seeded (6 suppliers with scorecards)');

  // ─── 7. Price History (competitor benchmarks) ─────────────────────────────
  // Our price vs Flipkart / Amazon / Croma
  const platforms = ['Flipkart', 'Amazon', 'Croma'];
  for (let pid = 1; pid <= products.length; pid++) {
    const ourPrice = Number(products[pid - 1][5]);
    // PulseCart own price entry
    await conn.execute(
      'INSERT INTO price_history (product_id, platform, current_price, mrp) VALUES (?,?,?,?)',
      [pid, 'PulseCart', ourPrice, ourPrice * 1.15]
    );
    // 1–2 competitor prices
    const numCompetitors = rand(1, 2);
    for (let k = 0; k < numCompetitors; k++) {
      const platform    = platforms[rand(0, platforms.length - 1)];
      const variation   = 0.92 + Math.random() * 0.18;  // ±8% variation
      const compPrice   = (ourPrice * variation).toFixed(2);
      const mrp         = (ourPrice * 1.15).toFixed(2);
      await conn.execute(
        'INSERT INTO price_history (product_id, platform, current_price, mrp) VALUES (?,?,?,?)',
        [pid, platform, compPrice, mrp]
      );
    }
  }
  console.log('✅ Price history seeded (with competitor benchmarks)');

  // ─── 8. Anomaly Log ───────────────────────────────────────────────────────
  const anomalies = [
    ['gmv',         28400,  22000, 2.3, 'high',   'GMV spike on Saturday — possible flash sale or bot traffic', 0],
    ['return_rate', 18.2,    8.5,  2.8, 'high',   'Realme Watch 2 return rate 18.2% — above 8.5% threshold',   0],
    ['stock',        3,      15,   2.1, 'medium', 'Yonex Arcsaber stock critically low (3 units)',               0],
    ['gmv',         9200,   22000, -2.4,'medium', 'Monday GMV dip 58% below weekly average',                    1],
    ['defect_rate', 0.08,   0.03,  1.9, 'low',   'HomeGoods defect rate 0.08 — approaching threshold',         1],
  ];
  for (const [metric, val, exp, z, sev, desc, resolved] of anomalies) {
    await conn.execute(
      'INSERT INTO anomaly_log (metric, value, expected, z_score, severity, description, resolved) VALUES (?,?,?,?,?,?,?)',
      [metric, val, exp, z, sev, desc, resolved]
    );
  }
  console.log('✅ Anomaly log seeded (5 entries)');

  // ─── 9. Notifications ─────────────────────────────────────────────────────
  const notifications = [
    ['stock',  'danger',  'Critical Stock — boAt Rockerz 450',   '8 units left. Reorder threshold is 30. Auto-trigger initiated.'],
    ['stock',  'warning', 'Low Stock — Nike Air Max 270',         '8 units remaining. Reorder at 15 units.'],
    ['stock',  'danger',  'Critical Stock — Yonex Arcsaber 11',  '3 units. Sports category peak season approaching.'],
    ['pricing','warning', 'Price Alert — iPhone 15 Pro',          'Flipkart listing at ₹131,900 — 2.2% below your price.'],
    ['returns','danger',  'High Return Rate — Realme Watch',      'Return rate at 18.2%. Above 8.5% threshold. Review product quality.'],
    ['stock',  'warning', 'Low Stock — Philips Air Fryer',        '6 units. Reorder threshold is 10.'],
    ['finance','info',    'Weekly Revenue Summary',               'Total revenue this week: ₹4.8L. +11.3% vs last week.'],
    ['anomaly','warning', 'GMV Spike Detected',                   'Saturday GMV 29% above weekly average. Verify for flash sale or bot traffic.'],
  ];
  for (const [type, severity, title, body] of notifications) {
    await conn.execute(
      'INSERT INTO notifications (type, severity, title, body) VALUES (?,?,?,?)',
      [type, severity, title, body]
    );
  }
  console.log('✅ Notifications seeded');

  await conn.end();
  console.log('\n🎉 Seed complete! Run: node index.js to start the server.');
  console.log('   Login: owner / pranjal@123  |  Staff: staff / staff@123');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
