const prisma = require('../config/db');

const getCollectorBalancesOptimized = async (prisma) => {
  const allCollectors = await prisma.user.findMany({
    where: { role: 'COLLECTOR' },
    select: { id: true, name: true, username: true }
  });

  if (!allCollectors.length) return [];
  const collectorIds = allCollectors.map(c => c.id);

  const [cashDonationsGrouped, handedOverGrouped, advanceTransfersGrouped, advanceExpensesGrouped] = await Promise.all([
    prisma.donor.groupBy({
      by: ['userId'],
      where: { paymentMode: 'Cash', userId: { in: collectorIds } },
      _sum: { amount: true }
    }),
    prisma.cashTransfer.groupBy({
      by: ['collectorId'],
      where: { type: 'MONEY_IN', collectorId: { in: collectorIds } },
      _sum: { amount: true }
    }),
    prisma.cashTransfer.groupBy({
      by: ['collectorId'],
      where: { 
        type: 'MONEY_OUT',
        NOT: { description: { startsWith: 'Expense Payout:' } },
        collectorId: { in: collectorIds }
      },
      _sum: { amount: true }
    }),
    prisma.expense.groupBy({
      by: ['userId'],
      where: {
        status: 'PAID',
        deductedFromAdvance: true,
        userId: { in: collectorIds }
      },
      _sum: { amount: true }
    })
  ]);

  return allCollectors.map((collector) => {
    const cashDonations = cashDonationsGrouped.find(g => g.userId === collector.id)?._sum?.amount || 0;
    const handedOver = handedOverGrouped.find(g => g.collectorId === collector.id)?._sum?.amount || 0;
    const advanceReceived = advanceTransfersGrouped.find(g => g.collectorId === collector.id)?._sum?.amount || 0;
    const advanceSpent = advanceExpensesGrouped.find(g => g.userId === collector.id)?._sum?.amount || 0;
    
    return {
      id: collector.id,
      name: collector.name,
      username: collector.username,
      cashInHand: cashDonations - handedOver,
      advanceBalance: advanceReceived - advanceSpent,
      advanceSpent
    };
  });
};

