const express = require('express');
const { getCollectors, createCollector, deleteCollector } = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/role');

const router = express.Router();

// Only ADMIN can manage users
router.use(authMiddleware);
router.use(requireRole('ADMIN'));

router.get('/collectors', getCollectors);
router.post('/collectors', createCollector);
router.delete('/collectors/:id', deleteCollector);

module.exports = router;
