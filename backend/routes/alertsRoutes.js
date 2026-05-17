const express = require('express');
const router = express.Router();
const alertsController = require('../controllers/alertsController');
const { verifyToken, requireOwner } = require('../middleware/auth');

router.use(verifyToken);

// Both roles can view alerts
router.get('/',              alertsController.getAlerts);
// Owner only: mark complete + generate
router.put('/:id/complete',  requireOwner, alertsController.completeAlert);
router.post('/generate',     requireOwner, alertsController.generateAlerts);

module.exports = router;
