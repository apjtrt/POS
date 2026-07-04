const express = require('express');
const { getCollectors, createCollector, deleteCollector } = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/role');
const router = express.Router();

router.use(authMiddleware);

// Admin and Cashier can view collectors
router.get('/collectors', requireRole('ADMIN', 'CASHIER'), getCollectors);

// Only ADMIN can manage users
router.post('/collectors', requireRole('ADMIN'), createCollector);
router.delete('/collectors/:id', requireRole('ADMIN'), deleteCollector);

module.exports = router;
