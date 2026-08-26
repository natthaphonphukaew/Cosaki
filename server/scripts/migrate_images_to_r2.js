// One-time migration: move base64 data-URL images that live in Postgres onto
// object storage (R2/S3) and replace them with short public URLs.
// Run:  node server/scripts/migrate_images_to_r2.js
// Requires storage env configured (S3_ENDPOINT, AWS_S3_BUCKET, keys, S3_PUBLIC_URL).
// Idempotent: values already starting with http are skipped. Back up the DB first.
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../src/config/db');
const s3 = require('../src/services/storage/s3.service');

const isData = (v) => typeof v === 'string' && v.startsWith('data:');

async function toUrl(dataUrl, folder) {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!m) return dataUrl;
  const buffer = Buffer.from(m[2], 'base64');
  const key = await s3.upload(buffer, m[1], folder);
  return s3.publicUrl(key);
}

// items.image_urls is a text[]; migrate only rows that contain a data URL, one at a time.
async function migrateItems() {
  const { rows } = await db.query(
    `SELECT id FROM items WHERE EXISTS (SELECT 1 FROM unnest(image_urls) x WHERE x LIKE 'data:%')`
  );
  let imgs = 0;
  for (const { id } of rows) {
    const { rows: [it] } = await db.query('SELECT image_urls FROM items WHERE id = $1', [id]);
    const out = [];
    for (const v of it.image_urls || []) {
      if (isData(v)) { out.push(await toUrl(v, 'products')); imgs++; } else out.push(v);
    }
    await db.query('UPDATE items SET image_urls = $1 WHERE id = $2', [out, id]);
  }
  console.log(`  items.image_urls: ${rows.length} rows, ${imgs} images -> R2`);
}

async function migrateTextColumn(table, col, folder) {
  const { rows } = await db.query(`SELECT id, ${col} AS v FROM ${table} WHERE ${col} LIKE 'data:%'`);
  for (const r of rows) {
    await db.query(`UPDATE ${table} SET ${col} = $1 WHERE id = $2`, [await toUrl(r.v, folder), r.id]);
  }
  console.log(`  ${table}.${col}: ${rows.length} images -> R2`);
}

(async () => {
  if (!s3.hasStorage()) {
    console.error('No object storage configured (S3_ENDPOINT / AWS_S3_BUCKET / keys). Aborting.');
    process.exit(1);
  }
  console.log('Migrating base64 images -> R2 ...');
  await migrateItems();
  await migrateTextColumn('users', 'avatar_url', 'avatars');
  await migrateTextColumn('shops', 'logo_url', 'shops');
  await migrateTextColumn('shops', 'cover_url', 'shops');
  await migrateTextColumn('shops', 'rules_image_url', 'shops');
  console.log('Done.');
  await db.pool.end();
  process.exit(0);
})().catch((e) => { console.error('Migration failed:', e.message); process.exit(1); });
