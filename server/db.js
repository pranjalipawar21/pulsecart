require('dotenv').config();
const mysql = require('mysql2/promise');

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
    console.warn(`⚠  MySQL unavailable (${err.code || err.message}).`);
    dbAvailable = false;
  }
}

initDb();

module.exports = {
  getPool:     () => pool,
  isAvailable: () => dbAvailable,
};
