const passport = require('passport');
const { error } = require('../utils/response');

const authenticate = (req, res, next) =>
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (err) return next(err);
    if (!user) return error(res, 'Unauthorized', 401);
    req.user = user;
    next();
  })(req, res, next);

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return error(res, 'Forbidden', 403);
  }
  next();
};

const requireKYC = (req, res, next) => {
  if (req.user?.kyc_status !== 'verified') {
    return error(res, 'KYC verification required', 403);
  }
  next();
};

module.exports = { authenticate, requireRole, requireKYC };
