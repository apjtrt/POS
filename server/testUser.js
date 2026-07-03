const prisma = require('./config/db');
prisma.user.findFirst().then(console.log).finally(() => prisma.$disconnect());
