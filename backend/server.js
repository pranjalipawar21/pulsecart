require('dotenv').config();
const http    = require('http');
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server }  = require('socket.io');

const authRoutes      = require('./routes/authRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const salesRoutes     = require('./routes/salesRoutes');
const alertsRoutes    = require('./routes/alertsRoutes');
const reportsRoutes   = require('./routes/reportsRoutes');
const settingsRoutes  = require('./routes/settingsRoutes');
const sentimentRoutes = require('./routes/sentimentRoutes');
const errorHandler    = require('./middleware/errorHandler');

const app    = express();
const server = http.createServer(app);

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:3000').split(',').map(o => o.trim());

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
    },
});
app.set('io', io);

io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);
    socket.on('disconnect', () => console.log(`❌ Socket disconnected: ${socket.id}`));
});

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use(limiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { success: false, message: 'Too many login attempts. Please try again later.' },
});
app.use('/api/auth/login', authLimiter);

app.use(cors({
    origin: true, // Allow all origins dynamically
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/products',  inventoryRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/sales',     salesRoutes);
app.use('/api/alerts',    alertsRoutes);
app.use('/api/reports',   reportsRoutes);
app.use('/api/settings',  settingsRoutes);
app.use('/api/sentiment', sentimentRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'PulseCart Backend is healthy',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development',
        routes: [
            'GET  /api/health',
            'POST /api/auth/login',
            'POST /api/auth/register',
            'GET  /api/auth/me',
            'GET  /api/auth/staff',
            'GET  /api/products',
            'POST /api/products',
            'PUT  /api/products/:id',
            'DELETE /api/products/:id',
            'GET  /api/analytics/summary',
            'GET  /api/analytics/charts',
            'GET  /api/analytics/low-stock',
            'GET  /api/sales',
            'POST /api/sales',
            'GET  /api/alerts',
            'PUT  /api/alerts/:id/complete',
            'GET  /api/reports/inventory',
            'GET  /api/reports/sales',
            'GET  /api/reports/low-stock',
            'GET  /api/settings',
            'PUT  /api/settings',
        ],
    });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Endpoint not found: ${req.method} ${req.path}` });
});

app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`\n🚀 PulseCart Backend  →  http://localhost:${PORT}`);
    console.log(`🔌 Socket.IO          →  ws://localhost:${PORT}`);
    console.log(`❤️  Health Check       →  http://localhost:${PORT}/api/health\n`);
});
