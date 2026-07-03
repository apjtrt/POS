const prisma = require('../config/db');

exports.createExpense = async (req, res, next) => {
  try {
    const { amount, description, billPhotoBase64, latitude, longitude } = req.body;
    
    if (!amount || !description || !billPhotoBase64) {
      return res.status(400).json({ success: false, message: 'Amount, description, and bill photo are required.' });
    }

    const expense = await prisma.expense.create({
      data: {
        userId: req.user.id,
        amount: parseFloat(amount),
        description,
        billPhotoBase64,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
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
    
    // Admins see all expenses, collectors see only theirs
    const whereClause = role === 'ADMIN' ? {} : { userId: id };

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
