const prisma = require('../config/db');

exports.createTransfer = async (req, res, next) => {
  try {
    const { collectorId, amount, paymentMode, description, type } = req.body;
    
    if (!collectorId || !amount || !paymentMode) {
      return res.status(400).json({ success: false, message: 'Collector, amount, and payment mode are required.' });
    }

    if (req.user.role !== 'CASHIER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only cashiers can create transfers.' });
    }

    const transfer = await prisma.cashTransfer.create({
      data: {
        cashierId: req.user.id,
        collectorId: parseInt(collectorId),
        amount: parseFloat(amount),
        paymentMode,
        description,
        type: type || 'MONEY_IN'
      }
    });

    res.status(201).json({ success: true, data: transfer });
  } catch (error) {
    next(error);
  }
};

exports.getTransfers = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    
    // Admins see all, Cashiers see only their received transfers, Collectors see their sent transfers
    let whereClause = {};
    if (role === 'CASHIER') {
      whereClause = { cashierId: id };
    } else if (role === 'COLLECTOR') {
      whereClause = { collectorId: id };
    }

    const transfers = await prisma.cashTransfer.findMany({
      where: whereClause,
      include: {
        cashier: { select: { name: true, username: true } },
        collector: { select: { name: true, username: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: transfers });
  } catch (error) {
    next(error);
  }
};
