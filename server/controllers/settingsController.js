const prisma = require('../config/db');

exports.getSettings = async (req, res, next) => {
  try {
    let settings = await prisma.settings.findFirst();
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          associationName: 'Dr. A.P.J. Abdul Kalam Association',
          presidentName: 'John Doe',
          treasurerName: 'Jane Doe',
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
      treasurerName, 
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
        treasurerName,
        defaultPurpose,
        financialYear,
        githubRepo,
        whatsappMessage,
        whatsappMessageTa,
        upiId,
        streetLinks
      }
    });
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};
