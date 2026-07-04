const express = require('express');
const { createExpense, getExpenses, updateExpenseStatus, payExpense } = require('../controllers/expenseController');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/role');

const router = express.Router();

router.post('/', authMiddleware, createExpense);
router.get('/', authMiddleware, getExpenses);
router.put('/:id/status', authMiddleware, requireRole('ADMIN'), updateExpenseStatus);
router.put('/:id/pay', authMiddleware, requireRole('CASHIER'), payExpense);

module.exports = router;
