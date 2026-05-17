const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, requireOwner } = require('../middleware/auth');

// Public routes
router.post('/login',    authController.login);
router.post('/register', authController.register);

// Protected routes
router.get('/me',    verifyToken, authController.me);
router.get('/staff', verifyToken, requireOwner, authController.getAllStaff);

module.exports = router;
