const db = require('../../config/db');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../../utils/jwt');
const { success, error } = require('../../utils/response');
const otpService = require('../../services/auth/otp.service');

// POST /auth/send-otp
const sendOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;
    const otp = otpService.generateOTP();
    await otpService.saveOTP(phone, otp);
    await otpService.sendOTP(phone, otp);
    // Surface the demo code so testers can log in without SMS (dev/demo only).
    const demoCode = otpService.getDemoCode();
    return success(res, { message: 'OTP sent', ...(demoCode ? { demoCode } : {}) }, 200);
  } catch (err) {
    next(err);
  }
};

// POST /auth/verify-otp
const verifyOTP = async (req, res, next) => {
  try {
    const { phone, code } = req.body;
    const valid = await otpService.verifyOTP(phone, code);
    if (!valid) return error(res, 'Invalid or expired OTP', 400);

    let { rows } = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);

    if (!rows.length) {
      // Give new accounts a friendly default name (e.g. "Cosplayer 5555").
      const defaultName = `Cosplayer ${phone.slice(-4)}`;
      const inserted = await db.query(
        `INSERT INTO users (phone, role, display_name) VALUES ($1, 'renter', $2) RETURNING *`,
        [phone, defaultName]
      );
      rows = inserted.rows;
    }

    const user = rows[0];
    const accessToken = signAccessToken(user.id, user.role);
    const refreshToken = signRefreshToken(user.id);

    return success(res, { accessToken, refreshToken, user: sanitize(user) }, 200);
  } catch (err) {
    next(err);
  }
};

// POST /auth/refresh
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return error(res, 'Refresh token required', 400);

    const payload = verifyRefreshToken(token);
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [payload.sub]);
    if (!rows.length) return error(res, 'User not found', 404);

    const user = rows[0];
    const accessToken = signAccessToken(user.id, user.role);
    return success(res, { accessToken });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return error(res, 'Invalid refresh token', 401);
    }
    next(err);
  }
};

// GET /auth/me
const getMe = async (req, res) => {
  return success(res, { user: sanitize(req.user) });
};

// OAuth callback handler (Google & Facebook share this)
const oauthCallback = (req, res) => {
  const accessToken = signAccessToken(req.user.id, req.user.role);
  const refreshToken = signRefreshToken(req.user.id);
  // Redirect to client with tokens in query (client stores them)
  res.redirect(
    `${process.env.CLIENT_URL}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`
  );
};

const sanitize = (user) => {
  const { password_hash, google_id, facebook_id, ...safe } = user;
  return safe;
};

module.exports = { sendOTP, verifyOTP, refreshToken, getMe, oauthCallback };
