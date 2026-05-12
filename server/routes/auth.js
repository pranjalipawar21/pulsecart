const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { isAvailable, getPool, FALLBACK } = require('../db');

const SECRET          = process.env.JWT_SECRET || 'pulsecart_dev_secret';
const REFRESH_SECRET  = process.env.REFRESH_SECRET || 'pulsecart_refresh_dev_secret';
const EXPIRES         = '1h';
const REFRESH_EXPIRES = '7d';

// ─── Utility: Generate Tokens ────────────────────────────────────────────────
const generateTokens = async (user) => {
  const payload = { id: user.id, username: user.username, role: user.role, full_name: user.full_name };
  const accessToken = jwt.sign(payload, SECRET, { expiresIn: EXPIRES });
  const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });

  if (isAvailable()) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await getPool().execute(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, refreshToken, expiresAt]
    );
  }

  return { accessToken, refreshToken };
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    let user = null;

    if (isAvailable()) {
      const [rows] = await getPool().execute(
        'SELECT id, username, password_hash, role, full_name FROM users WHERE username = ?',
        [username]
      );
      user = rows[0] || null;
    } else {
      user = FALLBACK.users.find(u => u.username === username) || null;
    }

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const { accessToken, refreshToken } = await generateTokens(user);

    res.json({
      token: accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error during authentication' });
  }
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    
    if (isAvailable()) {
      const [rows] = await getPool().execute(
        'SELECT id FROM refresh_tokens WHERE token = ? AND user_id = ? AND expires_at > NOW()',
        [refreshToken, decoded.id]
      );
      if (rows.length === 0) return res.status(401).json({ error: 'Invalid or expired refresh token' });

      // Rotate token: Delete old, create new
      await getPool().execute('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
      
      const [userRows] = await getPool().execute(
        'SELECT id, username, role, full_name FROM users WHERE id = ?',
        [decoded.id]
      );
      const user = userRows[0];
      const tokens = await generateTokens(user);
      res.json({ token: tokens.accessToken, refreshToken: tokens.refreshToken });
    } else {
      // Fallback: just sign a new one without rotation database check
      const tokens = await generateTokens({ id: decoded.id });
      res.json({ token: tokens.accessToken, refreshToken: tokens.refreshToken });
    }
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
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
