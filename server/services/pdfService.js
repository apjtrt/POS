require('regenerator-runtime/runtime');
const { PDFDocument, rgb, StandardFonts, PDFString, drawText } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

let cachedTamilFontBytes = null;
const cachedImageBytes = {};

const getImageBytes = (imgPath) => {
    if (!cachedImageBytes[imgPath]) {
        if (!fs.existsSync(imgPath)) return null;
        cachedImageBytes[imgPath] = Uint8Array.from(fs.readFileSync(imgPath));
    }
    return cachedImageBytes[imgPath];
};

// =============================================================================
//  DESIGN TOKENS
// =============================================================================
const COLORS = {
    primary: rgb(0.00, 0.20, 0.40),   // #003366 deep navy
    green: rgb(0.04, 0.54, 0.26),   // #0B8A42 verified green
    lightGray: rgb(0.96, 0.96, 0.96),   // #F5F5F5 card background
    darkGray: rgb(0.33, 0.33, 0.33),   // #555555 secondary text
    black: rgb(0.13, 0.13, 0.13),   // #222222 body text
    white: rgb(1.00, 1.00, 1.00),   // #FFFFFF
    divider: rgb(0.80, 0.84, 0.90),   // light blue-gray rule
    cardBorder: rgb(0.85, 0.88, 0.93),   // card outline
    link: rgb(0.00, 0.20, 0.40),   // hyperlinks
};

// =============================================================================
//  PAGE & LAYOUT CONSTANTS
// =============================================================================
const PAGE_W = 420;
const PAGE_H = 595;
const MARGIN = 26;

const SP = { xs: 4, sm: 8, md: 14, lg: 20, xl: 28 };

const FS = {
    hero: 13,
    title: 10,
    label: 8,
    value: 9,
    small: 7.5,
    badge: 7,
    receipt: 16,
};

const CARD = { padX: 10, padY: 8, borderW: 0.6 };

const QR = { size: 78, pad: 6, boxW: 90, boxH: 112 };

