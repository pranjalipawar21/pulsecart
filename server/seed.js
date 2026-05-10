// ─────────────────────────────────────────────────────────────────────────────
// PulseCart — Database Seed Script
// Run: node seed.js   (from the /server directory)
// Creates the pulsecart database, all tables, and inserts demo data.
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs     = require('fs');
const path   = require('path');

const DB_CONFIG = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306'),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || 'root',
};
const DB_NAME = process.env.DB_NAME || 'pulsecart';

// ── GMV Time Series (90 days — realistic Indian e-commerce seasonality) ──────
const GMV_SERIES = [
  { date:"Jan 29", gmv:4821000, orders:2341 },
  { date:"Jan 30", gmv:5124000, orders:2480 },
  { date:"Jan 31", gmv:4990000, orders:2420 },
  { date:"Feb 01", gmv:5380000, orders:2610 },
  { date:"Feb 02", gmv:6140000, orders:2980 },
  { date:"Feb 03", gmv:5870000, orders:2850 },
  { date:"Feb 04", gmv:5420000, orders:2630 },
  { date:"Feb 05", gmv:5090000, orders:2470 },
  { date:"Feb 06", gmv:5230000, orders:2540 },
  { date:"Feb 07", gmv:5680000, orders:2760 },
  { date:"Feb 08", gmv:5990000, orders:2910 },
  { date:"Feb 09", gmv:6450000, orders:3130 },
  { date:"Feb 10", gmv:7820000, orders:3800 },
  { date:"Feb 11", gmv:9140000, orders:4440 },
  { date:"Feb 12", gmv:8230000, orders:4000 },
  { date:"Feb 13", gmv:7120000, orders:3460 },
  { date:"Feb 14", gmv:6340000, orders:3080 },
  { date:"Feb 15", gmv:5780000, orders:2810 },
  { date:"Feb 16", gmv:5410000, orders:2630 },
  { date:"Feb 17", gmv:5180000, orders:2520 },
  { date:"Feb 18", gmv:5060000, orders:2460 },
  { date:"Feb 19", gmv:5290000, orders:2570 },
  { date:"Feb 20", gmv:5520000, orders:2680 },
  { date:"Feb 21", gmv:5760000, orders:2800 },
  { date:"Feb 22", gmv:5430000, orders:2640 },
  { date:"Feb 23", gmv:5200000, orders:2530 },
  { date:"Feb 24", gmv:5080000, orders:2470 },
  { date:"Feb 25", gmv:5350000, orders:2600 },
  { date:"Feb 26", gmv:5490000, orders:2670 },
  { date:"Feb 27", gmv:5620000, orders:2730 },
  { date:"Feb 28", gmv:5380000, orders:2610 },
  { date:"Mar 01", gmv:5710000, orders:2770 },
  { date:"Mar 02", gmv:5940000, orders:2880 },
  { date:"Mar 03", gmv:6280000, orders:3050 },
  { date:"Mar 04", gmv:6820000, orders:3310 },
  { date:"Mar 05", gmv:7460000, orders:3620 },
  { date:"Mar 06", gmv:8920000, orders:4330 },
  { date:"Mar 07", gmv:10240000, orders:4970 },
  { date:"Mar 08", gmv:11380000, orders:5520 },
  { date:"Mar 09", gmv:9640000, orders:4680 },
  { date:"Mar 10", gmv:7890000, orders:3830 },
  { date:"Mar 11", gmv:6520000, orders:3170 },
  { date:"Mar 12", gmv:5890000, orders:2860 },
  { date:"Mar 13", gmv:5640000, orders:2740 },
  { date:"Mar 14", gmv:5380000, orders:2610 },
  { date:"Mar 15", gmv:5510000, orders:2680 },
  { date:"Mar 16", gmv:5730000, orders:2780 },
  { date:"Mar 17", gmv:5860000, orders:2840 },
  { date:"Mar 18", gmv:5420000, orders:2630 },
  { date:"Mar 19", gmv:5280000, orders:2560 },
  { date:"Mar 20", gmv:5640000, orders:2740 },
  { date:"Mar 21", gmv:5980000, orders:2900 },
  { date:"Mar 22", gmv:6340000, orders:3080 },
  { date:"Mar 23", gmv:7120000, orders:3460 },
  { date:"Mar 24", gmv:8540000, orders:4150 },
  { date:"Mar 25", gmv:10180000, orders:4940 },
  { date:"Mar 26", gmv:9820000, orders:4760 },
  { date:"Mar 27", gmv:7640000, orders:3710 },
  { date:"Mar 28", gmv:6210000, orders:3010 },
  { date:"Mar 29", gmv:5530000, orders:2680 },
  { date:"Mar 30", gmv:5290000, orders:2570 },
  { date:"Mar 31", gmv:5180000, orders:2510 },
  { date:"Apr 01", gmv:5340000, orders:2590 },
  { date:"Apr 02", gmv:5490000, orders:2670 },
  { date:"Apr 03", gmv:5720000, orders:2780 },
  { date:"Apr 04", gmv:5610000, orders:2720 },
  { date:"Apr 05", gmv:5460000, orders:2650 },
  { date:"Apr 06", gmv:5280000, orders:2560 },
  { date:"Apr 07", gmv:5530000, orders:2680 },
  { date:"Apr 08", gmv:5810000, orders:2820 },
  { date:"Apr 09", gmv:6290000, orders:3050 },
  { date:"Apr 10", gmv:7480000, orders:3630 },
  { date:"Apr 11", gmv:9210000, orders:4470 },
  { date:"Apr 12", gmv:10640000, orders:5160 },
  { date:"Apr 13", gmv:8930000, orders:4330 },
  { date:"Apr 14", gmv:7120000, orders:3460 },
  { date:"Apr 15", gmv:5840000, orders:2840 },
  { date:"Apr 16", gmv:5390000, orders:2620 },
  { date:"Apr 17", gmv:5180000, orders:2510 },
  { date:"Apr 18", gmv:5310000, orders:2580 },
  { date:"Apr 19", gmv:5520000, orders:2680 },
  { date:"Apr 20", gmv:5690000, orders:2760 },
  { date:"Apr 21", gmv:5480000, orders:2660 },
  { date:"Apr 22", gmv:5260000, orders:2550 },
  { date:"Apr 23", gmv:5140000, orders:2490 },
  { date:"Apr 24", gmv:5370000, orders:2610 },
  { date:"Apr 25", gmv:5560000, orders:2700 },
  { date:"Apr 26", gmv:5720000, orders:2780 },
  { date:"Apr 27", gmv:5890000, orders:2860 },
  { date:"Apr 28", gmv:5640000, orders:2740 },
];

