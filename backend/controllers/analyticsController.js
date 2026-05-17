const db = require('../config/db');

/**
 * GET /api/analytics/kpis
 * Returns key inventory metrics derived from real DB data.
 * Owner-only.
 */
exports.getKPIs = async (req, res, next) => {
    try {
        // Total products + stock value
        const [[summary]] = await db.execute(`
            SELECT 
                COUNT(*)                             AS total_products,
                SUM(quantity)                        AS total_units,
                SUM(quantity * price)                AS inventory_value,
                SUM(CASE WHEN quantity <= low_stock_threshold THEN 1 ELSE 0 END) AS low_stock_count,
                SUM(CASE WHEN quantity <= FLOOR(low_stock_threshold / 2) THEN 1 ELSE 0 END) AS critical_count
            FROM products
        `);

        // Reorder requests this month
        const [[reorders]] = await db.execute(`
            SELECT COUNT(*) AS reorder_count
            FROM reorder_requests
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);

        // Total movement events this month
        const [[movements]] = await db.execute(`
            SELECT COUNT(*) AS movement_count
            FROM inventory_movements
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);

        res.json({
            success: true,
            data: {
                total_products:  Number(summary.total_products),
                total_units:     Number(summary.total_units    || 0),
                inventory_value: Number(summary.inventory_value || 0),
                low_stock_count: Number(summary.low_stock_count),
                critical_count:  Number(summary.critical_count),
                reorder_count:   Number(reorders.reorder_count),
                movement_count:  Number(movements.movement_count),
            },
        });
    } catch (err) { next(err); }
};

/**
 * GET /api/analytics/categories
 * Per-category breakdown: unit count, total value, product count, low-stock count.
 * Owner-only.
 */
exports.getCategories = async (req, res, next) => {
    try {
        const [rows] = await db.execute(`
            SELECT
                c.name                                                          AS category,
                COUNT(p.id)                                                     AS product_count,
                SUM(p.quantity)                                                 AS total_units,
                ROUND(SUM(p.quantity * p.price), 2)                            AS total_value,
                SUM(CASE WHEN p.quantity <= p.low_stock_threshold THEN 1 ELSE 0 END) AS low_stock_count
            FROM categories c
            LEFT JOIN products p ON p.category_id = c.id
            GROUP BY c.id, c.name
            ORDER BY total_value DESC
        `);
        res.json({ success: true, data: rows });
    } catch (err) { next(err); }
};

/**
 * GET /api/analytics/low-stock
 * Products at or below their reorder threshold, sorted by urgency.
 * Accessible by both owner and staff (for alerts).
 */
exports.getLowStock = async (req, res, next) => {
    try {
        const [rows] = await db.execute(`
            SELECT
                p.id,
                p.sku,
                p.product_name AS product,
                p.quantity     AS stock,
                p.low_stock_threshold AS reorder_threshold,
                p.price,
                p.location,
                c.name AS category,
                CASE 
                    WHEN p.quantity <= FLOOR(p.low_stock_threshold / 2) THEN 'critical'
                    WHEN p.quantity <= p.low_stock_threshold            THEN 'low'
                    ELSE 'healthy'
                END AS status,
                ROUND((p.quantity / NULLIF(p.low_stock_threshold, 0)) * 100, 1) AS stock_pct
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.quantity <= p.low_stock_threshold
            ORDER BY p.quantity ASC
        `);
        res.json({ success: true, data: rows });
    } catch (err) { next(err); }
};

/**
 * GET /api/analytics/sku-trends
 * SKU-level cumulative stock movement over time.
 * Groups inventory_movements by product + date for line chart.
 * Owner-only.
 */
exports.getSkuTrends = async (req, res, next) => {
    try {
        const days = parseInt(req.query.days) || 30;

        const [rows] = await db.execute(`
            SELECT
                p.sku,
                p.product_name  AS product,
                DATE(im.created_at) AS date,
                SUM(im.change_amount) AS net_change,
                im.movement_type
            FROM inventory_movements im
            JOIN products p ON im.product_id = p.id
            WHERE im.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY p.id, p.sku, p.product_name, DATE(im.created_at), im.movement_type
            ORDER BY p.sku, date ASC
        `, [days]);

        res.json({ success: true, data: rows });
    } catch (err) { next(err); }
};

/**
 * GET /api/analytics/movements
 * Recent inventory movement log — last N movements.
 * Owner-only.
 */
exports.getMovements = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 30;

        const [rows] = await db.execute(`
            SELECT
                im.id,
                im.change_amount,
                im.movement_type,
                im.notes,
                im.created_at,
                p.sku,
                p.product_name AS product,
                u.username     AS performed_by
            FROM inventory_movements im
            JOIN products p ON im.product_id = p.id
            LEFT JOIN users u ON im.performed_by = u.id
            ORDER BY im.created_at DESC
            LIMIT ?
        `, [limit]);

        res.json({ success: true, data: rows });
    } catch (err) { next(err); }
};
