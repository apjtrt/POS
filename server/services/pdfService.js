const { PDFDocument, rgb, StandardFonts, PDFString } = require('pdf-lib');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const generatePdfReceipt = async (donor, receiptNumber, frontendUrl, settings) => {
  // A5 size: 420 x 595 points
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([420, 595]);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Background Image (logo1.jpeg)
  try {
    const bgPath = path.join(__dirname, '../../client/public/images/logo1.jpeg');
    if (fs.existsSync(bgPath)) {
      const bgBytes = fs.readFileSync(bgPath);
      const bgImage = await pdfDoc.embedJpg(bgBytes);

      const imgDims = bgImage.scale(1);
      const aspectRatio = imgDims.width / imgDims.height;
      const targetWidth = 250;
      const targetHeight = 250 / aspectRatio;

      page.drawImage(bgImage, {
        x: (420 - targetWidth) / 2,
        y: (595 - targetHeight) / 2,
        width: targetWidth,
        height: targetHeight,
        opacity: 0.3
      });
    }
  } catch (err) {
    console.error('Error embedding background:', err);
  }

  // Draw Border
  page.drawRectangle({
    x: 10, y: 10, width: 400, height: 575,
    borderColor: rgb(0, 0, 0), borderWidth: 2,
  });

  const drawCenteredText = (text, y, size, fontToUse, color = rgb(0, 0, 0)) => {
    const textWidth = fontToUse.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (420 - textWidth) / 2,
      y,
      size,
      font: fontToUse,
      color
    });
  };

  const drawCenteredLink = (text, url, y, size, fontToUse, color = rgb(0, 0, 0.8)) => {
    const textWidth = fontToUse.widthOfTextAtSize(text, size);
    const x = (420 - textWidth) / 2;
    page.drawText(text, { x, y, size, font: fontToUse, color });

    const link = pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [x, y - 2, x + textWidth, y + size],
      Border: [0, 0, 0],
      A: {
        Type: 'Action',
        S: 'URI',
        URI: PDFString.of(url),
      },
    });
    page.node.addAnnot(pdfDoc.context.register(link));
  };

  // Header
  drawCenteredText('DR.A.P.J.ABDUL KALAM YOUTH WELFARE', 560, 12, boldFont, rgb(0, 0.2, 0.6));
  drawCenteredText('ASSOCIATION - TIRUTTANI', 546, 12, boldFont, rgb(0, 0.2, 0.6));
  drawCenteredText('(Affiliated to Nehru Yuva Kendra Sangathan (NYKS))', 532, 8, boldFont);
  drawCenteredText('REG.NO: 313/2024', 520, 8, boldFont);

  drawCenteredText('Donation Receipt', 505, 14, boldFont);

  try {
    const logoPath = path.join(__dirname, '../../client/public/images/logo.png');
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath);
      const logoImage = await pdfDoc.embedPng(logoBytes);
      page.drawImage(logoImage, {
        x: 20, y: 520, width: 50, height: 50,
      });
    }
  } catch (err) {
    console.error('Error embedding logo:', err);
  }

  // Receipt Details
  const startY = 480;
  const lineSpacing = 25;
  const leftCol = 30;
  const rightCol = 150;

  const fields = [
    { label: 'Receipt No:', value: receiptNumber },
    { label: 'Date:', value: new Date(donor.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }) },
    { label: 'Donor Name:', value: donor.donorName },
    { label: 'Mobile:', value: donor.mobile },
    { label: 'Address:', value: `${donor.doorNumber || ''}, ${donor.street}` },
    { label: 'Donation Amount:', value: `Rs. ${donor.amount}` },
    { label: 'Payment Mode:', value: donor.paymentMode },
    { label: 'Purpose:', value: donor.purpose },
  ];

  fields.forEach((field, i) => {
    page.drawText(field.label, { x: leftCol, y: startY - (i * lineSpacing), size: 10, font: boldFont });
    page.drawText(String(field.value), { x: rightCol, y: startY - (i * lineSpacing), size: 10, font });
  });

  // Signatures
  page.drawText('Collector:', { x: leftCol, y: 270, size: 10, font: boldFont });
  page.drawText(donor.collector, { x: 90, y: 270, size: 10, font });

  // Association Links
  drawCenteredLink('Website: abdulkalamassociation.vercel.app', 'https://abdulkalamassociation.vercel.app', 250, 10, font, rgb(0, 0, 0.8));
  drawCenteredLink('Instagram: @apjtrusttiruttani2024', 'https://www.instagram.com/apjtrusttiruttani2024?igsh=azZpdmp0b3Q1cHR1', 235, 10, font, rgb(0, 0, 0.8));
  drawCenteredLink('Location: View on Google Maps', 'https://share.google/cQ4sLoKGJ58JCg5b2', 220, 10, font, rgb(0, 0, 0.8));

  page.drawText(settings?.presidentName || 'President Name', { x: 50, y: 100, size: 10, font });
  page.drawText('President', { x: 50, y: 80, size: 10, font: boldFont });

  page.drawText(settings?.secretaryName || 'Secretary Name', { x: 300, y: 100, size: 10, font });
  page.drawText('Secretary', { x: 300, y: 80, size: 10, font: boldFont });

  // Footer
  page.drawText('Thank you for your generous contribution.', {
    x: 90, y: 40, size: 12, font: boldFont, color: rgb(0, 0.5, 0)
  });
  page.drawText('Created By MANOJ P|PMJ PROJECTS.', {
    x: 105, y: 20, size: 10, font: boldFont, color: rgb(0, 0.2, 0.6)
  });

  // QR Code
  const cleanFrontendUrl = frontendUrl.replace(/\/+$/, '');
  const qrUrl = `${cleanFrontendUrl}/receipt/${receiptNumber}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl);
  const qrImageBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
  const qrImage = await pdfDoc.embedPng(qrImageBytes);

  page.drawImage(qrImage, {
    x: 280, y: 400, width: 80, height: 80,
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};

module.exports = { generatePdfReceipt };
