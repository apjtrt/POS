const express = require('express');
const { getDashboardStats, getDetailedReports } = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/role');

const router = express.Router();

router.get('/stats', authMiddleware, getDashboardStats);
router.get('/reports', authMiddleware, requireRole('ADMIN'), getDetailedReports);

module.exports = router;
