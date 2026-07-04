require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const prisma = require('./config/db');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

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

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Export prisma for usage in controllers/services
module.exports = { prisma, app };
