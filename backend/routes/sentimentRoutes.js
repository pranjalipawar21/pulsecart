const express = require('express');
const router = express.Router();
const sentimentController = require('../controllers/sentimentController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/live',   sentimentController.analyzeLive);
router.post('/upload', upload.single('file'), sentimentController.uploadCSV);
router.get('/stats',   sentimentController.getStats);

module.exports = router;
