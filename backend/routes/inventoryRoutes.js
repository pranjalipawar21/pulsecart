const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { verifyToken, requireOwner } = require('../middleware/auth');

// All inventory routes require a valid JWT
router.use(verifyToken);

// ─── Read — both owner and staff ──────────────────────────────────────────────
router.get('/',               inventoryController.getAllProducts);
router.get('/low-stock',      inventoryController.getLowStockProducts);
router.get('/export',         inventoryController.exportProducts);
router.get('/movements',      inventoryController.getMovements);
router.get('/:id',            inventoryController.getProductById);

// ─── Write — owner only ───────────────────────────────────────────────────────
router.post('/',              requireOwner, inventoryController.createProduct);
router.put('/:id',            requireOwner, inventoryController.updateProduct);
router.delete('/:id',         requireOwner, inventoryController.deleteProduct);
router.post('/:id/reorder',   requireOwner, inventoryController.triggerReorder);
router.post('/:id/adjust',    requireOwner, inventoryController.adjustStock);

module.exports = router;
