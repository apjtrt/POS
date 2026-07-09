const { generatePdfReceipt } = require('./services/pdfService');

const dummyDonor = {
  donorName: 'John Doe',
  mobile: '1234567890',
  street: 'Main Street',
  doorNumber: '42',
  amount: 1000,
  paymentMode: 'UPI',
  purpose: 'General',
  collector: 'Admin',
  createdAt: new Date().toISOString()
};

const dummySettings = {
  presidentName: 'Pres Name',
  secretaryName: 'Sec Name'
};

async function test() {
  console.log('Generating 5 PDFs...');
  for (let i = 0; i < 5; i++) {
    console.time(`pdfGeneration-${i}`);
    await generatePdfReceipt(dummyDonor, `REC-12${i}`, 'http://localhost:5173', dummySettings);
    console.timeEnd(`pdfGeneration-${i}`);
  }
}

test().catch(console.error);
