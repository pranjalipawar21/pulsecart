const db = require('../config/db');

const Inventory = {
    getAll: async () => {
        const [rows] = await db.execute(`
            SELECT
                p.id, p.sku,
                p.product_name AS product,
                p.quantity     AS stock,
                p.low_stock_threshold AS reorder_threshold,
                p.price, p.cost_price,
                p.supplier_name,
                p.location,
                c.name AS category,
                c.id   AS category_id,
                CASE
                    WHEN p.quantity <= FLOOR(p.low_stock_threshold / 2) THEN 'critical'
                    WHEN p.quantity <= p.low_stock_threshold             THEN 'low'
                    ELSE 'healthy'
                END AS status
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            ORDER BY FIELD(
                CASE
                    WHEN p.quantity <= FLOOR(p.low_stock_threshold / 2) THEN 'critical'
                    WHEN p.quantity <= p.low_stock_threshold             THEN 'low'
                    ELSE 'healthy'
                END, 'critical', 'low', 'healthy'), p.quantity ASC
        `);
        return rows;
    },

    getById: async (id) => {
        const [rows] = await db.execute(`
            SELECT p.*, c.name AS category
            FROM products p LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ?
        `, [id]);
        return rows[0];
    },

    getLowStock: async () => {
        const [rows] = await db.execute(`
            SELECT p.id, p.sku, p.product_name AS product,
                   p.quantity AS stock, p.low_stock_threshold AS reorder_threshold,
                   p.price, p.location, c.name AS category,
                   CASE
                       WHEN p.quantity <= FLOOR(p.low_stock_threshold / 2) THEN 'critical'
                       WHEN p.quantity <= p.low_stock_threshold             THEN 'low'
                       ELSE 'healthy'
                   END AS status
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.quantity <= p.low_stock_threshold
            ORDER BY p.quantity ASC
        `);
        return rows;
    },

    getCategories: async () => {
        const [rows] = await db.execute('SELECT id, name FROM categories ORDER BY name');
        return rows;
    },

    getMovements: async (productId = null, limit = 50) => {
        const [rows] = await db.execute(`
            SELECT im.id, im.change_amount, im.movement_type, im.notes, im.created_at,
                   p.sku, p.product_name AS product, u.username AS performed_by
            FROM inventory_movements im
            JOIN products p ON im.product_id = p.id
            LEFT JOIN users u ON im.performed_by = u.id
            ${productId ? 'WHERE im.product_id = ?' : ''}
            ORDER BY im.created_at DESC
            LIMIT ?
        `, productId ? [productId, limit] : [limit]);
        return rows;
    },

    create: async (data) => {
        const { sku, product_name, category_id, price, cost_price, quantity, low_stock_threshold, supplier_name, location } = data;
        const [result] = await db.execute(
            `INSERT INTO products (sku, product_name, category_id, price, cost_price, quantity, low_stock_threshold, supplier_name, location)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [sku, product_name, category_id || null, price, cost_price || 0, quantity || 0,
             low_stock_threshold || 10, supplier_name || '', location || 'Main Warehouse']
        );
        return result.insertId;
    },

    update: async (id, data) => {
        const { product_name, category_id, price, cost_price, quantity, low_stock_threshold, supplier_name, location } = data;
        const [result] = await db.execute(
            `UPDATE products
             SET product_name=?, category_id=?, price=?, cost_price=?, quantity=?,
                 low_stock_threshold=?, supplier_name=?, location=?
             WHERE id=?`,
            [product_name, category_id || null, price, cost_price || 0, quantity,
             low_stock_threshold, supplier_name || '', location, id]
        );
        return result.affectedRows > 0;
    },

    delete: async (id) => {
        const [result] = await db.execute('DELETE FROM products WHERE id = ?', [id]);
        return result.affectedRows > 0;
    },

    adjustStock: async (productId, delta, type, note = '', userId = null) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const [rows] = await connection.execute('SELECT quantity FROM products WHERE id = ? FOR UPDATE', [productId]);
            if (!rows[0]) throw Object.assign(new Error('Product not found'), { statusCode: 404 });
            const newQty = rows[0].quantity + delta;
            if (newQty < 0) throw Object.assign(new Error('Insufficient stock'), { statusCode: 400 });
            await connection.execute('UPDATE products SET quantity = ? WHERE id = ?', [newQty, productId]);
            const [mvResult] = await connection.execute(
                'INSERT INTO inventory_movements (product_id, change_amount, movement_type, notes, performed_by) VALUES (?, ?, ?, ?, ?)',
                [productId, delta, type, note, userId]
            );
            await connection.commit();
            return { newQuantity: newQty, movementId: mvResult.insertId };
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    },

    reorder: async (productId, amount, note = 'Manual reorder from dashboard', userId = null) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute('UPDATE products SET quantity = quantity + ? WHERE id = ?', [amount, productId]);
            const [invMv] = await connection.execute(
                'INSERT INTO inventory_movements (product_id, change_amount, movement_type, notes, performed_by) VALUES (?, ?, ?, ?, ?)',
                [productId, amount, 'reorder', note, userId]
            );
            await connection.execute(
                'INSERT INTO reorder_requests (product_id, requested_qty, triggered_by, note) VALUES (?, ?, ?, ?)',
                [productId, amount, userId, note]
            );
            // Clear any pending alerts for this product
            await connection.execute(
                `UPDATE reorder_alerts SET status = 'completed', completed_at = NOW()
                 WHERE product_id = ? AND status = 'pending'`,
                [productId]
            );
            await connection.commit();
            return { movementId: invMv.insertId };
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    },

    addMovement: async (productId, amount, type, note, userId = null) => {
        const [result] = await db.execute(
            'INSERT INTO inventory_movements (product_id, change_amount, movement_type, notes, performed_by) VALUES (?, ?, ?, ?, ?)',
            [productId, amount, type, note, userId]
        );
        return result.insertId;
    },
};

module.exports = Inventory;
