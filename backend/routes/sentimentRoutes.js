const express = require('express');
const router = express.Router();
const sentimentController = require('../controllers/sentimentController');
const { verifyToken } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Protect all sentiment intelligence routes with JWT
router.use(verifyToken);

router.post('/live',   sentimentController.analyzeLive);
router.post('/upload', upload.single('file'), sentimentController.uploadCSV);
router.get('/stats',   sentimentController.getStats);

module.exports = router;
