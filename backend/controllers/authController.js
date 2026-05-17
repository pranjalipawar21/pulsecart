const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

/**
 * POST /api/auth/login
 * Body: { username, password }
 * Returns: { success, token, user: { id, username, role, full_name } }
 */
exports.login = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password are required.' });
        }

        // 1. Look up user
        const user = await User.findByUsername(username.trim());
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        // 2. Compare password
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        // 3. Sign JWT — expires in 8 hours
        const payload = { id: user.id, username: user.username, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

        res.json({
            success: true,
            token,
            user: {
                id:        user.id,
                username:  user.username,
                role:      user.role,
                full_name: user.full_name,
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/auth/me
 * Protected: requires verifyToken middleware
 * Returns the current logged-in user's profile from DB.
 */
exports.me = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        res.json({ success: true, user });
    } catch (err) {
        next(err);
    }
};
