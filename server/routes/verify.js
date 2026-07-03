const express = require('express');
const prisma = require('../config/db');
const router = express.Router();

router.get('/:receiptNumber', async (req, res, next) => {
  try {
    const { receiptNumber } = req.params;
    const donor = await prisma.donor.findUnique({
      where: { receiptNumber }
    });

    if (!donor) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    res.json({ success: true, data: donor });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
