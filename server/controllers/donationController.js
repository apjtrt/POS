const prisma = require('../config/db');
const generateReceiptNumber = require('../utils/generateReceiptNumber');
const { generatePdfReceipt } = require('../services/pdfService');


const { uploadImageToGithub } = require('../services/githubService');

exports.createDonation = async (req, res, next) => {
  try {
    const { donorName, mobile, street, doorNumber, amount, paymentMode, purpose, remarks, bypassDuplicateCheck, latitude, longitude, upiScreenshot } = req.body;

    // Duplicate Check
    if (!bypassDuplicateCheck) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const duplicate = await prisma.donor.findFirst({
        where: {
          donorName,
          street,
          doorNumber,
          createdAt: {
            gte: today,
            lt: tomorrow
          }
        }
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          isDuplicate: true,
          message: 'This donor may have already donated today.'
        });
      }
    }

    const year = new Date().getFullYear().toString();
    const receiptNumber = await generateReceiptNumber(year);

    let finalUpiUrl = upiScreenshot || null;
    if (upiScreenshot && upiScreenshot.length > 500) {
      const filename = `upi-${receiptNumber}-${Date.now()}.jpg`;
      const githubUrl = await uploadImageToGithub(upiScreenshot, filename, 'upi-screenshots');
      if (githubUrl) {
        finalUpiUrl = githubUrl;
      }
    }

    const donor = await prisma.donor.create({
      data: {
        receiptNumber,
        donorName,
        mobile,
        street,
        doorNumber,
        amount: parseFloat(amount),
        paymentMode,
        purpose,
        remarks,
        collector: req.user.name,
        userId: req.user.id,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        upiScreenshot: finalUpiUrl
      }
    });

    // We no longer upload to GitHub. Serve PDFs dynamically from the backend directly.
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const backendUrl = `${protocol}://${host}`;
    const pdfUrl = `${backendUrl}/api/donations/${receiptNumber}/pdf`;
    
    await prisma.donor.update({
      where: { id: donor.id },
      data: { pdfUrl }
    });

    res.status(201).json({
      success: true,
      donor: { ...donor, pdfUrl }
    });
  } catch (error) {
    next(error);
  }
};

exports.getDonations = async (req, res, next) => {
  try {
    const { search, street, paymentMode, startDate, endDate, collector, date, page = 1, limit = 10 } = req.query;
    
    let where = {};
    if (search) {
      where.OR = [
        { receiptNumber: { contains: search, mode: 'insensitive' } },
        { donorName: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (street) where.street = street;
    if (paymentMode) where.paymentMode = paymentMode;
    if (collector) where.collector = collector;
    
    // Filter by specific date
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);
      where.date = { gte: targetDate, lt: nextDate };
    } 
    // Filter by date range
    else if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    if (req.user.role === 'COLLECTOR') {
      where.userId = req.user.id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const donations = await prisma.donor.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'desc' }
    });

    const total = await prisma.donor.count({ where });

    res.json({
      success: true,
      data: donations,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getDonationById = async (req, res, next) => {
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
};

exports.getDonationPdf = async (req, res, next) => {
  try {
    const { receiptNumber } = req.params;
    const donor = await prisma.donor.findUnique({
      where: { receiptNumber }
    });
    
    if (!donor) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const settings = await prisma.settings.findFirst();
    const pdfBytes = await generatePdfReceipt(donor, receiptNumber, frontendUrl, settings);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Receipt-${receiptNumber}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    next(error);
  }
};

exports.updateDonation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const donor = await prisma.donor.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    
    res.json({ success: true, data: donor });
  } catch (error) {
    next(error);
  }
};

exports.deleteDonation = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.donor.delete({ where: { id: parseInt(id) } });
    res.json({ success: true, message: 'Donation deleted successfully' });
  } catch (error) {
    next(error);
  }
};