// ── Inventory items ──────────────────────────────────────────────────────────
const INVENTORY = [
  { sku: 'ELEC-001', product: 'Redmi Note 13 Pro',         category: 'Electronics',   stock: 8,   reorder: 50, turnover: 14.2, price: 24999 },
  { sku: 'SPRT-001', product: 'Nike Air Max 270',           category: 'Sports',        stock: 12,  reorder: 40, turnover: 9.8,  price: 11995 },
  { sku: 'HLTH-001', product: 'Mamaearth Ubtan Face Wash',  category: 'Health/Beauty', stock: 18,  reorder: 60, turnover: 18.4, price: 299   },
  { sku: 'HOME-001', product: 'Bajaj Mixer Grinder 500W',   category: 'Home/Kitchen',  stock: 24,  reorder: 30, turnover: 6.1,  price: 3299  },
  { sku: 'HOME-002', product: 'Prestige Pressure Cooker',   category: 'Home/Kitchen',  stock: 31,  reorder: 40, turnover: 7.3,  price: 2499  },
  { sku: 'SPRT-002', product: 'Boldfit Yoga Mat 6mm',       category: 'Sports',        stock: 37,  reorder: 50, turnover: 11.6, price: 699   },
  { sku: 'ELEC-002', product: 'ASUS VivoBook 15',           category: 'Electronics',   stock: 52,  reorder: 30, turnover: 8.9,  price: 42990 },
  { sku: 'FASH-001', product: 'Libas Printed Kurti Set',    category: 'Fashion',       stock: 68,  reorder: 80, turnover: 22.1, price: 899   },
  { sku: 'ELEC-003', product: 'boAt Airdopes 141',          category: 'Electronics',   stock: 94,  reorder: 60, turnover: 16.7, price: 1299  },
  { sku: 'HOME-003', product: 'Milton Thermosteel Flask',   category: 'Home/Kitchen',  stock: 118, reorder: 40, turnover: 9.2,  price: 549   },
  { sku: 'HOME-004', product: 'Pigeon Non-stick Pan Set',   category: 'Home/Kitchen',  stock: 142, reorder: 50, turnover: 7.8,  price: 1499  },
  { sku: 'BOOK-001', product: 'Atomic Habits (Book)',       category: 'Books',         stock: 203, reorder: 80, turnover: 24.6, price: 399   },
];

