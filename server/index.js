require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/orders',    require('./routes/orders'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/sentiment', require('./routes/sentiment'));
app.use('/api/ai',        require('./routes/ai'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/pricing', require('./routes/pricing'));
app.use('/api/notifications', require('./routes/notifications'));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const { isAvailable } = require('./db');
  res.json({
    status:    'ok',
    version:   '2.0.0',
    db:        isAvailable() ? 'mysql' : 'fallback',
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 fallback ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.path} not found` });
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Express error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`\n🛒 PulseCart API  →  http://localhost:${PORT}/api/health\n`);
});
