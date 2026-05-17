const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { verifyToken, requireOwner } = require('../middleware/auth');

router.use(verifyToken);

router.get('/',  settingsController.getSettings);
router.put('/',  requireOwner, settingsController.updateSettings);

module.exports = router;
