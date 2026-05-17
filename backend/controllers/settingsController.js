const db = require('../config/db');

/**
 * GET /api/settings
 */
exports.getSettings = async (req, res, next) => {
    try {
        const [rows] = await db.execute('SELECT * FROM settings WHERE id = 1');
        const settings = rows[0] || {
            store_name: 'PulseCart Store',
            owner_email: '',
            low_stock_default_threshold: 10,
            theme_preference: 'light',
            currency: 'INR',
            timezone: 'Asia/Kolkata',
        };
        res.json({ success: true, data: settings });
    } catch (err) { next(err); }
};

/**
 * PUT /api/settings
 * Body: { store_name, owner_email, low_stock_default_threshold, theme_preference, currency, timezone }
 */
exports.updateSettings = async (req, res, next) => {
    try {
        const {
            store_name,
            owner_email,
            low_stock_default_threshold,
            theme_preference,
            currency,
            timezone,
        } = req.body;

        // Upsert pattern — insert if not exists, otherwise update
        await db.execute(`
            INSERT INTO settings (id, store_name, owner_email, low_stock_default_threshold, theme_preference, currency, timezone)
            VALUES (1, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                store_name                  = VALUES(store_name),
                owner_email                 = VALUES(owner_email),
                low_stock_default_threshold = VALUES(low_stock_default_threshold),
                theme_preference            = VALUES(theme_preference),
                currency                    = VALUES(currency),
                timezone                    = VALUES(timezone)
        `, [
            store_name || 'PulseCart Store',
            owner_email || '',
            low_stock_default_threshold || 10,
            theme_preference || 'light',
            currency || 'INR',
            timezone || 'Asia/Kolkata',
        ]);

        res.json({ success: true, message: 'Settings saved successfully.' });
    } catch (err) { next(err); }
};
