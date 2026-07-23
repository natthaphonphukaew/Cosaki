const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/cosaki'
});

async function main() {
  await client.connect();
  try {
    console.log('Inserting NEWCOSAKI30...');
    
    // Add max_discount if not exists
    await client.query(`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_discount NUMERIC(10,2)`);
    
    await client.query(`
      INSERT INTO coupons (code, scope, discount_type, discount_value, min_spend, max_discount)
      VALUES ('NEWCOSAKI30', 'cosaki', 'percent', 30, 0, 100)
      ON CONFLICT (code) DO UPDATE SET discount_value = 30, max_discount = 100;
    `);
    
    console.log('Done!');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