exports.getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isCollector = req.user.role === 'COLLECTOR';
    const isCashier = req.user.role === 'CASHIER';

    if (isCashier) {
      const [moneyIn, moneyOut, upiDonations, allDonations, allExpenses] = await Promise.all([
        prisma.cashTransfer.aggregate({
          where: { cashierId: req.user.id, type: 'MONEY_IN' },
          _sum: { amount: true }
        }),
        prisma.cashTransfer.aggregate({
          where: { cashierId: req.user.id, type: 'MONEY_OUT' },
          _sum: { amount: true }
        }),
        prisma.donor.aggregate({
          where: { paymentMode: 'UPI' },
          _sum: { amount: true }
        }),
        prisma.donor.aggregate({
          _sum: { amount: true }
        }),
        prisma.expense.aggregate({
          where: { status: 'PAID' },
          _sum: { amount: true }
        })
      ]);

      const received = moneyIn._sum.amount || 0;
      const spent = moneyOut._sum.amount || 0;
      const remaining = received - spent;
      const totalUpi = upiDonations._sum.amount || 0;
      const totalAll = allDonations._sum.amount || 0;

      const collectorBalances = await getCollectorBalancesOptimized(prisma);

      return res.json({
        success: true,
        data: {
          isCashier: true,
          totalReceived: received,
          totalSpent: spent,
          remainingAmount: remaining,
          totalUpi,
          totalAll,
          universalIncome: totalAll,
          universalExpenses: allExpenses._sum.amount || 0,
          collectorBalances
        }
      });
    }

    const whereClause = isCollector ? { userId: req.user.id } : {};
    const todayWhere = isCollector ? { date: { gte: today }, userId: req.user.id } : { date: { gte: today } };

    const expenseWhereClause = isCollector ? { userId: req.user.id, status: 'PAID' } : { status: 'PAID' };

    const [
      totalAgg,
      todayAgg,
      totalCount,
      recentDonations,
      streetWise,
      paymentWise,
      topDonors,
      totalExpensesAgg,
      universalIncomeAgg,
      universalExpensesAgg
    ] = await Promise.all([
      prisma.donor.aggregate({ where: whereClause, _sum: { amount: true }, _avg: { amount: true } }),
      prisma.donor.aggregate({ where: todayWhere, _sum: { amount: true } }),
      prisma.donor.count({ where: whereClause }),
      prisma.donor.findMany({ where: whereClause, take: 10, orderBy: { id: 'desc' } }),
      prisma.donor.groupBy({ by: ['street'], where: whereClause, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } } }),
      prisma.donor.groupBy({ by: ['paymentMode'], where: whereClause, _sum: { amount: true } }),
      prisma.donor.groupBy({ by: ['donorName', 'mobile'], where: whereClause, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } }, take: 10 }),
      prisma.expense.aggregate({ where: expenseWhereClause, _sum: { amount: true } }),
      prisma.donor.aggregate({ _sum: { amount: true } }), // universal income
      prisma.expense.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }) // universal expenses
    ]);

    let collectorBalances = [];
    let cashInHand = 0;

    if (!isCollector) {
      collectorBalances = await getCollectorBalancesOptimized(prisma);
    } else {
      const [cashDonations, handedOver] = await Promise.all([
        prisma.donor.aggregate({
          where: { userId: req.user.id, paymentMode: 'Cash' },
          _sum: { amount: true }
        }),
        prisma.cashTransfer.aggregate({
          where: { collectorId: req.user.id, type: 'MONEY_IN' },
          _sum: { amount: true }
        })
      ]);
      cashInHand = (cashDonations._sum.amount || 0) - (handedOver._sum.amount || 0);
    }

    res.json({
      success: true,
      data: {
        totalDonation: totalAgg._sum.amount || 0,
        totalExpenses: totalExpensesAgg._sum.amount || 0,
        universalIncome: universalIncomeAgg._sum.amount || 0,
        universalExpenses: universalExpensesAgg._sum.amount || 0,
        averageDonation: totalAgg._avg.amount || 0,
        todayCollection: todayAgg._sum.amount || 0,
        totalReceipts: totalCount,
        recentDonations,
        streetWise: streetWise.map(s => ({ name: s.street, value: s._sum.amount })),
        paymentWise: paymentWise.map(p => ({ name: p.paymentMode, value: p._sum.amount })),
        topDonors: topDonors.map(t => ({ name: t.donorName, mobile: t.mobile, amount: t._sum.amount })),
        collectorBalances,
        cashInHand
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getDetailedReports = async (req, res, next) => {
  try {
    const isCollector = req.user.role === 'COLLECTOR';
    const whereClause = isCollector ? { userId: req.user.id } : {};

    if (req.query.filter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      whereClause.date = { gte: today };
    }

    const [streetWise, collectorWise] = await Promise.all([
      prisma.donor.groupBy({
        by: ['street'],
        where: whereClause,
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: 'desc' } }
      }),
      prisma.donor.groupBy({
        by: ['collector'],
        where: whereClause,
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: 'desc' } }
      })
    ]);

    // For date-wise, grouping by Date object requires truncating. Since date is stored as DateTime, 
    // it's easier to just fetch and group in JS, or use a raw query. 
    // Since we don't know the volume, let's group by using Prisma's `date` field.
    // In our schema `date` is a DateTime but we only insert the Date part from the form.
    const dateGroups = await prisma.donor.groupBy({
      by: ['date'],
      where: whereClause,
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { date: 'desc' }
    });

    const dateWise = dateGroups.map(d => ({
      date: new Date(d.date).toISOString().split('T')[0],
      amount: d._sum.amount,
      count: d._count._all
    }));

    res.json({
      success: true,
      data: {
        streetWise: streetWise.map(s => ({ name: s.street, amount: s._sum.amount, count: s._count._all })),
        collectorWise: collectorWise.map(c => ({ name: c.collector, amount: c._sum.amount, count: c._count._all })),
        dateWise
      }
    });
  } catch (error) {
    next(error);
  }
};
