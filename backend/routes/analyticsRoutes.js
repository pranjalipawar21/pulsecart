const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { verifyToken, requireOwner } = require('../middleware/auth');

router.use(verifyToken);

// Owner-only routes
router.get('/kpis',       requireOwner, analyticsController.getKPIs);
router.get('/summary',    requireOwner, analyticsController.getSummary);
router.get('/charts',     requireOwner, analyticsController.getCharts);
router.get('/categories', requireOwner, analyticsController.getCategories);
router.get('/sku-trends', requireOwner, analyticsController.getSkuTrends);
router.get('/movements',  requireOwner, analyticsController.getMovements);

// Both roles (for staff alerts panel)
router.get('/low-stock',  analyticsController.getLowStock);

module.exports = router;
