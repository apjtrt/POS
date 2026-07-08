require('regenerator-runtime/runtime');
const { PDFDocument, rgb, StandardFonts, PDFString } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
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
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let tamilFont;
  try {
    const tamilFontBytes = fs.readFileSync(path.join(__dirname, '../fonts/tamil.ttf'));
    tamilFont = await pdfDoc.embedFont(tamilFontBytes);
  } catch (err) {
    console.error('Error loading Tamil font:', err);
    tamilFont = bold; // fallback to bold (though it will error out on Tamil characters, it's better than crashing here)
  }

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
        opacity: 0.15,
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
  y -= 16;

  // ---------- Custom Header Images ----------
  // We will load images for the Tamil text to ensure perfect rendering.
  const colY = y;

  const drawTamilImg = async (filename, align, yOffset, targetHeight) => {
    try {
      const pngPath = path.join(__dirname, `../../client/public/images/${filename}.png`);
      const jpgPath = path.join(__dirname, `../../client/public/images/${filename}.jpg`);
      const imgPath = fs.existsSync(pngPath) ? pngPath : (fs.existsSync(jpgPath) ? jpgPath : null);

      if (imgPath) {
        const imgBytes = fs.readFileSync(imgPath);
        const img = imgPath.endsWith('.png') ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);
        const dims = img.scale(1);
        const targetW = targetHeight * (dims.width / dims.height);

        let xPos = MARGIN;
        if (align === 'center') xPos = (PAGE_W - targetW) / 2;
        if (align === 'right') xPos = PAGE_W - MARGIN - targetW;

        page.drawImage(img, { x: xPos, y: yOffset - targetHeight, width: targetW, height: targetHeight });
      }
    } catch (e) {
      console.error(`Error loading ${filename}:`, e);
    }
  };

  // Adjust target heights based on the image proportions (2 lines vs 1 line)
  await drawTamilImg('tamil-left', 'left', colY + 10, 22);
  await drawTamilImg('tamil-center', 'center', colY + 2, 10);
  await drawTamilImg('tamil-right', 'right', colY + 10, 22);

  y -= 24;

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

  // ---------- field list ----------
  const leftCol = MARGIN + 4;
  const valueCol = MARGIN + 118;
  const fieldMaxWidth = PAGE_W - MARGIN - valueCol; // use full width since QR code is removed
  const lineSpacing = 20;

  let streetDisplay = donor.street || '';
  const lowerStreet = streetDisplay.toLowerCase().trim();
  if (
    lowerStreet === 'kambar street' ||
    lowerStreet === 'kumaran street' ||
    lowerStreet === 'maruthi street' ||
    lowerStreet === 'maruthi strret' // handling common typo based on prompt
  ) {
    streetDisplay = `${streetDisplay}, Subramaniya Nagar, Tiruttani - 631209`;
  }

  const addressDisplay = donor.doorNumber ? `${donor.doorNumber}, ${streetDisplay}` : streetDisplay;

  const fields = [
    { label: 'Donor Name', value: donor.donorName },
    { label: 'Mobile', value: donor.mobile },
    { label: 'Address', value: addressDisplay },
    { label: 'Payment Mode', value: donor.paymentMode },
    { label: 'Purpose', value: donor.purpose },
  ];

  fields.forEach((field) => {
    page.drawText(field.label, { x: leftCol, y, size: 9, font: bold, color: COLORS.muted });
    page.drawText(String(field.value), { x: valueCol, y, size: 9.5, font, color: COLORS.text });
    y -= lineSpacing;
  });

  y -= 4;
  // ---------- collector ----------
  page.drawText('Collector', { x: leftCol, y, size: 9, font: bold, color: COLORS.muted });
  page.drawText(String(donor.collector), { x: valueCol, y, size: 9.5, font, color: COLORS.text });
  y -= 30;

  hLine(y, MARGIN, PAGE_W - MARGIN);
  y -= 24;

  // ---------- donation amount, emphasized ----------
  page.drawText('DONATION AMOUNT', { x: leftCol, y, size: 15, font: bold, color: COLORS.text });
  const amountText = `Rs. ${donor.amount}`;
  const amountSize = 15;
  const amountW = bold.widthOfTextAtSize(amountText, amountSize);
  page.drawText(amountText, {
    x: PAGE_W - MARGIN - amountW, y: y - 0, size: amountSize, font: bold, color: COLORS.accent,
  });
  y -= 20;

  hLine(y, MARGIN, PAGE_W - MARGIN);
  y -= 34;
  // ---------- association links ----------

  centerLink('Website: abdulkalamassociation.vercel.app', 'https://abdulkalamassociation.vercel.app', y, 8.5, font);
  y -= 13;
  centerLink('Instagram: @apjtrusttiruttani2024', 'https://www.instagram.com/apjtrusttiruttani2024?igsh=azZpdmp0b3Q1cHR1', y, 8.5, font);
  y -= 13;
  centerLink('Location: View on Google Maps', 'https://share.google/cQ4sLoKGJ58JCg5b2', y, 8.5, font);
  y -= 18;
  centerText('CONTACT NUMBERS:+91 86087 70533 +91 99941 87100', y, 8.5, bold, COLORS.text);
  y -= 12;

  hLine(y, MARGIN, PAGE_W - MARGIN);
  y -= 40; // reduced from 40 to give more room at the bottom

  // ---------- signature blocks ----------
  // Each underline is sized to its own name (min width so short names still look intentional),
  // and both blocks sit symmetrically around the page's vertical center line.
  const sigY = y;
  const sigPadding = 14; // breathing room on each side of the name, above the line
  const sigMinWidth = 90;

  const presidentName = settings?.presidentName || 'President Name';
  const secretaryName = settings?.secretaryName || 'Secretary Name';

  // Add Thirukkural quote in the center space between signatures (split into 2 lines to fit)
  centerText('"Dream is not that which you see while sleeping', sigY + 5, 8.5, font, COLORS.muted);
  centerText('it is something that does not let you sleep."', sigY - 5, 8.5, font, COLORS.muted);
  centerText('- Dr. A.P.J. Abdul Kalam', sigY - 15, 7.5, font, COLORS.muted);

  const presidentNameW = font.widthOfTextAtSize(presidentName, 9.5);
  const secretaryNameW = font.widthOfTextAtSize(secretaryName, 9.5);

  const presidentLineW = Math.max(sigMinWidth, presidentNameW + sigPadding);
  const secretaryLineW = Math.max(sigMinWidth, secretaryNameW + sigPadding);

  const leftBlockX = MARGIN + 6;
  const rightBlockW = Math.max(secretaryNameW, bold.widthOfTextAtSize('Secretary', 8.5));
  const rightBlockX = PAGE_W - MARGIN - rightBlockW;

  page.drawText(presidentName, { x: leftBlockX, y: sigY, size: 9.5, font: bold, color: COLORS.text });

  page.drawText('President', { x: 35, y: sigY - 16, size: 8.5, font, color: COLORS.muted });

  page.drawText(secretaryName, { x: rightBlockX, y: sigY, size: 9.5, font: bold, color: COLORS.text });
  page.drawText('Secretary', { x: 340, y: sigY - 16, size: 8.5, font, color: COLORS.muted });

  // ---------- footer ----------
  // Push footer slightly lower so it doesn't overlap with dynamic content when space is tight, but not too low to hit the border
  centerText('Thank you for your generous contribution.', 34, 11, bold, COLORS.success);
  centerText('Created by MANOJ P | +919345632035', 20, 7.5, font, COLORS.muted);

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};

module.exports = { generatePdfReceipt };