const express = require('express');
const { createExpense, getExpenses, updateExpenseStatus } = require('../controllers/expenseController');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/role');

const router = express.Router();

router.post('/', authMiddleware, createExpense);
router.get('/', authMiddleware, getExpenses);
router.put('/:id/status', authMiddleware, requireRole('ADMIN'), updateExpenseStatus);

module.exports = router;
