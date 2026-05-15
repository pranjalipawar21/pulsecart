const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

// Product CRUD
router.get('/',               inventoryController.getAllProducts);
router.get('/:id',            inventoryController.getProductById);
router.post('/',              inventoryController.createProduct);
router.put('/:id',             inventoryController.updateProduct);
router.delete('/:id',          inventoryController.deleteProduct);

// Bulk Ops
router.get('/export',         inventoryController.exportProducts);
router.post('/import',        inventoryController.importProducts);

// Inventory Status & Actions
router.get('/low-stock',      inventoryController.getLowStockProducts);
router.post('/:id/reorder',     inventoryController.triggerReorder);

module.exports = router;
