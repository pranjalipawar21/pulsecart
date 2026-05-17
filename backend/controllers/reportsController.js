const db = require('../config/db');

/**
 * GET /api/reports/inventory
 * Returns CSV of all products.
 */
exports.inventoryReport = async (req, res, next) => {
    try {
        const [rows] = await db.execute(`
            SELECT
                p.sku,
                p.product_name,
                c.name          AS category,
                p.price,
                p.cost_price,
                p.quantity      AS stock,
                p.low_stock_threshold,
                p.supplier_name,
                p.location,
                CASE
                    WHEN p.quantity <= FLOOR(p.low_stock_threshold / 2) THEN 'critical'
                    WHEN p.quantity <= p.low_stock_threshold             THEN 'low'
                    ELSE 'healthy'
                END AS status,
                ROUND(p.quantity * p.price, 2) AS stock_value,
                ROUND(p.price - p.cost_price, 2) AS profit_margin,
                p.created_at
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            ORDER BY c.name, p.product_name
        `);

        const header = 'SKU,Product Name,Category,Price,Cost Price,Stock,Low Stock Threshold,Stock Value,Profit Margin,Supplier,Location,Status,Created At\n';
        const csv = rows.map(r =>
            `"${r.sku}","${r.product_name}","${r.category || ''}",${r.price},${r.cost_price},${r.stock},${r.low_stock_threshold},${r.stock_value},${r.profit_margin},"${r.supplier_name || ''}","${r.location || ''}",${r.status},"${r.created_at}"`
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=pulsecart_inventory_report.csv');
        res.status(200).send(header + csv);
    } catch (err) { next(err); }
};

/**
 * GET /api/reports/sales
 * Returns CSV of all sales records.
 */
exports.salesReport = async (req, res, next) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const [rows] = await db.execute(`
            SELECT
                s.id            AS sale_id,
                p.sku,
                p.product_name,
                c.name          AS category,
                s.quantity_sold,
                s.selling_price,
                ROUND(s.quantity_sold * s.selling_price, 2) AS total_amount,
                u.username      AS staff,
                s.sale_date,
                s.notes
            FROM sales s
            JOIN products p ON s.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN users u ON s.staff_id = u.id
            WHERE s.sale_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
            ORDER BY s.sale_date DESC
        `, [days]);

        const header = 'Sale ID,SKU,Product Name,Category,Quantity Sold,Selling Price,Total Amount,Staff,Sale Date,Notes\n';
        const csv = rows.map(r =>
            `${r.sale_id},"${r.sku}","${r.product_name}","${r.category || ''}",${r.quantity_sold},${r.selling_price},${r.total_amount},"${r.staff || ''}","${r.sale_date}","${r.notes || ''}"`
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=pulsecart_sales_report_${days}days.csv`);
        res.status(200).send(header + csv);
    } catch (err) { next(err); }
};

/**
 * GET /api/reports/low-stock
 * Returns CSV of all low-stock products.
 */
exports.lowStockReport = async (req, res, next) => {
    try {
        const [rows] = await db.execute(`
            SELECT
                p.sku,
                p.product_name,
                c.name          AS category,
                p.quantity      AS current_stock,
                p.low_stock_threshold,
                ROUND((p.quantity / NULLIF(p.low_stock_threshold, 0)) * 100, 1) AS stock_pct,
                p.supplier_name,
                p.price,
                p.location,
                CASE
                    WHEN p.quantity <= FLOOR(p.low_stock_threshold / 2) THEN 'critical'
                    WHEN p.quantity <= p.low_stock_threshold             THEN 'low'
                    ELSE 'healthy'
                END AS urgency
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.quantity <= p.low_stock_threshold
            ORDER BY p.quantity ASC
        `);

        const header = 'SKU,Product Name,Category,Current Stock,Low Stock Threshold,Stock %,Urgency,Supplier,Price,Location\n';
        const csv = rows.map(r =>
            `"${r.sku}","${r.product_name}","${r.category || ''}",${r.current_stock},${r.low_stock_threshold},${r.stock_pct}%,${r.urgency},"${r.supplier_name || ''}",${r.price},"${r.location || ''}"`
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=pulsecart_low_stock_report.csv');
        res.status(200).send(header + csv);
    } catch (err) { next(err); }
};
