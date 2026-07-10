require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const prisma = require('./config/db');
const cron = require('node-cron');
const { performDatabaseBackup } = require('./services/backupService');
const app = express();
app.set('trust proxy', 1); // Trust first proxy (Render)
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173', 
    'https://apjbilling.vercel.app'
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window`
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Routes
const authRoutes = require('./routes/auth');
const donationRoutes = require('./routes/donations');
const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes = require('./routes/settings');
const verifyRoutes = require('./routes/verify');
const usersRoutes = require('./routes/users');
const loginLogsRoutes = require('./routes/loginLogs');
const expensesRoutes = require('./routes/expenses');
const transfersRoutes = require('./routes/transfers');

app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/login-logs', loginLogsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/transfers', transfersRoutes);
app.use('/receipt', verifyRoutes); // Public route for QR code verification

// Error Handling Middleware
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// --- CRASH PROTECTION SAFETY NETS ---
process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception caught! Keeping server alive:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});
// ------------------------------------

// Schedule Automated Database Backups
// Runs every 3 hours
cron.schedule('0 */3 * * *', () => {
  console.log('Running scheduled database backup...');
  performDatabaseBackup();
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Export prisma for usage in controllers/services
module.exports = { prisma, app, server };