async function seed() {
  console.log('\n🌱 PulseCart Database Seeder');
  console.log('─'.repeat(60));

  // 1. Connect WITHOUT database selected
  let conn;
  try {
    conn = await mysql.createConnection(DB_CONFIG);
    console.log(`✓ Connected to MySQL at ${DB_CONFIG.host}:${DB_CONFIG.port}`);
  } catch (err) {
    console.error(`✗ Cannot connect to MySQL: ${err.message}`);
    console.error('  Make sure MySQL is running and credentials in .env are correct.');
    process.exit(1);
  }

  // 2. Create database and reconnect with it selected
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.end();

  // Reconnect with database selected
  conn = await mysql.createConnection({ ...DB_CONFIG, database: DB_NAME });
  console.log(`✓ Database '${DB_NAME}' ready`);

  // 3. Create tables directly (not from schema.sql to avoid parsing issues)
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      username     VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role         ENUM('owner','staff') NOT NULL DEFAULT 'staff',
      full_name    VARCHAR(100),
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS inventory (
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
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      order_id   VARCHAR(50) UNIQUE NOT NULL,
      customer   VARCHAR(100),
      category   VARCHAR(50),
      channel    VARCHAR(50),
      region     VARCHAR(60),
      amount     DECIMAL(10,2),
      status     ENUM('processing','shipped','delivered','returned') DEFAULT 'processing',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS reorder_log (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      inventory_id INT NOT NULL,
      triggered_by INT NOT NULL,
      quantity     INT NOT NULL DEFAULT 100,
      note         TEXT,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (inventory_id) REFERENCES inventory(id),
      FOREIGN KEY (triggered_by) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS kpis (
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
    )`,
    `CREATE TABLE IF NOT EXISTS gmv_series (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      date_label VARCHAR(10) NOT NULL,
      gmv        BIGINT NOT NULL,
      orders_count INT NOT NULL,
      UNIQUE KEY uq_date (date_label)
    )`,
    `CREATE TABLE IF NOT EXISTS sentiment_history (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      url         TEXT NOT NULL,
      platform    VARCHAR(30),
      identifier  VARCHAR(100),
      result_json JSON,
      analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  ];

  for (const sql of tables) {
    try {
      await conn.query(sql);
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.warn(`  ⚠ Table: ${err.message.slice(0, 80)}`);
      }
    }
  }
  console.log('✓ Tables created');

  // 4. Seed users
  const passwordHash = await bcrypt.hash('pranjal@123', 10);
  const users = [
    ['owner', passwordHash, 'owner', 'Pranjali Pawar'],
    ['staff', passwordHash, 'staff', 'Rahul Sharma'],
  ];
  for (const [username, hash, role, fullName] of users) {
    try {
      await conn.execute(
        `INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), full_name = VALUES(full_name)`,
        [username, hash, role, fullName]
      );
    } catch (err) {
      console.warn(`  ⚠ User '${username}': ${err.message.slice(0, 60)}`);
    }
  }
  console.log('✓ Users seeded (owner / staff — password: pranjal@123)');

  // 5. Seed inventory
  for (const item of INVENTORY) {
    try {
      await conn.execute(
        `INSERT INTO inventory (sku, product, category, stock, reorder_threshold, turnover, price)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE product = VALUES(product), stock = VALUES(stock), price = VALUES(price)`,
        [item.sku, item.product, item.category, item.stock, item.reorder, item.turnover, item.price]
      );
    } catch (err) {
      console.warn(`  ⚠ Inventory '${item.sku}': ${err.message.slice(0, 60)}`);
    }
  }
  console.log(`✓ Inventory seeded (${INVENTORY.length} SKUs)`);

  // 6. Seed KPIs
  try {
    await conn.execute(
      `INSERT INTO kpis (gmv, net_revenue, aov, conv_rate, cart_aband_rate, return_rate, ltv, inv_turnover)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE gmv = VALUES(gmv)`,
      [83500000, 58450000, 1847, 3.24, 71.4, 8.6, 6840, 8.2]
    );
    console.log('✓ KPIs seeded');
  } catch (err) {
    console.warn(`  ⚠ KPIs: ${err.message.slice(0, 60)}`);
  }

  // 7. Seed GMV time series
  let gmvCount = 0;
  for (const day of GMV_SERIES) {
    try {
      await conn.execute(
        `INSERT INTO gmv_series (date_label, gmv, orders_count) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE gmv = VALUES(gmv), orders_count = VALUES(orders_count)`,
        [day.date, day.gmv, day.orders]
      );
      gmvCount++;
    } catch (err) {
      // skip
    }
  }
  console.log(`✓ GMV series seeded (${gmvCount} days)`);

  // Done
  await conn.end();
  console.log('\n─'.repeat(60));
  console.log('✅ Database seeded successfully!');
  console.log(`   Database: ${DB_NAME}`);
  console.log(`   Users: owner, staff (password: pranjal@123)`);
  console.log(`   Inventory: ${INVENTORY.length} SKUs`);
  console.log(`   GMV Series: ${gmvCount} days`);
  console.log(`\n   Start the server: cd server && npm start\n`);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
