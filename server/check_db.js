const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
  .then(res => {
    console.log('Tables in database:', res.rows.map(r => r.table_name));
    client.end();
  })
  .catch(err => {
    console.error('Error connecting to database:', err);
    client.end();
  });
