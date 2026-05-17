const db = require('../config/db');

const Sales = {
    getAll: async (filters = {}) => {
        const { staff_id, days = 30 } = filters;
        const params = [days];
        let whereExtra = '';
        if (staff_id) { whereExtra = ' AND s.staff_id = ?'; params.push(staff_id); }

        const [rows] = await db.execute(`
            SELECT
                s.id,
                s.quantity_sold,
                s.selling_price,
                s.sale_date,
                s.notes,
                p.id         AS product_id,
                p.sku,
                p.product_name AS product,
                c.name       AS category,
                u.username   AS staff_name,
                ROUND(s.quantity_sold * s.selling_price, 2) AS total_amount
            FROM sales s
            JOIN products p ON s.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN users u ON s.staff_id = u.id
            WHERE s.sale_date >= DATE_SUB(NOW(), INTERVAL ? DAY)${whereExtra}
            ORDER BY s.sale_date DESC
        `, params);
        return rows;
    },

    getById: async (id) => {
        const [rows] = await db.execute(
            `SELECT s.*, p.product_name, p.sku, p.quantity AS current_stock
             FROM sales s JOIN products p ON s.product_id = p.id WHERE s.id = ?`,
            [id]
        );
        return rows[0];
    },

    /**
     * Create sale + decrement stock atomically.
     * Validates that quantity_sold <= available stock.
     */
    create: async (product_id, quantity_sold, selling_price, staff_id, notes = '') => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Lock product row and check stock
            const [rows] = await connection.execute(
                'SELECT quantity, product_name FROM products WHERE id = ? FOR UPDATE',
                [product_id]
            );
            if (!rows[0]) throw Object.assign(new Error('Product not found'), { statusCode: 404 });

            const { quantity, product_name } = rows[0];
            if (quantity_sold <= 0)
                throw Object.assign(new Error('Quantity must be at least 1'), { statusCode: 400 });
            if (quantity_sold > quantity)
                throw Object.assign(new Error(`Insufficient stock. Available: ${quantity} units of ${product_name}`), { statusCode: 400 });

            // Insert sale record
            const [saleResult] = await connection.execute(
                'INSERT INTO sales (product_id, quantity_sold, selling_price, staff_id, notes) VALUES (?, ?, ?, ?, ?)',
                [product_id, quantity_sold, selling_price, staff_id, notes]
            );

            // Decrement stock
            const newQty = quantity - quantity_sold;
            await connection.execute('UPDATE products SET quantity = ? WHERE id = ?', [newQty, product_id]);

            // Log movement
            await connection.execute(
                'INSERT INTO inventory_movements (product_id, change_amount, movement_type, notes, performed_by) VALUES (?, ?, ?, ?, ?)',
                [product_id, -quantity_sold, 'sale', `Sale #${saleResult.insertId}: ${notes || ''}`, staff_id]
            );

            // Auto-generate reorder alert if stock drops below threshold
            const [prodRows] = await connection.execute(
                'SELECT low_stock_threshold, supplier_name FROM products WHERE id = ?',
                [product_id]
            );
            if (prodRows[0] && newQty <= prodRows[0].low_stock_threshold) {
                // Only insert if no pending alert exists for this product
                await connection.execute(`
                    INSERT IGNORE INTO reorder_alerts (product_id, current_stock, threshold, supplier_name, status)
                    SELECT ?, ?, ?, ?, 'pending'
                    WHERE NOT EXISTS (
                        SELECT 1 FROM reorder_alerts
                        WHERE product_id = ? AND status = 'pending'
                    )
                `, [product_id, newQty, prodRows[0].low_stock_threshold, prodRows[0].supplier_name || '', product_id]);
            }

            await connection.commit();
            return { saleId: saleResult.insertId, newStock: newQty };
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    },

    getTodaySummary: async () => {
        const [[row]] = await db.execute(`
            SELECT
                COUNT(*)                           AS total_transactions,
                COALESCE(SUM(quantity_sold), 0)    AS total_units,
                COALESCE(SUM(quantity_sold * selling_price), 0) AS total_revenue
            FROM sales
            WHERE DATE(sale_date) = CURDATE()
        `);
        return row;
    },

    getMonthlyRevenue: async () => {
        const [rows] = await db.execute(`
            SELECT
                DATE_FORMAT(sale_date, '%Y-%m') AS month,
                ROUND(SUM(quantity_sold * selling_price), 2) AS revenue,
                SUM(quantity_sold) AS units_sold
            FROM sales
            WHERE sale_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(sale_date, '%Y-%m')
            ORDER BY month ASC
        `);
        return rows;
    },
};

module.exports = Sales;
