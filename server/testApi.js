const http = require('http');
const prisma = require('./config/db');

async function test() {
  const donor = await prisma.donor.findFirst();
  if (!donor) return console.log("No donor");
  
  const start = Date.now();
  http.get(`http://localhost:5000/api/donations/${donor.receiptNumber}/pdf`, (res) => { 
    console.log(`Response status: ${res.statusCode}`);
    console.log(`Time taken: ${Date.now() - start}ms`);
  }).on('error', (e) => {
    console.error(`Got error: ${e.message}`);
  });
}
test().catch(console.error);
