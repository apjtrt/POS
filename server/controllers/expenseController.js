const prisma = require('../config/db');


const { uploadImageToCloudinary } = require('../services/cloudinaryService');

exports.createExpense = async (req, res, next) => {
  try {
    const { amount, description, billPhotoBase64, latitude, longitude, paymentNumber, claimFromAdvance } = req.body;
    
    if (!amount || !description || !billPhotoBase64) {
      return res.status(400).json({ success: false, message: 'Amount, description, and bill photo are required.' });
    }

    let finalPhotoUrl = billPhotoBase64;
    if (billPhotoBase64.length > 500) { // arbitrary threshold to check if it's base64 and not already a url
      const filename = `expense-${req.user.id}-${Date.now()}.jpg`;
      const cloudinaryUrl = await uploadImageToCloudinary(billPhotoBase64, filename, 'expense-bills');
      if (cloudinaryUrl) {
        finalPhotoUrl = cloudinaryUrl;
      }
    }

    // Save persistent UPI ID if provided
    if (paymentNumber) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { upiId: paymentNumber }
      });
    }

    const isAdvance = claimFromAdvance ? true : false;

    const expense = await prisma.expense.create({
      data: {
        userId: req.user.id,
        amount: parseFloat(amount),
        description,
        billPhotoBase64: finalPhotoUrl,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        paymentNumber,
        status: isAdvance ? 'PAID' : 'PENDING',
        claimFromAdvance: isAdvance,
        deductedFromAdvance: isAdvance
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
    const { paymentMode, deductFromAdvance } = req.body;

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
        paymentMode,
        deductedFromAdvance: deductFromAdvance ? true : false
      }
    });

    // Only create a MONEY_OUT CashTransfer if this was paid out of pocket, not deducted from advance
    if (!deductFromAdvance) {
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
    }

    res.json({ success: true, data: updatedExpense });
  } catch (error) {
    next(error);
  }
};

exports.getAdvanceBalance = async (req, res, next) => {
  try {
    // If cashier is asking, they pass a collectorId. If collector is asking, we use their own ID.
    const collectorId = req.query.collectorId ? parseInt(req.query.collectorId) : req.user.id;
    
    // 1. Total Advances Given (MONEY_OUT transfers not labeled as "Expense Payout")
    const advances = await prisma.cashTransfer.findMany({
      where: {
        collectorId: collectorId,
        type: 'MONEY_OUT',
        NOT: { description: { startsWith: 'Expense Payout:' } }
      }
    });
    
    const totalAdvanceReceived = (advances || []).reduce((sum, a) => sum + (a?.amount || 0), 0);

    // 2. Total Deducted from Advance
    const expenses = await prisma.expense.findMany({
      where: {
        userId: collectorId,
        status: 'PAID',
        deductedFromAdvance: true
      }
    });

    const totalSpentFromAdvance = (expenses || []).reduce((sum, e) => sum + (e?.amount || 0), 0);

    res.json({
      success: true,
      data: {
        totalAdvanceReceived,
        totalSpentFromAdvance,
        remainingBalance: totalAdvanceReceived - totalSpentFromAdvance
      }
    });
  } catch (error) {
    next(error);
  }
};
