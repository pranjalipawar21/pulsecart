const db = require('../config/db');

/**
 * GET /api/alerts
 * Returns all reorder alerts joined with product info.
 */
exports.getAlerts = async (req, res, next) => {
    try {
        const status = req.query.status || null; // 'pending' | 'completed' | null (all)
        const params = [];
        let where = '';
        if (status) { where = 'WHERE ra.status = ?'; params.push(status); }

        const [rows] = await db.execute(`
            SELECT
                ra.id,
                ra.current_stock,
                ra.threshold,
                ra.supplier_name,
                ra.status,
                ra.notes,
                ra.created_at,
                ra.completed_at,
                p.id            AS product_id,
                p.sku,
                p.product_name  AS product,
                p.quantity      AS live_stock,
                p.low_stock_threshold,
                c.name          AS category,
                CASE
                    WHEN p.quantity <= FLOOR(p.low_stock_threshold / 2) THEN 'critical'
                    WHEN p.quantity <= p.low_stock_threshold             THEN 'low'
                    ELSE 'healthy'
                END AS urgency
            FROM reorder_alerts ra
            JOIN products p ON ra.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            ${where}
            ORDER BY FIELD(ra.status,'pending','completed'), ra.created_at DESC
        `, params);

        res.json({ success: true, data: rows });
    } catch (err) { next(err); }
};

/**
 * PUT /api/alerts/:id/complete
 * Owner marks a reorder alert as completed.
 */
exports.completeAlert = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [result] = await db.execute(
            `UPDATE reorder_alerts SET status = 'completed', completed_at = NOW() WHERE id = ?`,
            [id]
        );
        if (result.affectedRows === 0)
            return res.status(404).json({ success: false, message: 'Alert not found.' });

        res.json({ success: true, message: 'Alert marked as completed.' });
    } catch (err) { next(err); }
};

/**
 * POST /api/alerts/generate
 * Scans all low-stock products and auto-generates pending alerts for any
 * that don't already have one. Useful for a manual refresh.
 */
exports.generateAlerts = async (req, res, next) => {
    try {
        const [rows] = await db.execute(`
            SELECT p.id, p.quantity, p.low_stock_threshold, p.supplier_name
            FROM products p
            WHERE p.quantity <= p.low_stock_threshold
              AND NOT EXISTS (
                  SELECT 1 FROM reorder_alerts ra
                  WHERE ra.product_id = p.id AND ra.status = 'pending'
              )
        `);

        for (const p of rows) {
            await db.execute(
                `INSERT INTO reorder_alerts (product_id, current_stock, threshold, supplier_name, status) VALUES (?, ?, ?, ?, 'pending')`,
                [p.id, p.quantity, p.low_stock_threshold, p.supplier_name || '']
            );
        }

        res.json({ success: true, message: `Generated ${rows.length} new alerts.`, count: rows.length });
    } catch (err) { next(err); }
};
