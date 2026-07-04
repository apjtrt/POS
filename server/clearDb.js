require('dotenv').config();
const prisma = require('./config/db');

async function clearDatabase() {
  console.log('⚠️  WARNING: This will delete ALL data from the database except the Admin user and Settings.');
  console.log('Starting database cleanup...');

  try {
    // 1. Delete all transactional data
    console.log('Deleting all Donors...');
    await prisma.donor.deleteMany({});
    
    console.log('Deleting all Expenses...');
    await prisma.expense.deleteMany({});
    
    console.log('Deleting all Cash Transfers...');
    await prisma.cashTransfer.deleteMany({});
    
    console.log('Deleting all Login Logs...');
    await prisma.loginLog.deleteMany({});

    // 2. Delete all non-admin users
    console.log('Deleting all Cashiers and Collectors...');
    await prisma.user.deleteMany({
      where: {
        role: {
          not: 'ADMIN'
        }
      }
    });

    console.log('✅ Database successfully cleared!');
    console.log('Remaining data:');
    
    const remainingAdmins = await prisma.user.findMany();
    console.log(`- ${remainingAdmins.length} Admin User(s)`);
    
    const remainingSettings = await prisma.settings.count();
    console.log(`- ${remainingSettings} Settings configuration(s)`);

  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabase();
