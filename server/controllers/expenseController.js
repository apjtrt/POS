const prisma = require('../config/db');
const { uploadImageToGithub } = require('../services/githubService');

exports.createExpense = async (req, res, next) => {
  try {
    const { amount, description, billPhotoBase64, latitude, longitude, paymentNumber } = req.body;
    
    if (!amount || !description || !billPhotoBase64) {
      return res.status(400).json({ success: false, message: 'Amount, description, and bill photo are required.' });
    }

    let finalPhotoUrl = billPhotoBase64;
    if (billPhotoBase64.length > 500) { // arbitrary threshold to check if it's base64 and not already a url
      const filename = `expense-${req.user.id}-${Date.now()}.jpg`;
      const githubUrl = await uploadImageToGithub(billPhotoBase64, filename, 'expense-bills');
      if (githubUrl) {
        finalPhotoUrl = githubUrl;
      }
    }

    // Save persistent UPI ID if provided
    if (paymentNumber) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { upiId: paymentNumber }
      });
    }

    const expense = await prisma.expense.create({
      data: {
        userId: req.user.id,
        amount: parseFloat(amount),
        description,
        billPhotoBase64: finalPhotoUrl,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        paymentNumber,
        status: 'PENDING'
      }
    });

    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
};

exports.getExpenses = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    
    // Admins see all expenses, collectors see only theirs, Cashiers see APPROVED or PAID
    let whereClause = {};
    if (role === 'COLLECTOR') {
      whereClause = { userId: id };
    } else if (role === 'CASHIER') {
      whereClause = { status: { in: ['APPROVED', 'PAID'] } };
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      include: {
        user: {
          select: { name: true, username: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: expenses });
  } catch (error) {
    next(error);
  }
};

exports.updateExpenseStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const expense = await prisma.expense.update({
      where: { id: parseInt(id) },
      data: { status }
    });

    res.json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
};

exports.payExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paymentMode } = req.body;

    if (req.user.role !== 'CASHIER') {
      return res.status(403).json({ success: false, message: 'Only Cashiers can pay expenses.' });
    }

    if (!paymentMode) {
      return res.status(400).json({ success: false, message: 'Payment mode is required' });
    }

    const expense = await prisma.expense.findUnique({ where: { id: parseInt(id) } });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    
    if (expense.status !== 'APPROVED') {
      return res.status(400).json({ success: false, message: 'Expense must be approved before payment.' });
    }

    // Update expense to PAID
    const updatedExpense = await prisma.expense.update({
      where: { id: parseInt(id) },
      data: {
        status: 'PAID',
        cashierId: req.user.id,
        paymentMode
      }
    });

    // Automatically create a Money Out CashTransfer
    await prisma.cashTransfer.create({
      data: {
        cashierId: req.user.id,
        collectorId: expense.userId,
        type: 'MONEY_OUT',
        amount: expense.amount,
        paymentMode,
        description: `Expense Payout: ${expense.description}`
      }
    });

    res.json({ success: true, data: updatedExpense });
  } catch (error) {
    next(error);
  }
};
