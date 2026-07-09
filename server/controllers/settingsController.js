const prisma = require('../config/db');
const { getSettings, clearSettingsCache } = require('../services/settingsCache');

exports.getSettings = async (req, res, next) => {
  try {
    let settings = await getSettings();
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          associationName: 'Dr. A.P.J. Abdul Kalam Association',
          presidentName: 'John Doe',
          secretaryName: 'Jane Doe',
          githubRepo: 'your_github_username/donation-receipts',
          whatsappMessage: 'Vanakkam 🙏\n\nThank you for your valuable contribution to\nDr. A.P.J. Abdul Kalam Association.\n\nDonation Amount : ₹{amount}\nReceipt Number : {receiptNumber}\n\nDownload Receipt\n{pdfUrl}\n\nThank you.',
          whatsappMessageTa: 'வணக்கம் 🙏\n\nDr. A.P.J. அப்துல் கலாம் நற்பணி மன்றத்திற்கு உங்கள் நன்கொடைக்கு நன்றி.\n\nநன்கொடை தொகை : ₹{amount}\nரசீது எண் : {receiptNumber}\n\nரசீதை பதிவிறக்க\n{pdfUrl}\n\nநன்றி.',
          upiId: 'dr.abdul.kalam.assoc@upi'
        }
      });
    }
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      associationName, 
      presidentName, 
      secretaryName, 
      defaultPurpose, 
      financialYear, 
      githubRepo, 
      whatsappMessage, 
      whatsappMessageTa,
      upiId,
      streetLinks
    } = req.body;

    const settings = await prisma.settings.update({
      where: { id: parseInt(id) },
      data: {
        associationName,
        presidentName,
        secretaryName,
        defaultPurpose,
        financialYear,
        githubRepo,
        whatsappMessage,
        whatsappMessageTa,
        upiId,
        streetLinks
      }
    });

    clearSettingsCache(); // Clear the cache so it fetches the fresh settings next time

    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

exports.downloadBackup = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only admins can download backups.' });
    }

    const donors = await prisma.donor.findMany();
    const expenses = await prisma.expense.findMany();
    const transfers = await prisma.cashTransfer.findMany();
    const users = await prisma.user.findMany();
    const settings = await prisma.settings.findMany();

    const backupData = {
      timestamp: new Date().toISOString(),
      donors,
      expenses,
      transfers,
      users,
      settings
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=database_backup_' + Date.now() + '.json');
    res.send(JSON.stringify(backupData, null, 2));
  } catch (error) {
    next(error);
  }
};
