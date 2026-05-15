/**
 * PulseCart API Server — Entry Point
 * Node.js + Express backend for the PulseCart Retail Intelligence Dashboard.
 *
 * Start: node index.js  (or  npm start  inside /server)
 * Default port: 5001
 *
 * All routes follow { success, data } or { success, error } response format.
 */
require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  // GitHub Pages deployment — update to your actual domain
  'https://pranjalipawar21.github.io',
];

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (server-to-server, Postman, curl)
    if (!origin) return cb(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/inventory',    require('./routes/inventory'));
app.use('/api/orders',       require('./routes/orders'));
app.use('/api/analytics',    require('./routes/analytics'));
app.use('/api/sentiment',    require('./routes/sentiment'));
app.use('/api/ai',           require('./routes/ai'));
app.use('/api/customers',    require('./routes/customers'));
app.use('/api/suppliers',    require('./routes/suppliers'));
app.use('/api/pricing',      require('./routes/pricing'));
app.use('/api/notifications',require('./routes/notifications'));
app.use('/api/url-scan',     require('./routes/url-scan'));   // NEW: URL Deep Analysis

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const { isAvailable } = require('./db');
  res.json({
    success:   true,
    status:    'ok',
    version:   '2.1.0',
    db:        isAvailable() ? 'mysql-connected' : 'fallback-mode',
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error:   `Route not found: ${req.method} ${req.path}`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Express error:', err.message);
  res.status(500).json({
    success: false,
    error:   process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`\n🛒 PulseCart API  →  http://localhost:${PORT}/api/health`);
  console.log(`   DB mode       :  check /api/health for status`);
  console.log(`   Env           :  ${process.env.NODE_ENV || 'development'}\n`);
});
