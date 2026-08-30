// Promote a user to the 'admin' role (Phase-0 back office access).
// Usage: node scripts/make_admin.js <phone>
//   Local: node --env-file=.env scripts/make_admin.js +66970865204
//   Prod:  DATABASE_URL="<public url>" node scripts/make_admin.js <phone>
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../src/config/db');

const phone = process.argv[2];
if (!phone) {
  console.error('usage: node scripts/make_admin.js <phone>');
  process.exit(1);
}

(async () => {
  const { rows } = await db.query(
    `UPDATE users SET role = 'admin' WHERE phone = $1 RETURNING id, display_name, phone, role`,
    [phone]
  );
  if (!rows.length) {
    console.error(`No user found with phone "${phone}". Check the exact stored format (e.g. +66...).`);
    process.exit(1);
  }
  console.log('Promoted to admin:', rows[0]);
  await db.pool.end();
})().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
