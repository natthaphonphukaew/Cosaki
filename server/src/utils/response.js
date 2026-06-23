const success = (res, data, statusCode = 200, meta = {}) =>
  res.status(statusCode).json({ success: true, data, ...meta });

const error = (res, message, statusCode = 500, errors = null) =>
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
  });

module.exports = { success, error };
