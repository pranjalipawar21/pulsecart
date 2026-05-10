require('dotenv').config();
const mysql = require('mysql2/promise');

// ─── In-memory fallback data (used if MySQL is unavailable) ──────────────────
const FALLBACK = {
  users: [
    { id: 1, username: 'owner',  role: 'owner', full_name: 'Pranjali Pawar',   password_hash: '$2a$10$abcdefghijklmnopqrstuuVGVFt.4KQLF9p94CvD3JQYfBzRzF5m6' },
    { id: 2, username: 'staff1', role: 'staff', full_name: 'Rahul Sharma',     password_hash: '$2a$10$abcdefghijklmnopqrstuuVGVFt.4KQLF9p94CvD3JQYfBzRzF5m6' },
  ],
  inventory: [
    { id: 1,  sku: 'ELEC-001', product: 'Redmi Note 13 Pro',         category: 'Electronics',  stock: 8,   reorder_threshold: 50, turnover: 14.2, price: 24999, status: 'critical' },
    { id: 2,  sku: 'SPRT-001', product: 'Nike Air Max 270',           category: 'Sports',       stock: 12,  reorder_threshold: 40, turnover: 9.8,  price: 11995, status: 'critical' },
    { id: 3,  sku: 'HLTH-001', product: 'Mamaearth Ubtan Face Wash',  category: 'Health/Beauty',stock: 18,  reorder_threshold: 60, turnover: 18.4, price: 299,   status: 'critical' },
    { id: 4,  sku: 'HOME-001', product: 'Bajaj Mixer Grinder 500W',   category: 'Home/Kitchen', stock: 24,  reorder_threshold: 30, turnover: 6.1,  price: 3299,  status: 'low' },
    { id: 5,  sku: 'HOME-002', product: 'Prestige Pressure Cooker',   category: 'Home/Kitchen', stock: 31,  reorder_threshold: 40, turnover: 7.3,  price: 2499,  status: 'low' },
    { id: 6,  sku: 'SPRT-002', product: 'Boldfit Yoga Mat 6mm',       category: 'Sports',       stock: 37,  reorder_threshold: 50, turnover: 11.6, price: 699,   status: 'low' },
    { id: 7,  sku: 'ELEC-002', product: 'ASUS VivoBook 15',           category: 'Electronics',  stock: 52,  reorder_threshold: 30, turnover: 8.9,  price: 42990, status: 'low' },
    { id: 8,  sku: 'FASH-001', product: 'Libas Printed Kurti Set',    category: 'Fashion',      stock: 68,  reorder_threshold: 80, turnover: 22.1, price: 899,   status: 'low' },
    { id: 9,  sku: 'ELEC-003', product: 'boAt Airdopes 141',          category: 'Electronics',  stock: 94,  reorder_threshold: 60, turnover: 16.7, price: 1299,  status: 'healthy' },
    { id: 10, sku: 'HOME-003', product: 'Milton Thermosteel Flask',   category: 'Home/Kitchen', stock: 118, reorder_threshold: 40, turnover: 9.2,  price: 549,   status: 'healthy' },
    { id: 11, sku: 'HOME-004', product: 'Pigeon Non-stick Pan Set',   category: 'Home/Kitchen', stock: 142, reorder_threshold: 50, turnover: 7.8,  price: 1499,  status: 'healthy' },
    { id: 12, sku: 'BOOK-001', product: 'Atomic Habits (Book)',       category: 'Books',        stock: 203, reorder_threshold: 80, turnover: 24.6, price: 399,   status: 'healthy' },
  ],
};

// ─── Connection pool ──────────────────────────────────────────────────────────
let pool = null;
let dbAvailable = false;

async function initDb() {
  try {
    pool = mysql.createPool({
      host:              process.env.DB_HOST     || 'localhost',
      port:              parseInt(process.env.DB_PORT || '3306'),
      user:              process.env.DB_USER     || 'root',
      password:          process.env.DB_PASSWORD || '',
      database:          process.env.DB_NAME     || 'pulsecart',
      waitForConnections: true,
      connectionLimit:   10,
      queueLimit:        0,
    });
    await pool.execute('SELECT 1');
    dbAvailable = true;
    console.log('✓ MySQL connected');
  } catch (err) {
    console.warn(`⚠  MySQL unavailable (${err.code || err.message}). Using in-memory fallback data.`);
    dbAvailable = false;
  }
}

initDb();

module.exports = {
  getPool:     () => pool,
  isAvailable: () => dbAvailable,
  FALLBACK,
};
