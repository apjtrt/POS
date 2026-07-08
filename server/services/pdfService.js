const { PDFDocument, rgb, StandardFonts, PDFString } = require('pdf-lib');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// ---- Design tokens (single source of truth so the look stays consistent) ----
const COLORS = {
  primary: rgb(0.05, 0.15, 0.45),   // deep navy - org name / headings
  accent: rgb(0.72, 0.11, 0.11),    // maroon-red - amount / emphasis
  text: rgb(0.12, 0.12, 0.12),      // near-black body text
  muted: rgb(0.45, 0.45, 0.45),     // secondary/meta text
  link: rgb(0.05, 0.15, 0.45),      // links match primary (not a random blue)
  line: rgb(0.82, 0.82, 0.82),      // hairlines/dividers
  success: rgb(0.1, 0.45, 0.2),     // thank-you line
};

const PAGE_W = 420;
const PAGE_H = 595;
const MARGIN = 28;

const generatePdfReceipt = async (donor, receiptNumber, frontendUrl, settings) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // ---------- helpers ----------
  const centerText = (text, y, size, f, color = COLORS.text) => {
    const w = f.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (PAGE_W - w) / 2, y, size, font: f, color });
  };

  const centerLink = (text, url, y, size, f, color = COLORS.link) => {
    const w = f.widthOfTextAtSize(text, size);
    const x = (PAGE_W - w) / 2;
    page.drawText(text, { x, y, size, font: f, color });
    const link = pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [x, y - 2, x + w, y + size],
      Border: [0, 0, 0],
      A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) },
    });
    page.node.addAnnot(pdfDoc.context.register(link));
  };

  const hLine = (y, x1 = MARGIN, x2 = PAGE_W - MARGIN, color = COLORS.line, thickness = 0.75) => {
    page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color });
  };

  // ---------- outer border ----------
  page.drawRectangle({
    x: 12, y: 12, width: PAGE_W - 24, height: PAGE_H - 24,
    borderColor: COLORS.primary, borderWidth: 1.5,
  });
  // thin inner accent line for a "certificate" feel
  page.drawRectangle({
    x: 16, y: 16, width: PAGE_W - 32, height: PAGE_H - 32,
    borderColor: COLORS.line, borderWidth: 0.5,
  });

  // ---------- faint watermark portrait (kept quiet, doesn't fight the text) ----------
  try {
    const bgPath = path.join(__dirname, '../../client/public/images/logo1.jpeg');
    if (fs.existsSync(bgPath)) {
      const bgBytes = fs.readFileSync(bgPath);
      const bgImage = await pdfDoc.embedJpg(bgBytes);
      const dims = bgImage.scale(1);
      const targetW = 220;
      const targetH = targetW / (dims.width / dims.height);
      page.drawImage(bgImage, {
        x: (PAGE_W - targetW) / 2,
        y: (PAGE_H - targetH) / 2 - 10,
        width: targetW,
        height: targetH,
        opacity: 0.06,
      });
    }
  } catch (err) {
    console.error('Error embedding background:', err);
  }

  // ---------- header ----------
  let y = PAGE_H - 40;

  // header title block spans 4 lines (12.5 + 14gap + 12.5 + 11gap + 7.5 + 9gap + 7.5 = ~51.5pt tall)
  const headerBlockTop = y + 9;      // approx ascender above first baseline
  const headerBlockBottom = y - 40 - 2; // approx descender below last baseline
  const headerBlockCenter = (headerBlockTop + headerBlockBottom) / 2;
  const logoSize = 46;

  try {
    const logoPath = path.join(__dirname, '../../client/public/images/logo.png');
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath);
      const logoImage = await pdfDoc.embedPng(logoBytes);
      // vertically centered against the title block, not an eyeballed offset
      page.drawImage(logoImage, {
        x: MARGIN, y: headerBlockCenter - logoSize / 2, width: logoSize, height: logoSize,
      });
    }
  } catch (err) {
    console.error('Error embedding logo:', err);
  }

  centerText('DR.A.P.J. ABDUL KALAM YOUTH WELFARE', y, 12.5, bold, COLORS.primary);
  y -= 15;
  centerText('ASSOCIATION - TIRUTTANI', y, 12.5, bold, COLORS.primary);
  y -= 14;
  centerText('(Affiliated to Nehru Yuva Kendra Sangathan (NYKS))', y, 7.5, font, COLORS.muted);
  y -= 11;
  centerText('REG. NO: 313/2024', y, 7.5, font, COLORS.muted);
  y -= 20;

  hLine(y, MARGIN, PAGE_W - MARGIN, COLORS.primary, 1);
  y -= 22;

  centerText('DONATION RECEIPT', y, 15, bold, COLORS.text);
  y -= 26;

  // ---------- receipt no. + date strip (the two things people scan for first) ----------
  const stripTop = y;
  page.drawRectangle({
    x: MARGIN, y: stripTop - 22, width: PAGE_W - 2 * MARGIN, height: 24,
    color: rgb(0.96, 0.96, 0.98),
  });
  page.drawText('RECEIPT NO.  ', { x: MARGIN + 10, y: stripTop - 15, size: 7.5, font: bold, color: COLORS.muted });
  const receiptNoLabelW = bold.widthOfTextAtSize('RECEIPT NO.  ', 7.5);
  page.drawText(String(receiptNumber), {
    x: MARGIN + 10 + receiptNoLabelW, y: stripTop - 15, size: 10, font: bold, color: COLORS.primary,
  });

  const dateStr = new Date(donor.createdAt).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', hour12: true, day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const dateLabel = 'DATE  ';
  const dateLabelW = bold.widthOfTextAtSize(dateLabel, 7.5);
  const dateValueW = font.widthOfTextAtSize(dateStr, 9.5);
  const dateBlockW = dateLabelW + dateValueW;
  const dateX = PAGE_W - MARGIN - 10 - dateBlockW;
  page.drawText(dateLabel, { x: dateX, y: stripTop - 15, size: 7.5, font: bold, color: COLORS.muted });
  page.drawText(dateStr, { x: dateX + dateLabelW, y: stripTop - 15, size: 9.5, font, color: COLORS.text });

  y = stripTop - 22 - 22;

  // ---------- QR code (top-right, out of the way of the field list) ----------
  // Aggressively clean frontendUrl (remove spaces, quotes, and trailing slashes)
  const cleanFrontendUrl = frontendUrl.replace(/["'\s]/g, '').replace(/\/+$/, '');
  const qrUrl = `${cleanFrontendUrl}/receipt/${receiptNumber}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, color: { dark: '#0d2673' } });
  const qrImageBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
  const qrImage = await pdfDoc.embedPng(qrImageBytes);
  const qrSize = 66;
  const qrX = PAGE_W - MARGIN - qrSize;
  const qrY = y - qrSize + 10;
  page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
  const scanLabel = 'Scan to verify';
  const scanLabelW = font.widthOfTextAtSize(scanLabel, 6.5);
  page.drawText(scanLabel, { x: qrX + (qrSize - scanLabelW) / 2, y: qrY - 10, size: 6.5, font, color: COLORS.muted });

  // ---------- field list ----------
  const leftCol = MARGIN + 4;
  const valueCol = MARGIN + 118;
  const fieldMaxWidth = qrX - 12 - valueCol; // stop before QR code
  const lineSpacing = 20;

  const fields = [
    { label: 'Donor Name', value: donor.donorName },
    { label: 'Mobile', value: donor.mobile },
    { label: 'Address', value: `${donor.doorNumber || ''}, ${donor.street}` },
    { label: 'Payment Mode', value: donor.paymentMode },
    { label: 'Purpose', value: donor.purpose },
  ];

  fields.forEach((field) => {
    page.drawText(field.label, { x: leftCol, y, size: 9, font: bold, color: COLORS.muted });
    page.drawText(String(field.value), { x: valueCol, y, size: 9.5, font, color: COLORS.text });
    y -= lineSpacing;
  });

  y -= 4;
  hLine(y, MARGIN, PAGE_W - MARGIN);
  y -= 24;

  // ---------- donation amount, emphasized ----------
  page.drawText('DONATION AMOUNT', { x: leftCol, y, size: 8.5, font: bold, color: COLORS.muted });
  const amountText = `Rs. ${donor.amount}`;
  const amountSize = 20;
  const amountW = bold.widthOfTextAtSize(amountText, amountSize);
  page.drawText(amountText, {
    x: PAGE_W - MARGIN - amountW, y: y - 6, size: amountSize, font: bold, color: COLORS.accent,
  });
  y -= 34;

  hLine(y, MARGIN, PAGE_W - MARGIN);
  y -= 24;

  // ---------- collector ----------
  page.drawText('Collector', { x: leftCol, y, size: 9, font: bold, color: COLORS.muted });
  page.drawText(String(donor.collector), { x: valueCol, y, size: 9.5, font, color: COLORS.text });
  y -= 30;

  // ---------- association links ----------
  centerLink('Website: abdulkalamassociation.vercel.app', 'https://abdulkalamassociation.vercel.app', y, 8.5, font);
  y -= 13;
  centerLink('Instagram: @apjtrusttiruttani2024', 'https://www.instagram.com/apjtrusttiruttani2024?igsh=azZpdmp0b3Q1cHR1', y, 8.5, font);
  y -= 13;
  centerLink('Location: View on Google Maps', 'https://share.google/cQ4sLoKGJ58JCg5b2', y, 8.5, font);
  y -= 24;

  hLine(y, MARGIN, PAGE_W - MARGIN);
  y -= 34;

  // ---------- signature blocks ----------
  // Each underline is sized to its own name (min width so short names still look intentional),
  // and both blocks sit symmetrically around the page's vertical center line.
  const sigY = y;
  const sigPadding = 14; // breathing room on each side of the name, above the line
  const sigMinWidth = 90;

  const presidentName = settings?.presidentName || 'President Name';
  const secretaryName = settings?.secretaryName || 'Secretary Name';

  const presidentNameW = font.widthOfTextAtSize(presidentName, 9.5);
  const secretaryNameW = font.widthOfTextAtSize(secretaryName, 9.5);

  const presidentLineW = Math.max(sigMinWidth, presidentNameW + sigPadding);
  const secretaryLineW = Math.max(sigMinWidth, secretaryNameW + sigPadding);

  const leftBlockX = MARGIN + 6;
  const rightBlockX = PAGE_W - MARGIN - 6 - secretaryLineW;

  page.drawText(presidentName, { x: leftBlockX, y: sigY, size: 9.5, font, color: COLORS.text });
  hLine(sigY - 5, leftBlockX, leftBlockX + presidentLineW, COLORS.line, 0.5);
  page.drawText('President', { x: leftBlockX, y: sigY - 16, size: 8.5, font: bold, color: COLORS.muted });

  page.drawText(secretaryName, { x: rightBlockX, y: sigY, size: 9.5, font, color: COLORS.text });
  hLine(sigY - 5, rightBlockX, rightBlockX + secretaryLineW, COLORS.line, 0.5);
  page.drawText('Secretary', { x: rightBlockX, y: sigY - 16, size: 8.5, font: bold, color: COLORS.muted });

  // ---------- footer ----------
  centerText('Thank you for your generous contribution.', 42, 11, bold, COLORS.success);
  centerText('Created by MANOJ P | PMJ PROJECTS', 28, 7.5, font, COLORS.muted);

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};

module.exports = { generatePdfReceipt };