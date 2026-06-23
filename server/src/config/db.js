const { Pool } = require('pg');

// Managed Postgres (e.g. Render, Heroku, Supabase) requires SSL over the public
// network. Enable it via DATABASE_SSL=true, or auto-detect common hosts.
const useSSL =
  process.env.DATABASE_SSL === 'true' ||
  /\.(render\.com|amazonaws\.com|supabase\.co|neon\.tech)/.test(process.env.DATABASE_URL || '');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL client error', err);
  process.exit(-1);
});

const query = (text, params) => pool.query(text, params);

const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
