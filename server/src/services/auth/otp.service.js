const db = require('../../config/db');

const OTP_EXPIRY_MINUTES = 10;

// A fixed code that always works — for closed feedback testing without an SMS
// provider. Active when DEMO_OTP is set, or by default in non-production.
// NEVER leave this enabled for a real public launch (set DEMO_OTP='' in prod).
const getDemoCode = () =>
  process.env.DEMO_OTP ?? (process.env.NODE_ENV !== 'production' ? '123456' : null);

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const saveOTP = async (phone, otp) => {
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  await db.query(
    `INSERT INTO otp_codes (phone, code, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (phone) DO UPDATE SET code = $2, expires_at = $3, attempts = 0`,
    [phone, otp, expiresAt]
  );
};

const verifyOTP = async (phone, otp) => {
  // Demo bypass for testers (see getDemoCode).
  const demo = getDemoCode();
  if (demo && otp === demo) {
    await db.query('DELETE FROM otp_codes WHERE phone = $1', [phone]).catch(() => {});
    return true;
  }

  const { rows } = await db.query(
    `SELECT * FROM otp_codes
     WHERE phone = $1 AND code = $2 AND expires_at > NOW() AND attempts < 5`,
    [phone, otp]
  );

  if (!rows.length) {
    // Increment attempt counter
    await db.query(
      'UPDATE otp_codes SET attempts = attempts + 1 WHERE phone = $1',
      [phone]
    );
    return false;
  }

  await db.query('DELETE FROM otp_codes WHERE phone = $1', [phone]);
  return true;
};

// In production replace with real SMS provider (e.g. Twilio / DTAC API)
const sendOTP = async (phone, otp) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV] OTP for ${phone}: ${otp}`);
    return;
  }
  // TODO: integrate SMS provider
};

module.exports = { generateOTP, saveOTP, verifyOTP, sendOTP, getDemoCode };
