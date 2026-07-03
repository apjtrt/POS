const express = require('express');
const { getSettings, updateSettings } = require('../controllers/settingsController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, getSettings);
router.put('/:id', authMiddleware, updateSettings);

module.exports = router;
