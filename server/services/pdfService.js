const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const generatePdfReceipt = async (donor, receiptNumber, frontendUrl) => {
  // A5 size: 420 x 595 points
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([420, 595]);
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Draw Border
  page.drawRectangle({
    x: 10, y: 10, width: 400, height: 575,
    borderColor: rgb(0, 0, 0), borderWidth: 2,
  });

  // Header
  page.drawText('Dr. A.P.J. Abdul Kalam Association', {
    x: 80, y: 550, size: 16, font: boldFont, color: rgb(0, 0.2, 0.6)
  });
  page.drawText('Donation Receipt', {
    x: 150, y: 520, size: 14, font: boldFont,
  });

  // Receipt Details
  const startY = 480;
  const lineSpacing = 25;
  const leftCol = 30;
  const rightCol = 150;

  const fields = [
    { label: 'Receipt No:', value: receiptNumber },
    { label: 'Date:', value: new Date(donor.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }) },
    { label: 'Donor Name:', value: donor.donorName },
    { label: 'Father/Husband:', value: donor.fatherName || 'N/A' },
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
  page.drawText('Collector:', { x: leftCol, y: 150, size: 10, font: boldFont });
  page.drawText(donor.collector, { x: 90, y: 150, size: 10, font });

  page.drawText('President', { x: 50, y: 80, size: 10, font: boldFont });
  page.drawText('Treasurer', { x: 300, y: 80, size: 10, font: boldFont });

  // Footer
  page.drawText('Thank you for your generous contribution.', {
    x: 90, y: 40, size: 12, font: boldFont, color: rgb(0, 0.5, 0)
  });

  // QR Code
  const qrUrl = `${frontendUrl}/receipt/${receiptNumber}`;
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
