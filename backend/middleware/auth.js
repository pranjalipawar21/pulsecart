const jwt = require('jsonwebtoken');

/**
 * Verify that the request carries a valid JWT in the Authorization header.
 * Attaches the decoded payload to req.user on success.
 */
exports.verifyToken = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const token = header.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, username, role }
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
};

/**
 * Restrict access to users with role = 'owner'.
 * Must be used AFTER verifyToken.
 */
exports.requireOwner = (req, res, next) => {
    if (req.user?.role !== 'owner') {
        return res.status(403).json({ success: false, message: 'Owner access required.' });
    }
    next();
};

/**
 * Allow both 'owner' and 'staff' roles.
 * Must be used AFTER verifyToken.
 */
exports.requireStaff = (req, res, next) => {
    if (!['owner', 'staff'].includes(req.user?.role)) {
        return res.status(403).json({ success: false, message: 'Staff access required.' });
    }
    next();
};
