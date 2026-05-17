const Sales = require('../models/salesModel');

/**
 * GET /api/sales
 * Owner sees all; staff sees own sales.
 */
exports.getAllSales = async (req, res, next) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const staff_id = req.user.role === 'staff' ? req.user.id : (req.query.staff_id || null);
        const sales = await Sales.getAll({ staff_id, days });
        res.json({ success: true, data: sales });
    } catch (err) { next(err); }
};

/**
 * POST /api/sales
 * Body: { product_id, quantity_sold, selling_price, notes }
 */
exports.createSale = async (req, res, next) => {
    try {
        const { product_id, quantity_sold, selling_price, notes = '' } = req.body;

        if (!product_id || !quantity_sold || !selling_price)
            return res.status(400).json({ success: false, message: 'product_id, quantity_sold, and selling_price are required.' });
        if (isNaN(quantity_sold) || quantity_sold < 1)
            return res.status(400).json({ success: false, message: 'quantity_sold must be a positive integer.' });
        if (isNaN(selling_price) || selling_price <= 0)
            return res.status(400).json({ success: false, message: 'selling_price must be a positive number.' });

        const result = await Sales.create(
            parseInt(product_id),
            parseInt(quantity_sold),
            parseFloat(selling_price),
            req.user.id,
            notes
        );

        // Notify connected clients via Socket.IO
        if (req.app.get('io')) {
            req.app.get('io').emit('inventoryUpdated', { productId: parseInt(product_id) });
            req.app.get('io').emit('saleCreated', { saleId: result.saleId });
        }

        res.status(201).json({
            success: true,
            message: 'Sale recorded successfully',
            data: result,
        });
    } catch (err) { next(err); }
};

/**
 * GET /api/sales/summary
 * Today's sales summary for dashboard KPIs.
 */
exports.getSummary = async (req, res, next) => {
    try {
        const today = await Sales.getTodaySummary();
        const monthly = await Sales.getMonthlyRevenue();
        res.json({ success: true, data: { today, monthly } });
    } catch (err) { next(err); }
};
