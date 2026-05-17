const Inventory = require('../models/inventoryModel');

// ─── Read ─────────────────────────────────────────────────────────────────────

exports.getCategories = async (req, res, next) => {
    try {
        const categories = await Inventory.getCategories();
        res.json({ success: true, data: categories });
    } catch (err) { next(err); }
};

exports.getAllProducts = async (req, res, next) => {
    try {
        const products = await Inventory.getAll();
        res.json({ success: true, data: products });
    } catch (err) { next(err); }
};

exports.getProductById = async (req, res, next) => {
    try {
        const product = await Inventory.getById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        res.json({ success: true, data: product });
    } catch (err) { next(err); }
};

exports.getLowStockProducts = async (req, res, next) => {
    try {
        const products = await Inventory.getLowStock();
        res.json({ success: true, data: products });
    } catch (err) { next(err); }
};

exports.getMovements = async (req, res, next) => {
    try {
        const { productId, limit } = req.query;
        const movements = await Inventory.getMovements(
            productId ? parseInt(productId) : null,
            limit    ? parseInt(limit)    : 50
        );
        res.json({ success: true, data: movements });
    } catch (err) { next(err); }
};

exports.exportProducts = async (req, res, next) => {
    try {
        const products = await Inventory.getAll();
        const header = 'SKU,Product,Category,Stock,ReorderThreshold,Price,Location,Status\n';
        const rows = products.map(p =>
            `${p.sku},"${p.product}","${p.category}",${p.stock},${p.reorder_threshold},${p.price},"${p.location}",${p.status}`
        ).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=inventory_report.csv');
        res.status(200).send(header + rows);
    } catch (err) { next(err); }
};

// ─── Write ────────────────────────────────────────────────────────────────────

exports.createProduct = async (req, res, next) => {
    try {
        const id = await Inventory.create(req.body);
        if ((req.body.quantity || 0) > 0) {
            await Inventory.addMovement(id, req.body.quantity, 'purchase', 'Initial stock entry', req.user.id);
        }
        res.status(201).json({ success: true, data: { id, ...req.body } });
    } catch (err) { next(err); }
};

exports.updateProduct = async (req, res, next) => {
    try {
        const ok = await Inventory.update(req.params.id, req.body);
        if (!ok) return res.status(404).json({ success: false, message: 'Product not found or no changes made' });
        res.json({ success: true, message: 'Product updated successfully' });
    } catch (err) { next(err); }
};

exports.deleteProduct = async (req, res, next) => {
    try {
        const ok = await Inventory.delete(req.params.id);
        if (!ok) return res.status(404).json({ success: false, message: 'Product not found' });
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (err) { next(err); }
};

/**
 * POST /api/inventory/:id/reorder
 * Body: { quantity, note }
 * Adds stock + logs movement + creates reorder_request record.
 */
exports.triggerReorder = async (req, res, next) => {
    try {
        const { quantity = 50, note = 'Manual reorder from dashboard' } = req.body;
        const result = await Inventory.reorder(req.params.id, quantity, note, req.user.id);

        // Emit Socket.IO event so connected clients refresh immediately
        if (req.app.get('io')) {
            req.app.get('io').emit('inventoryUpdated', { productId: parseInt(req.params.id) });
        }

        res.json({ success: true, message: `Reorder of ${quantity} units applied`, data: result });
    } catch (err) { next(err); }
};

/**
 * POST /api/inventory/:id/adjust
 * Body: { delta, type, note }
 * delta: positive = stock in, negative = stock out
 * type: 'purchase' | 'sale' | 'adjustment' | 'return'
 */
exports.adjustStock = async (req, res, next) => {
    try {
        const { delta, type = 'adjustment', note = '' } = req.body;
        if (delta === undefined || delta === null) {
            return res.status(400).json({ success: false, message: 'delta is required' });
        }
        const result = await Inventory.adjustStock(req.params.id, parseInt(delta), type, note, req.user.id);

        // Emit Socket.IO event
        if (req.app.get('io')) {
            req.app.get('io').emit('inventoryUpdated', { productId: parseInt(req.params.id) });
        }

        res.json({ success: true, message: 'Stock adjusted', data: result });
    } catch (err) { next(err); }
};
