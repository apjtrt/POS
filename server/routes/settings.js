const express = require('express');
const { getSettings, updateSettings, downloadBackup } = require('../controllers/settingsController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/backup', authMiddleware, downloadBackup);
router.get('/', authMiddleware, getSettings);
router.put('/:id', authMiddleware, updateSettings);

module.exports = router;
