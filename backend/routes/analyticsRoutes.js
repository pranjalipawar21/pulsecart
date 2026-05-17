const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { verifyToken, requireOwner } = require('../middleware/auth');

// All analytics routes require authentication
router.use(verifyToken);

// KPIs and detailed analytics — owner only
router.get('/kpis',       requireOwner, analyticsController.getKPIs);
router.get('/categories', requireOwner, analyticsController.getCategories);
router.get('/sku-trends', requireOwner, analyticsController.getSkuTrends);
router.get('/movements',  requireOwner, analyticsController.getMovements);

// Low-stock: accessible by both owner and staff (needed for their alerts)
router.get('/low-stock',  analyticsController.getLowStock);

module.exports = router;
