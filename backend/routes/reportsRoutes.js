const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { verifyToken, requireOwner } = require('../middleware/auth');

router.use(verifyToken, requireOwner);

router.get('/inventory',  reportsController.inventoryReport);
router.get('/sales',      reportsController.salesReport);
router.get('/low-stock',  reportsController.lowStockReport);

module.exports = router;
