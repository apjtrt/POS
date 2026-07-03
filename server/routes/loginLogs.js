const express = require('express');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/role');
const prisma = require('../config/db');

const router = express.Router();

router.get('/', authMiddleware, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const logs = await prisma.loginLog.findMany({
      include: {
        user: {
          select: { name: true, username: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // Limit to last 100 logins for performance
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
