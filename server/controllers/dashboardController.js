const prisma = require('../config/db');

exports.getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isCollector = req.user.role === 'COLLECTOR';
    const whereClause = isCollector ? { userId: req.user.id } : {};
    const todayWhere = isCollector ? { date: { gte: today }, userId: req.user.id } : { date: { gte: today } };

    const [
      totalAgg,
      todayAgg,
      totalCount,
      recentDonations,
      streetWise,
      paymentWise,
      topDonors
    ] = await Promise.all([
      prisma.donor.aggregate({ where: whereClause, _sum: { amount: true }, _avg: { amount: true } }),
      prisma.donor.aggregate({ where: todayWhere, _sum: { amount: true } }),
      prisma.donor.count({ where: whereClause }),
      prisma.donor.findMany({ where: whereClause, take: 10, orderBy: { id: 'desc' } }),
      prisma.donor.groupBy({ by: ['street'], where: whereClause, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } } }),
      prisma.donor.groupBy({ by: ['paymentMode'], where: whereClause, _sum: { amount: true } }),
      prisma.donor.groupBy({ by: ['donorName', 'mobile'], where: whereClause, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } }, take: 10 })
    ]);

    res.json({
      success: true,
      data: {
        totalDonation: totalAgg._sum.amount || 0,
        averageDonation: totalAgg._avg.amount || 0,
        todayCollection: todayAgg._sum.amount || 0,
        totalReceipts: totalCount,
        recentDonations,
        streetWise: streetWise.map(s => ({ name: s.street, value: s._sum.amount })),
        paymentWise: paymentWise.map(p => ({ name: p.paymentMode, value: p._sum.amount })),
        topDonors: topDonors.map(t => ({ name: t.donorName, mobile: t.mobile, amount: t._sum.amount }))
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
