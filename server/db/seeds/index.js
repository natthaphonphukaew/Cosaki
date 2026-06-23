require('dotenv').config();
const { pool } = require('../../src/config/db');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Demo renter
    const { rows: [renter] } = await client.query(`
      INSERT INTO users (phone, display_name, role, kyc_status)
      VALUES ('+66812345678', 'Alex Rivera', 'renter', 'verified')
      ON CONFLICT (phone) DO NOTHING
      RETURNING id
    `);

    // Demo shop admin
    const { rows: [shopAdmin] } = await client.query(`
      INSERT INTO users (phone, display_name, role, kyc_status)
      VALUES ('+66898765432', 'Studio Hanjiku', 'shop_admin', 'verified')
      ON CONFLICT (phone) DO NOTHING
      RETURNING id
    `);

    if (shopAdmin) {
      const { rows: [shop] } = await client.query(`
        INSERT INTO shops (owner_id, shop_name, description, is_verified)
        VALUES ($1, 'Studio Hanjiku', 'Premium cosplay rental — Bangkok', true)
        RETURNING id
      `, [shopAdmin.id]);

      await client.query(`
        INSERT INTO items (shop_id, name, character, fandom, daily_rate, deposit_amount, sizes)
        VALUES
          ($1, 'Arcane: Jinx Professional Battle Armor', 'Jinx', 'Arcane', 29.00, 50.00, ARRAY['S','M','L']),
          ($1, 'Neon Guardian Wig', 'Original', 'Original', 12.00, 20.00, ARRAY['Free Size']),
          ($1, 'Cyberpunk Edge Runner Coat', 'David', 'Cyberpunk Edgerunners', 45.00, 80.00, ARRAY['M','L','XL'])
      `, [shop.id]);
    }

    await client.query('COMMIT');
    console.log('Seed complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
