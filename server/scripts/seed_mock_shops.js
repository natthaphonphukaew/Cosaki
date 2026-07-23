const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sizeChart = {
  S:  { bust: [80, 84], waist: [60, 64], hip: [86, 90] },
  M:  { bust: [84, 88], waist: [64, 68], hip: [90, 94] },
  L:  { bust: [88, 93], waist: [68, 74], hip: [94, 98] },
  XL: { bust: [94, 100], waist: [74, 80], hip: [98, 104] }
};

function getMeasurements(sizes) {
  let minBust = 999, maxBust = 0;
  let minWaist = 999, maxWaist = 0;
  let minHip = 999, maxHip = 0;
  
  sizes.forEach(sz => {
    const s = sizeChart[sz];
    if (s) {
      if (s.bust[0] < minBust) minBust = s.bust[0];
      if (s.bust[1] > maxBust) maxBust = s.bust[1];
      if (s.waist[0] < minWaist) minWaist = s.waist[0];
      if (s.waist[1] > maxWaist) maxWaist = s.waist[1];
      if (s.hip[0] < minHip) minHip = s.hip[0];
      if (s.hip[1] > maxHip) maxHip = s.hip[1];
    }
  });
  
  return {
    bust: `${minBust}-${maxBust}`,
    waist: `${minWaist}-${maxWaist}`,
    hip: `${minHip}-${maxHip}`
  };
}

async function seed() {
  console.log("Cleaning up old mock data...");
  await pool.query("DELETE FROM users WHERE display_name LIKE 'Mock Owner %'");

  const sizesList = [['S'], ['M'], ['L'], ['XL'], ['S', 'M'], ['M', 'L'], ['L', 'XL']];
  const units = ['cm', 'inch'];
  
  const baseItems = [
    { name: 'Ganyu', fandom: 'Genshin Impact', test_rate: 400, private_rate: 550, deposit: 180, shipping: 80 },
    { name: 'Hutao', fandom: 'Genshin Impact', test_rate: 300, private_rate: 450, deposit: 150, shipping: 80 },
    { name: 'Hanabi Sparkle', fandom: 'Honkai: Star Rail', test_rate: 300, private_rate: 450, deposit: 150, shipping: 80 },
    { name: 'Castorice', fandom: 'Honkai: Star Rail', test_rate: 450, private_rate: 600, deposit: 200, shipping: 100 },
    { name: 'Acheron', fandom: 'Honkai: Star Rail', test_rate: 450, private_rate: 600, deposit: 200, shipping: 100 }
  ];

  for (let i = 1; i <= 10; i++) {
    const shopSizes = sizesList[Math.floor(Math.random() * sizesList.length)];
    const unit = units[Math.floor(Math.random() * units.length)];
    
    // create user
    const { rows: users } = await pool.query(
      `INSERT INTO users (phone, display_name, kyc_status) VALUES ($1, $2, 'verified') RETURNING id`,
      [`08000000${i.toString().padStart(2, '0')}`, `Mock Owner ${i}`]
    );
    const userId = users[0].id;

    // create shop
    const { rows: shops } = await pool.query(
      `INSERT INTO shops (owner_id, shop_name) VALUES ($1, $2) RETURNING id`,
      [userId, `Shop ${String.fromCharCode(64 + i)}`] // Shop A, Shop B, etc.
    );
    const shopId = shops[0].id;

    const numItems = Math.floor(Math.random() * 6) + 5; // 5 to 10 items
    
    for (let j = 0; j < numItems; j++) {
      const base = baseItems[Math.floor(Math.random() * baseItems.length)];
      
      const meas = getMeasurements(shopSizes);
      let b = meas.bust, w = meas.waist, h = meas.hip;
      
      // If the shop uses inches, we convert the base (which is cm) to inches.
      if (unit === 'inch') {
         const toInch = str => str.split('-').map(v => Math.round(Number(v) / 2.54)).join('-');
         b = toInch(b); w = toInch(w); h = toInch(h);
      }
      
      const isExpress = Math.random() > 0.5;

      await pool.query(
        `INSERT INTO items (
          shop_id, name, fandom, sizes, daily_rate, test_rate, private_rate, deposit_amount, shipping_fee,
          bust, waist, hip, measurement_unit, image_urls, is_available, express_delivery
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          shopId, 
          base.name, 
          base.fandom, 
          shopSizes, 
          base.test_rate, // legacy fallback
          base.test_rate, 
          base.private_rate, 
          base.deposit, 
          base.shipping,
          b, w, h, unit, 
          ['https://placehold.co/400x500/e2e8f0/64748b?text=Costume'], 
          true,
          isExpress
        ]
      );
    }
  }
  console.log("Seeding complete! 10 shops created with proper size matching.");
  process.exit(0);
}

seed().catch(err => {
  console.error("Error seeding:", err);
  process.exit(1);
});
