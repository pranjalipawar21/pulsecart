const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { isAvailable, getPool, FALLBACK } = require('../db');

const SECRET  = process.env.JWT_SECRET || 'pulsecart_dev_secret';
const EXPIRES = '24h';

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    let user = null;

    if (isAvailable()) {
      // MySQL path
      const [rows] = await getPool().execute(
        'SELECT id, username, password_hash, role, full_name FROM users WHERE username = ?',
        [username]
      );
      user = rows[0] || null;
    } else {
      // In-memory fallback path
      user = FALLBACK.users.find(u => u.username === username) || null;
    }

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    // Validate password with bcrypt
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
      SECRET,
      { expiresIn: EXPIRES }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error during authentication' });
  }
});

// ─── GET /api/auth/me  (token validation) ─────────────────────────────────────
router.get('/me', (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const user = jwt.verify(header.slice(7), SECRET);
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
