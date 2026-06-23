const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const db = require('./db');

// ── JWT Strategy ──────────────────────────────────────────────────────────────
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    },
    async (payload, done) => {
      try {
        const { rows } = await db.query(
          'SELECT id, email, phone, role, kyc_status FROM users WHERE id = $1',
          [payload.sub]
        );
        if (!rows.length) return done(null, false);
        return done(null, rows[0]);
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

// ── Google OAuth Strategy ─────────────────────────────────────────────────────
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const { rows } = await db.query(
          'SELECT * FROM users WHERE email = $1 OR google_id = $2',
          [email, profile.id]
        );

        if (rows.length) {
          // Update google_id if user registered via phone first
          if (!rows[0].google_id) {
            await db.query('UPDATE users SET google_id = $1 WHERE id = $2', [
              profile.id,
              rows[0].id,
            ]);
          }
          return done(null, rows[0]);
        }

        const { rows: newUser } = await db.query(
          `INSERT INTO users (email, google_id, display_name, avatar_url, role)
           VALUES ($1, $2, $3, $4, 'renter') RETURNING *`,
          [
            email,
            profile.id,
            profile.displayName,
            profile.photos?.[0]?.value || null,
          ]
        );
        return done(null, newUser[0]);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// ── Facebook OAuth Strategy ───────────────────────────────────────────────────
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      profileFields: ['id', 'emails', 'displayName', 'photos'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || null;
        const { rows } = await db.query(
          'SELECT * FROM users WHERE facebook_id = $1 OR (email = $2 AND email IS NOT NULL)',
          [profile.id, email]
        );

        if (rows.length) {
          if (!rows[0].facebook_id) {
            await db.query('UPDATE users SET facebook_id = $1 WHERE id = $2', [
              profile.id,
              rows[0].id,
            ]);
          }
          return done(null, rows[0]);
        }

        const { rows: newUser } = await db.query(
          `INSERT INTO users (email, facebook_id, display_name, avatar_url, role)
           VALUES ($1, $2, $3, $4, 'renter') RETURNING *`,
          [
            email,
            profile.id,
            profile.displayName,
            profile.photos?.[0]?.value || null,
          ]
        );
        return done(null, newUser[0]);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

module.exports = passport;
