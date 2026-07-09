const { generatePdfReceipt } = require('./services/pdfService');

async function test() {
  console.time('Generate PDF');
  
  const mockDonor = {
    donorName: 'John Doe',
    mobile: '1234567890',
    street: 'Main Street',
    doorNumber: '42',
    amount: 500,
    paymentMode: 'Cash',
    purpose: 'Vinayagar Chadurthi 2026',
    collector: 'admin',
    createdAt: new Date(),
  };

  const settings = {
    presidentName: 'Test Pres',
    secretaryName: 'Test Sec',
  };

  try {
    await generatePdfReceipt(mockDonor, '2026-0001', 'http://localhost:5173', settings);
    console.timeEnd('Generate PDF');
  } catch (error) {
    console.error(error);
  }
}

test();
