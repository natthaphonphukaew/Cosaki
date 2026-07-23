const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fix() {
  try {
    const res = await pool.query("ALTER TABLE items ALTER COLUMN ship_lead_days SET DEFAULT 7");
    console.log('Updated default ship_lead_days to 7');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
fix();
