const Inventory = require('../models/inventoryModel');

exports.getAllProducts = async (req, res) => {
    try {
        const products = await Inventory.getAll();
        res.json({ success: true, data: products });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getProductById = async (req, res) => {
    try {
        const product = await Inventory.getById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        res.json({ success: true, data: product });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const id = await Inventory.create(req.body);
        // Log initial movement
        await Inventory.addMovement(id, req.body.quantity || 0, 'purchase', 'Initial stock entry');
        res.status(201).json({ success: true, data: { id, ...req.body } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const success = await Inventory.update(req.params.id, req.body);
        if (!success) return res.status(404).json({ success: false, message: 'Product not found or no changes made' });
        res.json({ success: true, message: 'Product updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const success = await Inventory.delete(req.params.id);
        if (!success) return res.status(404).json({ success: false, message: 'Product not found' });
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getLowStockProducts = async (req, res) => {
    try {
        const products = await Inventory.getLowStock();
        res.json({ success: true, data: products });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.triggerReorder = async (req, res) => {
    try {
        const { quantity, note } = req.body;
        const success = await Inventory.reorder(req.params.id, quantity || 50, note);
        if (!success) return res.status(404).json({ success: false, message: 'Product not found' });
        res.json({ success: true, message: 'Reorder successful, stock updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.exportProducts = async (req, res) => {
    try {
        const products = await Inventory.getAll();
        const header = "SKU,Product,Stock,Price,Location\n";
        const rows = products.map(p => 
            `${p.sku},${p.product},${p.stock},${p.price},${p.location}`
        ).join("\n");
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=inventory_report.csv');
        res.status(200).send(header + rows);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.importProducts = async (req, res) => {
    res.status(501).json({ success: false, message: 'Import functionality not yet migrated to MVC structure' });
};