// =============================================================================
//  MAIN EXPORT
// =============================================================================
const generatePdfReceipt = async (donor, receiptNumber, frontendUrl, settings) => {

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let tamilFont;
    try {
        if (!cachedTamilFontBytes) {
            cachedTamilFontBytes = Uint8Array.from(fs.readFileSync(path.join(__dirname, '../fonts/tamil.ttf')));
        }
        tamilFont = await pdfDoc.embedFont(cachedTamilFontBytes);
    } catch (err) {
        console.error('Error loading Tamil font:', err);
        tamilFont = bold;
    }

    // Address enrichment (keep original business logic)
    let streetDisplay = donor.street || '';
    const lowerStreet = streetDisplay.toLowerCase().trim();
    if (
        lowerStreet === 'kambar street' ||
        lowerStreet === 'kumaran street' ||
        lowerStreet === 'maruthi street' ||
        lowerStreet === 'maruthi strret'
    ) {
        streetDisplay = `${streetDisplay}, Subramaniya Nagar, Tiruttani - 631209`;
    }
    const addressDisplay = donor.doorNumber
        ? `${donor.doorNumber}, ${streetDisplay}`
        : streetDisplay;

    // Date / time string
    const dateObj = new Date(donor.createdAt);
    const dateStr = dateObj.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata', hour12: true,
        day: '2-digit', month: 'short', year: 'numeric',
    });
    const timeStr = dateObj.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata', hour12: true,
        hour: '2-digit', minute: '2-digit',
    });

    const presidentName = settings?.presidentName || 'President Name';
    const secretaryName = settings?.secretaryName || 'Secretary Name';

    // =========================================================================
    //  HELPER FUNCTIONS
    // =========================================================================

    const drawCenteredText = (text, y, size, f, color = COLORS.black) => {
        const w = f.widthOfTextAtSize(text, size);
        page.drawText(text, { x: (PAGE_W - w) / 2, y, size, font: f, color });
        return w;
    };

    const drawDivider = (y, x1 = MARGIN, x2 = PAGE_W - MARGIN,
        color = COLORS.divider, thickness = 0.8) => {
        page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color });
    };

    const drawBlueDivider = (y, x1 = MARGIN, x2 = PAGE_W - MARGIN) => {
        page.drawLine({
            start: { x: x1, y }, end: { x: x2, y },
            thickness: 1.5, color: COLORS.primary,
        });
    };

    const drawCard = (x, y, w, h, fillColor = COLORS.lightGray,
        borderColor = COLORS.cardBorder) => {
        page.drawRectangle({
            x, y, width: w, height: h,
            color: fillColor,
            borderColor,
            borderWidth: CARD.borderW,
        });
    };

    const drawCenteredLink = (text, url, y, size = FS.value, f = font,
        color = COLORS.link) => {
        const w = f.widthOfTextAtSize(text, size);
        const x = (PAGE_W - w) / 2;
        page.drawText(text, { x, y, size, font: f, color });
        const link = pdfDoc.context.obj({
            Type: 'Annot', Subtype: 'Link',
            Rect: [x, y - 2, x + w, y + size],
            Border: [0, 0, 0],
            A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) },
        });
        page.node.addAnnot(pdfDoc.context.register(link));
    };

    const drawWatermark = async () => {
        try {
            const bgPath = path.join(__dirname, '../../client/public/images/logo1.jpeg');
            const bgBytes = getImageBytes(bgPath);
            if (bgBytes) {
                let bgImage;
                try {
                    bgImage = await pdfDoc.embedJpg(bgBytes);
                } catch (e) {
                    bgImage = await pdfDoc.embedPng(bgBytes);
                }
                const dims = bgImage.scale(1);
                const targetW = 200;
                const targetH = targetW / (dims.width / dims.height);
                page.drawImage(bgImage, {
                    x: (PAGE_W - targetW) / 2,
                    y: (PAGE_H - targetH) / 2 - 20,
                    width: targetW, height: targetH,
                    opacity: 0.07,
                });
            }
        } catch (err) {
            console.error('Error embedding watermark:', err);
        }
    };
    const drawWatermark2 = async () => {
        try {
            const bgPath = path.join(__dirname, '../../client/public/images/bg.jpg');
            const bgBytes = getImageBytes(bgPath);
            if (bgBytes) {
                let bgImage;
                try {
                    bgImage = await pdfDoc.embedJpg(bgBytes);
                } catch (e) {
                    bgImage = await pdfDoc.embedPng(bgBytes);
                }

                // Header space dimensions based on layout constants
                const headerTop = 581; // Inner border top
                const headerBottom = 485; // Blue divider position

                page.drawImage(bgImage, {
                    x: 15,
                    y: headerBottom + 1, // Just above the divider
                    width: PAGE_W - 30, // Span inside borders
                    height: headerTop - headerBottom - 1,
                    opacity: 0.15,
                });
            }
        } catch (err) {
            console.error('Error embedding watermark:', err);
        }
    };


    const drawLogo = async (centerY) => {
        try {
            const logoPath = path.join(__dirname, '../../client/public/images/logo1.png');
            const logoBytes = getImageBytes(logoPath);
            if (logoBytes) {
                const logoImage = await pdfDoc.embedPng(logoBytes);
                const logoSize = 46;
                page.drawImage(logoImage, {
                    x: 50, y: 520,
                    width: logoSize, height: logoSize,
                });
            }
        } catch (err) {
            console.error('Error embedding logo:', err);
        }
    };
    const drawLogo2 = async (centerY) => {
        try {
            const logoPath = path.join(__dirname, '../../client/public/images/logo.png');
            const logoBytes = getImageBytes(logoPath);
            if (logoBytes) {
                const logoImage = await pdfDoc.embedPng(logoBytes);
                const logoSize = 46;
                page.drawImage(logoImage, {
                    x: 325, y: 520,
                    width: logoSize, height: logoSize,
                });
            }
        } catch (err) {
            console.error('Error embedding logo:', err);
        }
    };
    const drawTamilImg = async (filename, align, yOffset, targetHeight) => {
        try {
            const pngPath = path.join(__dirname, `../../client/public/images/${filename}.png`);
            const jpgPath = path.join(__dirname, `../../client/public/images/${filename}.jpg`);
            const imgPath = fs.existsSync(pngPath) ? pngPath
                : fs.existsSync(jpgPath) ? jpgPath : null;
            if (!imgPath) return;
            const imgBytes = getImageBytes(imgPath);
            const img = imgPath.endsWith('.png')
                ? await pdfDoc.embedPng(imgBytes)
                : await pdfDoc.embedJpg(imgBytes);
            const dims = img.scale(1);
            const targetW = targetHeight * (dims.width / dims.height);
            let xPos = MARGIN;
            if (align === 'center') xPos = (PAGE_W - targetW) / 2;
            if (align === 'right') xPos = PAGE_W - MARGIN - targetW;
            page.drawImage(img, { x: xPos, y: yOffset - targetHeight, width: targetW, height: targetHeight });
        } catch (e) {
            console.error(`Error loading ${filename}:`, e);
        }
    };

    const drawSignature = (name, role, x, y, align = 'left') => {
        const nameW = bold.widthOfTextAtSize(name, FS.value);
        const roleW = font.widthOfTextAtSize(role, FS.small);
        const lineW = Math.max(90, nameW + 16);
        const lineX = align === 'right' ? x - lineW : x;
        const nameX = align === 'right' ? x - nameW : x;
        const roleX = align === 'right' ? x - roleW : x;
        page.drawLine({
            start: { x: lineX, y: y + SP.lg },
            end: { x: lineX + lineW, y: y + SP.lg },
            thickness: 0.8, color: COLORS.primary,
        });
        page.drawText(name, { x: nameX, y: y + SP.sm, size: FS.value, font: bold, color: COLORS.black });
        page.drawText(role, { x: roleX, y, size: FS.small, font, color: COLORS.darkGray });
    };

    const drawHeader = async () => {
        let y = PAGE_H - MARGIN - 10;
        const headerCenterY = y - 22;
        await drawLogo(headerCenterY);
        await drawLogo2(headerCenterY);
        drawCenteredText('DR. A.P.J. ABDUL KALAM', y, FS.hero, bold, COLORS.primary);
        y -= SP.md + 2;
        drawCenteredText('YOUTH WELFARE ASSOCIATION', y, FS.hero, bold, COLORS.primary);
        y -= SP.md;
        drawCenteredText('Affiliated to Nehru Yuva Kendra Sangathan (NYKS)', y, FS.small, font, COLORS.darkGray);
        y -= SP.sm + 2;
        drawCenteredText('Registration No. 313/2024', y, FS.small, font, COLORS.darkGray);
        y -= SP.md;

        const tamilRowY = y;
        await drawTamilImg('tamil-left', 'left', tamilRowY + 10, 22);
        await drawTamilImg('tamil-center', 'center', tamilRowY + 2, 10);
        await drawTamilImg('tamil-right', 'right', tamilRowY + 10, 22);
        y -= SP.lg;

        drawBlueDivider(y);
        y -= SP.md;

        drawCenteredText('DONATION RECEIPT', y - 5, FS.receipt, bold, COLORS.primary);
        y -= SP.sm;

        const titleW = bold.widthOfTextAtSize('DONATION RECEIPT', FS.receipt);
        const titleX = (PAGE_W - titleW) / 2;
        page.drawLine({
            start: { x: titleX, y }, end: { x: titleX + titleW, y },
            thickness: 1.2, color: COLORS.primary,
        });
        y -= SP.lg;
        return y;
    };

    const drawFooter = (startY) => {
        let y = startY;
        drawBlueDivider(y);
        y -= SP.md;

        drawCenteredText('Thank you for your generous contribution.', y, 9.5, bold, COLORS.green);
        y -= SP.md;
        drawCenteredText('This receipt is computer generated and valid without signature.', y, FS.small, font, COLORS.darkGray);
        y -= SP.md + 2;

        drawCenteredLink('Website: abdulkalamassociation.vercel.app',
            'https://abdulkalamassociation.vercel.app', y, FS.label, font, COLORS.link);
        y -= SP.sm + 2;
        drawCenteredLink('Instagram: @apjtrusttiruttani2024',
            'https://www.instagram.com/apjtrusttiruttani2024?igsh=azZpdmp0b3Q1cHR1',
            y, FS.label, font, COLORS.link);
        y -= SP.sm + 2;
        drawCenteredLink('Location: View on Google Maps',
            'https://share.google/cQ4sLoKGJ58JCg5b2', y, FS.label, font, COLORS.link);
        y -= SP.sm + 4;

        drawCenteredText('Created by MANOJ P|PMJ PROJECTS', y, FS.small, font, COLORS.darkGray);
        return y;
    };

    // =========================================================================
    //  PAGE BORDERS
    // =========================================================================
    page.drawRectangle({
        x: 10, y: 10, width: PAGE_W - 20, height: PAGE_H - 20,
        borderColor: COLORS.primary, borderWidth: 1.2,
    });
    page.drawRectangle({
        x: 14, y: 14, width: PAGE_W - 28, height: PAGE_H - 28,
        borderColor: COLORS.divider, borderWidth: 0.5,
    });

    // =========================================================================
    //  WATERMARK
    // =========================================================================
    await drawWatermark();
    await drawWatermark2();

    // =========================================================================
    //  HEADER
    // =========================================================================
    let y = await drawHeader();

    // =========================================================================
    //  QR CODE BOX  (top-right)
    // =========================================================================


    // =========================================================================
    //  RECEIPT INFO CARD
    // =========================================================================
    const infoCardH = 30;
    const infoCardY = y - infoCardH;
    drawCard(MARGIN, infoCardY, PAGE_W - 2 * MARGIN, infoCardH);

    const recLabel = 'RECEIPT NO: ';
    const recLabelW = bold.widthOfTextAtSize(recLabel, FS.label);
    page.drawText(recLabel, {
        x: MARGIN + CARD.padX, y: infoCardY + infoCardH / 2 - 3,
        size: FS.label, font: bold, color: COLORS.darkGray,
    });
    page.drawText(String(receiptNumber), {
        x: MARGIN + CARD.padX + recLabelW, y: infoCardY + infoCardH / 2 - 3,
        size: FS.label + 1, font: bold, color: COLORS.primary,
    });

    const dateLabel = 'DATE: ';
    const dateLabelW = bold.widthOfTextAtSize(dateLabel, FS.label);
    const dateValW = font.widthOfTextAtSize(dateStr, FS.label);
    const timeLabel = '  TIME: ';
    const timeLabelW = bold.widthOfTextAtSize(timeLabel, FS.label);
    const timeValW = font.widthOfTextAtSize(timeStr, FS.label);
    const infoRightX = PAGE_W - MARGIN - CARD.padX - timeLabelW - timeValW;

    page.drawText(dateLabel, {
        x: infoRightX - dateLabelW - dateValW, y: infoCardY + infoCardH / 2 - 3,
        size: FS.label, font: bold, color: COLORS.darkGray,
    });
    page.drawText(dateStr, {
        x: infoRightX - dateValW, y: infoCardY + infoCardH / 2 - 3,
        size: FS.label, font, color: COLORS.black,
    });
    page.drawText(timeLabel, {
        x: infoRightX, y: infoCardY + infoCardH / 2 - 3,
        size: FS.label, font: bold, color: COLORS.darkGray,
    });
    page.drawText(timeStr, {
        x: infoRightX + timeLabelW, y: infoCardY + infoCardH / 2 - 3,
        size: FS.label, font, color: COLORS.black,
    });

    y = infoCardY - SP.md;

    // =========================================================================
    //  DONOR DETAILS CARD
    // =========================================================================
    const donorFields = [
        { label: 'Donor Name', value: donor.donorName },
        { label: 'Mobile', value: donor.mobile },
        { label: 'Address', value: addressDisplay },
    ];
    const donorCardH = SP.md + donorFields.length * 16 + SP.sm;
    const donorCardY = y - donorCardH;

    drawCard(MARGIN, donorCardY, PAGE_W - 2 * MARGIN, donorCardH);

    page.drawRectangle({
        x: MARGIN, y: donorCardY + donorCardH - 16,
        width: PAGE_W - 2 * MARGIN, height: 16,
        color: COLORS.primary,
    });
    const donorTitleW = bold.widthOfTextAtSize('DONOR DETAILS', FS.label);
    page.drawText('DONOR DETAILS', {
        x: MARGIN + (PAGE_W - 2 * MARGIN - donorTitleW) / 2,
        y: donorCardY + donorCardH - 12,
        size: FS.label, font: bold, color: COLORS.white,
    });

    const labelCol = MARGIN + CARD.padX;
    const valueCol = MARGIN + 90;
    let fieldY = donorCardY + donorCardH - 16 - SP.sm - 8;

    donorFields.forEach(({ label, value }) => {
        page.drawText(`${label}:`, {
            x: labelCol, y: fieldY,
            size: FS.label, font: bold, color: COLORS.darkGray,
        });
        page.drawText(String(value ?? ''), {
            x: valueCol, y: fieldY,
            size: FS.value, font, color: COLORS.black,
            maxWidth: PAGE_W - MARGIN - valueCol - SP.sm,
        });
        fieldY -= 16;
    });

    y = donorCardY - SP.md;

    // =========================================================================
    //  DONATION DETAILS CARD
    // =========================================================================
    const donationFields = [
        { label: 'Payment Mode', value: donor.paymentMode },
        { label: 'Purpose', value: donor.purpose },
        { label: 'Collector', value: donor.collector },
    ];
    const donationCardH = SP.md + (donationFields.length + 1) * 16 + SP.sm + 10;
    const donationCardY = y - donationCardH;

    drawCard(MARGIN, donationCardY, PAGE_W - 2 * MARGIN, donationCardH);

    page.drawRectangle({
        x: MARGIN, y: donationCardY + donationCardH - 16,
        width: PAGE_W - 2 * MARGIN, height: 16,
        color: COLORS.primary,
    });
    const donationTitleW = bold.widthOfTextAtSize('DONATION DETAILS', FS.label);
    page.drawText('DONATION DETAILS', {
        x: MARGIN + (PAGE_W - 2 * MARGIN - donationTitleW) / 2,
        y: donationCardY + donationCardH - 12,
        size: FS.label, font: bold, color: COLORS.white,
    });

    let donFieldY = donationCardY + donationCardH - 16 - SP.sm - 8;

    // Donation amount — green bold large
    const amountText = `Rs. ${donor.amount}`;
    const amountSize = 13;
    page.drawText('Donation Amount:', {
        x: labelCol, y: donFieldY,
        size: FS.label, font: bold, color: COLORS.darkGray,
    });
    page.drawText(amountText, {
        x: valueCol, y: donFieldY,
        size: amountSize, font: bold, color: COLORS.green,
    });
    donFieldY -= 20;

    donationFields.forEach(({ label, value }) => {
        page.drawText(`${label}:`, {
            x: labelCol, y: donFieldY,
            size: FS.label, font: bold, color: COLORS.darkGray,
        });
        page.drawText(String(value ?? ''), {
            x: valueCol, y: donFieldY,
            size: FS.value, font, color: COLORS.black,
            maxWidth: PAGE_W - MARGIN - valueCol - SP.sm,
        });
        donFieldY -= 16;
    });

    y = donationCardY - SP.md;

    // =========================================================================
    //  QUOTE
    // =========================================================================
    drawDivider(y);
    y -= SP.md;
    drawCenteredText(
        '"You have to dream before your dreams can come true."',
        y, FS.small, font, COLORS.darkGray,
    );
    y -= SP.sm + 2;
    drawCenteredText('- Dr. A.P.J. Abdul Kalam', y, FS.small, font, COLORS.darkGray);
    y -= SP.md;
    drawDivider(y);
    y -= SP.xl;

    // =========================================================================
    //  SIGNATURES
    // =========================================================================
    drawSignature(presidentName, 'President', MARGIN + 6, y - 1, 'left');
    drawCenteredText('+91 86087 70533                                                                                                                     +91 99941 87100', y - 9, FS.small, font, COLORS.darkGray, 'left');
    drawSignature(secretaryName, 'Secretary', PAGE_W - MARGIN - 6, y, 'right');

    y -= SP.xl + SP.md;

    // =========================================================================
    //  FOOTER
    // =========================================================================
    drawFooter(y);

    // =========================================================================
    //  SAVE & RETURN
    // =========================================================================
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
};

module.exports = { generatePdfReceipt };
