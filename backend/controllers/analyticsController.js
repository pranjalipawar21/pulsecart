const db = require('../config/db');

/**
 * GET /api/analytics/kpis
 */
exports.getKPIs = async (req, res, next) => {
    try {
        const [[summary]] = await db.execute(`
            SELECT
                COUNT(*)                             AS total_products,
                SUM(quantity)                        AS total_units,
                SUM(quantity * price)                AS inventory_value,
                SUM(CASE WHEN quantity <= low_stock_threshold THEN 1 ELSE 0 END) AS low_stock_count,
                SUM(CASE WHEN quantity <= FLOOR(low_stock_threshold / 2) THEN 1 ELSE 0 END) AS critical_count
            FROM products
        `);
        const [[reorders]] = await db.execute(`
            SELECT COUNT(*) AS reorder_count FROM reorder_requests
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        const [[movements]] = await db.execute(`
            SELECT COUNT(*) AS movement_count FROM inventory_movements
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
 * GET /api/analytics/summary
 * Full dashboard KPIs including today's sales and monthly revenue.
 */
exports.getSummary = async (req, res, next) => {
    try {
        const [[inv]] = await db.execute(`
            SELECT
                COUNT(*)           AS total_products,
                SUM(quantity)      AS total_units,
                SUM(quantity * price) AS inventory_value,
                SUM(CASE WHEN quantity <= low_stock_threshold THEN 1 ELSE 0 END) AS low_stock_count,
                SUM(CASE WHEN quantity <= FLOOR(low_stock_threshold / 2) THEN 1 ELSE 0 END) AS critical_count
            FROM products
        `);
        const [[todaySales]] = await db.execute(`
            SELECT
                COALESCE(COUNT(*), 0)                              AS total_transactions,
                COALESCE(SUM(quantity_sold), 0)                    AS total_units_sold,
                COALESCE(SUM(quantity_sold * selling_price), 0)    AS today_revenue
            FROM sales
            WHERE DATE(sale_date) = CURDATE()
        `);
        const [[monthSales]] = await db.execute(`
            SELECT
                COALESCE(SUM(quantity_sold * selling_price), 0) AS monthly_revenue,
                COALESCE(SUM(quantity_sold), 0)                  AS monthly_units
            FROM sales
            WHERE MONTH(sale_date) = MONTH(CURDATE()) AND YEAR(sale_date) = YEAR(CURDATE())
        `);
        const [[pendingAlerts]] = await db.execute(`
            SELECT COUNT(*) AS pending_alerts FROM reorder_alerts WHERE status = 'pending'
        `);

        res.json({
            success: true,
            data: {
                total_products:   Number(inv.total_products),
                total_units:      Number(inv.total_units || 0),
                inventory_value:  Number(inv.inventory_value || 0),
                low_stock_count:  Number(inv.low_stock_count),
                critical_count:   Number(inv.critical_count),
                today_revenue:    Number(todaySales.today_revenue || 0),
                today_transactions: Number(todaySales.total_transactions || 0),
                today_units:      Number(todaySales.total_units_sold || 0),
                monthly_revenue:  Number(monthSales.monthly_revenue || 0),
                monthly_units:    Number(monthSales.monthly_units || 0),
                pending_alerts:   Number(pendingAlerts.pending_alerts || 0),
            },
        });
    } catch (err) { next(err); }
};

/**
 * GET /api/analytics/charts
 * Best-sellers, low-performers, category revenue, monthly trend, profit per product.
 */
exports.getCharts = async (req, res, next) => {
    try {
        const days = parseInt(req.query.days) || 30;

        // Best-selling products
        const [bestSellers] = await db.execute(`
            SELECT
                p.product_name AS product,
                p.sku,
                SUM(s.quantity_sold)                              AS units_sold,
                ROUND(SUM(s.quantity_sold * s.selling_price), 2) AS revenue
            FROM sales s
            JOIN products p ON s.product_id = p.id
            WHERE s.sale_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY p.id, p.product_name, p.sku
            ORDER BY units_sold DESC
            LIMIT 10
        `, [days]);

        // Low-performing products (low or no sales)
        const [lowPerformers] = await db.execute(`
            SELECT
                p.product_name AS product,
                p.sku,
                COALESCE(SUM(s.quantity_sold), 0) AS units_sold,
                p.quantity AS current_stock
            FROM products p
            LEFT JOIN sales s ON s.product_id = p.id AND s.sale_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY p.id, p.product_name, p.sku, p.quantity
            ORDER BY units_sold ASC
            LIMIT 8
        `, [days]);

        // Category-wise revenue
        const [categoryRevenue] = await db.execute(`
            SELECT
                c.name AS category,
                ROUND(SUM(s.quantity_sold * s.selling_price), 2) AS revenue,
                SUM(s.quantity_sold) AS units_sold
            FROM sales s
            JOIN products p ON s.product_id = p.id
            JOIN categories c ON p.category_id = c.id
            WHERE s.sale_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY c.id, c.name
            ORDER BY revenue DESC
        `, [days]);

        // Monthly sales trend (last 6 months)
        const [monthlyTrend] = await db.execute(`
            SELECT
                DATE_FORMAT(sale_date, '%b %Y') AS month,
                DATE_FORMAT(sale_date, '%Y-%m') AS sort_key,
                ROUND(SUM(quantity_sold * selling_price), 2) AS revenue,
                SUM(quantity_sold) AS units_sold
            FROM sales
            WHERE sale_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(sale_date, '%Y-%m'), DATE_FORMAT(sale_date, '%b %Y')
            ORDER BY sort_key ASC
        `);

        // Profit estimate per category
        const [profitByCategory] = await db.execute(`
            SELECT
                c.name AS category,
                ROUND(SUM(p.quantity * (p.price - p.cost_price)), 2) AS estimated_profit,
                ROUND(SUM(p.quantity * p.price), 2)                   AS stock_value,
                ROUND(SUM(p.quantity * p.cost_price), 2)              AS cost_value
            FROM products p
            JOIN categories c ON p.category_id = c.id
            GROUP BY c.id, c.name
            ORDER BY estimated_profit DESC
        `);

        // Daily revenue (last 14 days for sparkline)
        const [dailyRevenue] = await db.execute(`
            SELECT
                DATE(sale_date) AS date,
                ROUND(SUM(quantity_sold * selling_price), 2) AS revenue,
                SUM(quantity_sold) AS units
            FROM sales
            WHERE sale_date >= DATE_SUB(NOW(), INTERVAL 14 DAY)
            GROUP BY DATE(sale_date)
            ORDER BY date ASC
        `);

        res.json({
            success: true,
            data: { bestSellers, lowPerformers, categoryRevenue, monthlyTrend, profitByCategory, dailyRevenue },
        });
    } catch (err) { next(err); }
};

/**
 * GET /api/analytics/categories
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
 */
exports.getLowStock = async (req, res, next) => {
    try {
        const [rows] = await db.execute(`
            SELECT
                p.id, p.sku,
                p.product_name AS product,
                p.quantity     AS stock,
                p.low_stock_threshold AS reorder_threshold,
                p.price, p.location,
                c.name AS category,
                CASE
                    WHEN p.quantity <= FLOOR(p.low_stock_threshold / 2) THEN 'critical'
                    WHEN p.quantity <= p.low_stock_threshold             THEN 'low'
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
 */
exports.getSkuTrends = async (req, res, next) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const [rows] = await db.execute(`
            SELECT
                p.sku, p.product_name AS product,
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
 */
exports.getMovements = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 30;
        const [rows] = await db.execute(`
            SELECT im.id, im.change_amount, im.movement_type, im.notes, im.created_at,
                   p.sku, p.product_name AS product, u.username AS performed_by
            FROM inventory_movements im
            JOIN products p ON im.product_id = p.id
            LEFT JOIN users u ON im.performed_by = u.id
            ORDER BY im.created_at DESC
            LIMIT ?
        `, [limit]);
        res.json({ success: true, data: rows });
    } catch (err) { next(err); }
};
