const db = require('../config/db');

const Inventory = {
    getAll: async () => {
        const [rows] = await db.execute(`
            SELECT 
                p.id,
                p.sku,
                p.product_name as product,
                p.quantity as stock,
                p.low_stock_threshold as reorder_threshold,
                p.price,
                p.location,
                c.name as category,
                CASE 
                    WHEN p.quantity <= (p.low_stock_threshold / 2) THEN 'critical'
                    WHEN p.quantity <= p.low_stock_threshold THEN 'low'
                    ELSE 'healthy'
                END as status
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id
            ORDER BY FIELD(status, 'critical', 'low', 'healthy'), p.quantity ASC
        `);
        return rows;
    },

    getById: async (id) => {
        const [rows] = await db.execute('SELECT * FROM products WHERE id = ?', [id]);
        return rows[0];
    },

    create: async (data) => {
        const { sku, product_name, category_id, price, quantity, low_stock_threshold, location } = data;
        const [result] = await db.execute(
            `INSERT INTO products (sku, product_name, category_id, price, quantity, low_stock_threshold, location) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [sku, product_name, category_id, price, quantity, low_stock_threshold, location]
        );
        return result.insertId;
    },

    update: async (id, data) => {
        const { product_name, category_id, price, quantity, low_stock_threshold, location } = data;
        const [result] = await db.execute(
            `UPDATE products 
             SET product_name=?, category_id=?, price=?, quantity=?, low_stock_threshold=?, location=? 
             WHERE id=?`,
            [product_name, category_id, price, quantity, low_stock_threshold, location, id]
        );
        return result.affectedRows > 0;
    },

    delete: async (id) => {
        const [result] = await db.execute('DELETE FROM products WHERE id = ?', [id]);
        return result.affectedRows > 0;
    },

    getLowStock: async () => {
        const [rows] = await db.execute(`
            SELECT 
                p.id,
                p.sku,
                p.product_name as product,
                p.quantity as stock,
                p.low_stock_threshold as reorder_threshold,
                p.price,
                p.location,
                c.name as category,
                CASE 
                    WHEN p.quantity <= (p.low_stock_threshold / 2) THEN 'critical'
                    WHEN p.quantity <= p.low_stock_threshold THEN 'low'
                    ELSE 'healthy'
                END as status
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.quantity <= p.low_stock_threshold
            ORDER BY p.quantity ASC
        `);
        return rows;
    },

    // Reorder logic: adds to quantity and records movement
    reorder: async (id, amount, note = 'Automatic Reorder') => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            
            // 1. Update stock
            await connection.execute('UPDATE products SET quantity = quantity + ? WHERE id = ?', [amount, id]);
            
            // 2. Log movement
            await connection.execute(
                'INSERT INTO inventory_movements (product_id, change_amount, movement_type, notes) VALUES (?, ?, ?, ?)',
                [id, amount, 'reorder', note]
            );

            await connection.commit();
            return true;
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    },

    addMovement: async (productId, amount, type, note) => {
        const [result] = await db.execute(
            'INSERT INTO inventory_movements (product_id, change_amount, movement_type, notes) VALUES (?, ?, ?, ?)',
            [productId, amount, type, note]
        );
        return result.insertId;
    }
};

module.exports = Inventory;
