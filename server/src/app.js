require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const passport = require('./config/passport');
const errorHandler = require('./middlewares/errorHandler');
const logger = require('./config/logger');

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
// helmet's default CSP can block the bundled SPA assets; relax it (this is a
// test deployment, not a hardened production launch).
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: process.env.CLIENT_URL || true, // same-origin in the bundled deploy
    credentials: true,
  })
);
// Rate limiting only in production, and only when not explicitly disabled
// (testers share IPs, so we keep it off for the feedback build).
if (process.env.NODE_ENV === 'production' && process.env.DISABLE_RATE_LIMIT !== 'true') {
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 min
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );
}

// ── Parsers ───────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '6mb' }));            // room for data-URL images
app.use(express.urlencoded({ extended: true, limit: '6mb' }));

// ── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Auth ──────────────────────────────────────────────────────────────────────
app.use(passport.initialize());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/v1', require('./routes/v1'));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));

// ── Serve the built frontend (single-service deploy) ───────────────────────────
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback: any non-API GET returns index.html so client routing works.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ── 404 (API only) ─────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => logger.info(`Cosaki server running on port ${PORT}`));
}

module.exports = app;
