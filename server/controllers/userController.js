const prisma = require('../config/db');
const bcrypt = require('bcrypt');

exports.getCollectors = async (req, res, next) => {
  try {
    const collectors = await prisma.user.findMany({
      where: { role: 'COLLECTOR' },
      select: { id: true, username: true, name: true, createdAt: true, _count: { select: { donations: true } } }
    });
    res.json({ success: true, data: collectors });
  } catch (error) {
    next(error);
  }
};

exports.createCollector = async (req, res, next) => {
  try {
    const { username, password, name } = req.body;
    
    if (!username || !password || !name) {
      return res.status(400).json({ success: false, message: 'Please provide all fields' });
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const collector = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        role: 'COLLECTOR'
      },
      select: { id: true, username: true, name: true, createdAt: true }
    });

    res.status(201).json({ success: true, data: collector });
  } catch (error) {
    next(error);
  }
};

exports.deleteCollector = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Optional: check if collector has donations before deleting, or just set donations userId to null/cascade.
    // We will just delete for now (Cascade is not configured, but we didn't specify onDelete).
    // Actually, Prisma blocks deletion if relation exists without Cascade. We should just let it fail if they have donations,
    // or update them to null. Let's update their donations to unlinked first.
    await prisma.donor.updateMany({
      where: { userId: parseInt(id) },
      data: { userId: null }
    });

    // Delete associated login logs to avoid foreign key constraints
    await prisma.loginLog.deleteMany({
      where: { userId: parseInt(id) }
    });

    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.json({ success: true, message: 'Collector deleted successfully' });
  } catch (error) {
    next(error);
  }
};
