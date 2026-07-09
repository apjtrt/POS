const prisma = require('./config/db');

async function test() {
  console.log('Testing DB connection...');
  console.time('DB Query');
  const donor = await prisma.donor.findFirst();
  console.timeEnd('DB Query');
  console.log(donor ? 'Found donor' : 'No donor found');
}

test().catch(console.error).finally(() => prisma.$disconnect());
