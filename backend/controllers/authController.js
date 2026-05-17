const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

/**
 * POST /api/auth/login
 */
exports.login = async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username || !password)
            return res.status(400).json({ success: false, message: 'Username and password are required.' });

        const user = await User.findByUsername(username.trim());
        if (!user)
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match)
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });

        const payload = { id: user.id, username: user.username, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

        res.json({
            success: true, token,
            user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
        });
    } catch (err) { next(err); }
};

/**
 * POST /api/auth/register
 * Body: { username, password, full_name, role }
 * Owner can create staff accounts; public registration creates staff-only.
 */
exports.register = async (req, res, next) => {
    try {
        const { username, password, full_name = '', role = 'staff', email = '' } = req.body;

        if (!username || !password)
            return res.status(400).json({ success: false, message: 'Username and password are required.' });
        if (username.length < 3)
            return res.status(400).json({ success: false, message: 'Username must be at least 3 characters.' });
        if (password.length < 6)
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });

        // Only allow owner role if the request itself is made by an owner
        const requestedRole = req.user?.role === 'owner' && role === 'owner' ? 'owner' : 'staff';

        const existing = await User.findByUsername(username.trim());
        if (existing)
            return res.status(409).json({ success: false, message: 'Username already taken.' });

        const id = await User.create(username.trim(), password, requestedRole, full_name, email);

        res.status(201).json({
            success: true,
            message: `Account created for ${username}`,
            user: { id, username, role: requestedRole, full_name },
        });
    } catch (err) { next(err); }
};

/**
 * GET /api/auth/me
 */
exports.me = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        res.json({ success: true, user });
    } catch (err) { next(err); }
};

/**
 * GET /api/auth/staff  (owner only)
 */
exports.getAllStaff = async (req, res, next) => {
    try {
        const staff = await User.getAll();
        res.json({ success: true, data: staff });
    } catch (err) { next(err); }
};
