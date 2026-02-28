const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { verifyFile, getHistory } = require('../controllers/verifyController');

// POST /api/verify/file — upload and verify a video/audio file
router.post('/file', auth, upload.single('video'), verifyFile);

// GET /api/verify/history — get past verifications for logged-in user
router.get('/history', auth, getHistory);

module.exports = router;
