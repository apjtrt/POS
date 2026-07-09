const prisma = require('../config/db');
const { uploadBackupToCloudinary } = require('./cloudinaryService');

const performDatabaseBackup = async () => {
  try {
    console.log('Starting automated database backup...');

    const users = await prisma.user.findMany();
    const donors = await prisma.donor.findMany();
    const expenses = await prisma.expense.findMany();
    const cashTransfers = await prisma.cashTransfer.findMany();
    const loginLogs = await prisma.loginLog.findMany();
    const settings = await prisma.settings.findMany();

    const backupData = {
      timestamp: new Date().toISOString(),
      users,
      donors,
      expenses,
      cashTransfers,
      loginLogs,
      settings
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    
    // Create a filename based on the current date and time
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `db-backup-${dateStr}.json`;

    console.log(`Uploading backup file: ${filename}`);
    const downloadUrl = await uploadBackupToCloudinary(jsonString, filename);

    if (downloadUrl) {
      console.log('Automated backup successful. URL:', downloadUrl);
    } else {
      console.log('Automated backup failed to upload.');
    }
  } catch (error) {
    console.error('Error during automated database backup:', error);
  }
};

module.exports = { performDatabaseBackup };
