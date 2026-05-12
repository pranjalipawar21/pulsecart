const router = require('express').Router();
const { getPool } = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /api/notifications
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await getPool().execute('SELECT * FROM notifications WHERE is_dismissed = 0 ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/:id/dismiss
router.patch('/:id/dismiss', requireAuth, async (req, res) => {
  try {
    await getPool().execute('UPDATE notifications SET is_dismissed = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
