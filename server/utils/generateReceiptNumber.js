const prisma = require('../config/db');

const generateReceiptNumber = async (year) => {
  // year could be "2026"
  const lastDonation = await prisma.donor.findFirst({
    where: { receiptNumber: { startsWith: `${year}-` } },
    orderBy: { id: 'desc' }
  });

  if (!lastDonation) {
    return `${year}-0001`;
  }

  const lastNumber = parseInt(lastDonation.receiptNumber.split('-')[1], 10);
  const newNumber = (lastNumber + 1).toString().padStart(4, '0');
  return `${year}-${newNumber}`;
};

module.exports = generateReceiptNumber;
