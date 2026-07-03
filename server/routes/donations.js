const express = require('express');
const { createDonation, getDonations, getDonationById, getDonationPdf, updateDonation, deleteDonation } = require('../controllers/donationController');
const authMiddleware = require('../middleware/auth');

const requireRole = require('../middleware/role');

const router = express.Router();

router.post('/', authMiddleware, createDonation);
router.get('/', authMiddleware, getDonations);
router.get('/:receiptNumber', authMiddleware, getDonationById);
router.get('/:receiptNumber/pdf', getDonationPdf); // Public route to fetch PDF
router.put('/:id', authMiddleware, requireRole('ADMIN'), updateDonation);
router.delete('/:id', authMiddleware, requireRole('ADMIN'), deleteDonation);

module.exports = router;
