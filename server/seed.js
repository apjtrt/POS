const bcrypt = require('bcrypt');
const prisma = require('./config/db');

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      role: 'ADMIN',
      name: 'Super Admin',
    },
    create: {
      username: 'admin',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'ADMIN',
    },
  });

  console.log('Admin user seeded:', admin.username);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
