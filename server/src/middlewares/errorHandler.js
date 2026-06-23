const logger = require('../config/logger');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  logger.error(err);

  if (err.name === 'ValidationError') {
    return res.status(422).json({ success: false, message: err.message });
  }

  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'Resource already exists' });
  }

  if (err.code === '23503') {
    return res.status(400).json({ success: false, message: 'Invalid reference' });
  }

  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : err.message;

  res.status(statusCode).json({ success: false, message });
};

module.exports = errorHandler;
