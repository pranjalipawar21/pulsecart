require('dotenv').config();
const express = require('express');
const cors = require('cors');
const inventoryRoutes = require('./routes/inventoryRoutes');
const sentimentRoutes = require('./routes/sentimentRoutes');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/products', inventoryRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sentiment', sentimentRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'PulseCart Backend is active',
        timestamp: new Date().toISOString()
    });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n🚀 PulseCart Backend running on http://localhost:${PORT}`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/api/health\n`);
});
