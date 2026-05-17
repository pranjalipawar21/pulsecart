const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { verifyToken, requireOwner } = require('../middleware/auth');

router.use(verifyToken);

// Both owner and staff can view and create sales
router.get('/',         salesController.getAllSales);
router.get('/summary',  salesController.getSummary);
router.post('/',        salesController.createSale);

module.exports = router;
