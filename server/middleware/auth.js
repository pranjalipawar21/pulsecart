const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'pulsecart_dev_secret';

/**
 * Verifies Bearer JWT and attaches req.user = { id, username, role }.
 * Responds 401 if missing/invalid, 403 if role is insufficient.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Gate that only allows the 'owner' role. Must be used after requireAuth.
 */
function requireOwner(req, res, next) {
  if (req.user?.role !== 'owner') {
    return res.status(403).json({ error: 'Owner access required' });
  }
  next();
}

module.exports = { requireAuth, requireOwner };
